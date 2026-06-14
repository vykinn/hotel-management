import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser, createErrorResponse } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const user = getAuthenticatedUser(req);
  if (!user || !user.propertyId) {
    return createErrorResponse('Unauthorized. Invalid or missing token.', 401);
  }

  try {
    const { kotNumber, items, roomNumber, storeId } = await req.json();

    if (!kotNumber) return createErrorResponse('KOT number is required.', 400);
    if (!items || !Array.isArray(items) || items.length === 0) {
      return createErrorResponse('KOT items array is required.', 400);
    }

    const referenceId = `KOT-${kotNumber}`;

    const existing = await prisma.stockTransaction.findFirst({
      where: { referenceId, store: { propertyId: user.propertyId } }
    });
    if (existing) {
      return createErrorResponse(`KOT ${kotNumber} has already been processed.`, 409);
    }

    let targetStoreId = storeId;
    if (!targetStoreId) {
      const kitchenStore = await prisma.store.findFirst({
        where: {
          propertyId: user.propertyId,
          name: { contains: 'Kitchen' }
        }
      });
      const fallbackStore = await prisma.store.findFirst({ where: { propertyId: user.propertyId } });
      const storeObj = kitchenStore || fallbackStore;
      if (!storeObj) {
        return createErrorResponse('No stores available in this property to route KOT.', 404);
      }
      targetStoreId = storeObj.id;
    }

    const kotResult = await prisma.$transaction(async (tx) => {
      const logs = [];

      for (const kItem of items) {
        if (!kItem.recipeCode || kItem.quantity === undefined || Number(kItem.quantity) <= 0) {
          throw new Error('400:Each KOT item must have a valid recipeCode and positive quantity.');
        }

        const recipe = await tx.recipe.findFirst({
          where: { organizationId: user.organizationId, code: kItem.recipeCode },
          include: { ingredients: { include: { item: true } } }
        });

        if (!recipe) {
          throw new Error(`404:Recipe with code ${kItem.recipeCode} not found.`);
        }

        for (const ingredient of recipe.ingredients) {
          const totalDepletionQty = ingredient.quantity * Number(kItem.quantity);

          let balance = await tx.stockBalance.findFirst({
            where: { storeId: targetStoreId!, itemId: ingredient.itemId }
          });

          if (!balance) {
            balance = await tx.stockBalance.create({
              data: {
                storeId: targetStoreId!,
                itemId: ingredient.itemId,
                quantity: 0.0,
                minStockLevel: 0.0,
                avgCostPrice: 0.0
              }
            });
          }

          const updatedBalance = await tx.stockBalance.update({
            where: { id: balance.id },
            data: { quantity: { decrement: totalDepletionQty } }
          });

          await tx.stockTransaction.create({
            data: {
              itemId: ingredient.itemId,
              storeId: targetStoreId!,
              type: 'RECIPE_DEPLETION',
              quantity: -totalDepletionQty,
              costPrice: balance.avgCostPrice,
              referenceId,
              remarks: `Automated KOT ${kotNumber} depletion${roomNumber ? ` for Room ${roomNumber}` : ''}`,
              recordedById: user.userId
            }
          });

          logs.push({
            itemName: ingredient.item.name,
            depletedQty: totalDepletionQty,
            remainingQty: updatedBalance.quantity,
            avgCostPrice: balance.avgCostPrice
          });
        }
      }

      return logs;
    });

    return NextResponse.json({ message: `Automated KOT ${kotNumber} processed successfully.`, transactions: kotResult });
  } catch (error: any) {
    console.error('KOT Automation Error:', error);
    const msg = error.message || '';
    if (msg.startsWith('400:')) {
      return createErrorResponse(msg.substring(4), 400);
    }
    if (msg.startsWith('404:')) {
      return createErrorResponse(msg.substring(4), 404);
    }
    return createErrorResponse('Failed to process automated KOT depletion.', 500);
  }
}
