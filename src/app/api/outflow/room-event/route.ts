import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser, createErrorResponse } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const user = getAuthenticatedUser(req);
  if (!user || !user.propertyId) {
    return createErrorResponse('Unauthorized. Invalid or missing token.', 401);
  }

  try {
    const { roomNumber, event, dateCode, storeId } = await req.json();

    if (!roomNumber || !event || !dateCode) {
      return createErrorResponse('Room number, event type, and date code are required.', 400);
    }

    let templateCleanType = '';
    if (event === 'CHECKOUT') {
      templateCleanType = 'CHECKOUT_CLEAN';
    } else if (event === 'DAILY_SERVICE') {
      templateCleanType = 'FULL_CLEAN';
    } else {
      return createErrorResponse(`Unsupported room event: ${event}. Supported: CHECKOUT, DAILY_SERVICE`, 400);
    }

    const referenceId = `ROOM-${roomNumber}-${event}-${dateCode}`;

    const existing = await prisma.stockTransaction.findFirst({
      where: { referenceId, store: { propertyId: user.propertyId } }
    });
    if (existing) {
      return createErrorResponse(`Event ${event} for room ${roomNumber} on ${dateCode} already processed.`, 409);
    }

    let targetStoreId = storeId;
    if (!targetStoreId) {
      const hkStore = await prisma.store.findFirst({
        where: {
          propertyId: user.propertyId,
          name: { contains: 'Housekeeping' }
        }
      });
      const fallbackStore = await prisma.store.findFirst({ where: { propertyId: user.propertyId } });
      const storeObj = hkStore || fallbackStore;
      if (!storeObj) {
        return createErrorResponse('No housekeeping stores available in this property.', 404);
      }
      targetStoreId = storeObj.id;
    }

    const templates = await prisma.cleanChecklist.findMany({
      where: { cleanType: templateCleanType, organizationId: user.organizationId },
      include: { item: true }
    });

    if (templates.length === 0) {
      return createErrorResponse(`No items configured in clean template for clean type: ${templateCleanType}`, 400);
    }

    const eventResult = await prisma.$transaction(async (tx) => {
      const logs = [];

      for (const checklist of templates) {
        let balance = await tx.stockBalance.findFirst({
          where: { storeId: targetStoreId!, itemId: checklist.itemId }
        });

        if (!balance) {
          balance = await tx.stockBalance.create({
            data: {
              storeId: targetStoreId!,
              itemId: checklist.itemId,
              quantity: 0.0,
              minStockLevel: 0.0,
              avgCostPrice: 0.0
            }
          });
        }

        const updated = await tx.stockBalance.update({
          where: { id: balance.id },
          data: { quantity: { decrement: checklist.quantity } }
        });

        await tx.stockTransaction.create({
          data: {
            itemId: checklist.itemId,
            storeId: targetStoreId!,
            type: 'HOUSEKEEPING_CLEAN',
            quantity: -checklist.quantity,
            costPrice: balance.avgCostPrice,
            referenceId,
            remarks: `PMS Event: Room ${roomNumber} ${event} (Auto cleanup depletion)`,
            recordedById: user.userId
          }
        });

        logs.push({
          itemName: checklist.item.name,
          depletedQty: checklist.quantity,
          remainingQty: updated.quantity,
          avgCostPrice: balance.avgCostPrice
        });
      }

      return logs;
    });

    return NextResponse.json({ message: `Automated room clean logged successfully for Room ${roomNumber}.`, transactions: eventResult });
  } catch (error) {
    console.error('Room Event Automation Error:', error);
    return createErrorResponse('Failed to process automated room event clean depletion.', 500);
  }
}
