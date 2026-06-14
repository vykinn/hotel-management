import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser, createErrorResponse } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return createErrorResponse('Unauthorized. Invalid or missing token.', 401);
  }

  try {
    const { cleanType, storeId, remarks } = await req.json();

    if (!cleanType || !storeId) {
      return createErrorResponse('Clean type and Store ID are required.', 400);
    }

    const store = await prisma.store.findFirst({
      where: { id: storeId, propertyId: user.propertyId }
    });
    if (!store) {
      return createErrorResponse('Store not found or does not belong to this property.', 404);
    }

    const templateItems = await prisma.cleanChecklist.findMany({
      where: { cleanType, organizationId: user.organizationId },
      include: { item: true }
    });

    if (templateItems.length === 0) {
      return createErrorResponse(`No items configured in checklist for clean type: ${cleanType}`, 400);
    }

    const cleanResult = await prisma.$transaction(async (tx) => {
      const logs = [];

      for (const checklist of templateItems) {
        let balance = await tx.stockBalance.findFirst({
          where: { storeId, itemId: checklist.itemId }
        });

        if (!balance) {
          balance = await tx.stockBalance.create({
            data: {
              storeId,
              itemId: checklist.itemId,
              quantity: 0.0,
              minStockLevel: 0.0,
              avgCostPrice: 0.0
            }
          });
        }

        const updated = await tx.stockBalance.update({
          where: { id: balance.id },
          data: {
            quantity: {
              decrement: checklist.quantity
            }
          }
        });

        await tx.stockTransaction.create({
          data: {
            itemId: checklist.itemId,
            storeId,
            type: 'HOUSEKEEPING_CLEAN',
            quantity: -checklist.quantity,
            costPrice: balance.avgCostPrice,
            referenceId: checklist.id,
            remarks: remarks || `Room Clean: ${cleanType}`,
            recordedById: user.userId
          }
        });

        logs.push({
          itemId: checklist.itemId,
          itemName: checklist.item.name,
          depletedQty: checklist.quantity,
          remainingQty: updated.quantity,
          avgCostPrice: balance.avgCostPrice
        });
      }

      return logs;
    });

    return NextResponse.json({ message: `Room clean (${cleanType}) recorded successfully.`, transactions: cleanResult });
  } catch (error) {
    console.error('Room Clean Log Error:', error);
    return createErrorResponse('Failed to record room clean depletion.', 500);
  }
}
