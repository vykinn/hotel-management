import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser, createErrorResponse } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = getAuthenticatedUser(req);
  if (!user || !user.propertyId) {
    return createErrorResponse('Unauthorized. Invalid or missing token.', 401);
  }

  try {
    const logs = await prisma.wastageLog.findMany({
      where: {
        store: {
          propertyId: user.propertyId
        }
      },
      include: {
        item: true,
        store: true,
        recordedBy: {
          select: { name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(logs);
  } catch (error) {
    console.error('Get Wastage Logs Error:', error);
    return createErrorResponse('Failed to retrieve wastage logs.', 500);
  }
}

export async function POST(req: NextRequest) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return createErrorResponse('Unauthorized. Invalid or missing token.', 401);
  }

  try {
    const { itemId, storeId, quantity, reason, remarks } = await req.json();

    if (!itemId || !storeId || quantity === undefined || !reason) {
      return createErrorResponse('Item ID, Store ID, quantity, and reason are required.', 400);
    }
    if (Number(quantity) <= 0) {
      return createErrorResponse('Wastage quantity must be greater than 0.', 400);
    }

    const item = await prisma.inventoryItem.findFirst({
      where: { id: itemId, organizationId: user.organizationId }
    });
    if (!item) {
      return createErrorResponse('Inventory item not found.', 404);
    }

    const store = await prisma.store.findFirst({
      where: { id: storeId, propertyId: user.propertyId }
    });
    if (!store) {
      return createErrorResponse('Store not found or does not belong to this property.', 404);
    }

    const wastageRecord = await prisma.$transaction(async (tx) => {
      let balance = await tx.stockBalance.findFirst({
        where: { storeId, itemId }
      });

      if (!balance) {
        balance = await tx.stockBalance.create({
          data: {
            storeId,
            itemId,
            quantity: 0.0,
            minStockLevel: 0.0,
            avgCostPrice: 0.0
          }
        });
      }

      await tx.stockBalance.update({
        where: { id: balance.id },
        data: {
          quantity: {
            decrement: Number(quantity)
          }
        }
      });

      const log = await tx.wastageLog.create({
        data: {
          itemId,
          storeId,
          quantity: Number(quantity),
          reason,
          remarks: remarks || null,
          recordedById: user.userId
        },
        include: {
          item: true,
          store: true
        }
      });

      await tx.stockTransaction.create({
        data: {
          itemId,
          storeId,
          type: 'WASTAGE',
          quantity: -Number(quantity),
          costPrice: balance.avgCostPrice,
          referenceId: log.id,
          remarks: remarks || `Wastage logged. Reason: ${reason}`,
          recordedById: user.userId
        }
      });

      return log;
    });

    return NextResponse.json(wastageRecord, { status: 201 });
  } catch (error) {
    console.error('Log Wastage Error:', error);
    return createErrorResponse('Failed to record wastage.', 500);
  }
}
