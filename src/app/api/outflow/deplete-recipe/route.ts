import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser, createErrorResponse } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return createErrorResponse('Unauthorized. Invalid or missing token.', 401);
  }

  try {
    const { recipeId, storeId, quantity, remarks } = await req.json();

    if (!recipeId || !storeId || quantity === undefined) {
      return createErrorResponse('Recipe ID, Store ID, and depletion quantity are required.', 400);
    }
    if (Number(quantity) <= 0) {
      return createErrorResponse('Depletion quantity must be greater than 0.', 400);
    }

    const recipe = await prisma.recipe.findFirst({
      where: { id: recipeId, organizationId: user.organizationId },
      include: { ingredients: { include: { item: true } } }
    });
    if (!recipe) {
      return createErrorResponse('Recipe not found.', 404);
    }

    const store = await prisma.store.findFirst({
      where: { id: storeId, propertyId: user.propertyId }
    });
    if (!store) {
      return createErrorResponse('Store not found or does not belong to this property.', 404);
    }

    const depletionResult = await prisma.$transaction(async (tx) => {
      const logs = [];

      for (const ingredient of recipe.ingredients) {
        const totalDepletionQty = ingredient.quantity * Number(quantity);

        let balance = await tx.stockBalance.findFirst({
          where: { storeId, itemId: ingredient.itemId }
        });

        if (!balance) {
          balance = await tx.stockBalance.create({
            data: {
              storeId,
              itemId: ingredient.itemId,
              quantity: 0.0,
              minStockLevel: 0.0,
              avgCostPrice: 0.0
            }
          });
        }

        const updatedBalance = await tx.stockBalance.update({
          where: { id: balance.id },
          data: {
            quantity: {
              decrement: totalDepletionQty
            }
          }
        });

        await tx.stockTransaction.create({
          data: {
            itemId: ingredient.itemId,
            storeId,
            type: 'RECIPE_DEPLETION',
            quantity: -totalDepletionQty,
            costPrice: balance.avgCostPrice,
            referenceId: recipe.id,
            remarks: remarks || `Recipe Sale: ${recipe.name} (Qty x${quantity})`,
            recordedById: user.userId
          }
        });

        logs.push({
          itemId: ingredient.itemId,
          itemName: ingredient.item.name,
          depletedQty: totalDepletionQty,
          remainingQty: updatedBalance.quantity,
          avgCostPrice: balance.avgCostPrice
        });
      }

      return logs;
    });

    return NextResponse.json({ message: 'Recipe depletion logged successfully.', transactions: depletionResult });
  } catch (error) {
    console.error('Recipe Depletion Error:', error);
    return createErrorResponse('Failed to process recipe depletion.', 500);
  }
}
