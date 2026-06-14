import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser, createErrorResponse } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const user = getAuthenticatedUser(req);
  if (!user || !user.propertyId) {
    return createErrorResponse('Unauthorized. Invalid or missing token.', 401);
  }

  try {
    const { storeId } = await req.json();

    if (!storeId) {
      return createErrorResponse('Store ID is required.', 400);
    }

    const store = await prisma.store.findFirst({
      where: { id: storeId, propertyId: user.propertyId }
    });
    if (!store) {
      return createErrorResponse('Store not found or does not belong to this property.', 404);
    }

    const existing = await prisma.stockTakeSession.findFirst({
      where: { storeId, status: 'DRAFT' }
    });
    if (existing) {
      return createErrorResponse('An active stock audit session is already in progress for this store.', 409);
    }

    const stockBalances = await prisma.stockBalance.findMany({
      where: { storeId },
      include: { item: true }
    });

    if (stockBalances.length === 0) {
      return createErrorResponse('Cannot start audit. This store has no items assigned to it.', 400);
    }

    const session = await prisma.$transaction(async (tx) => {
      const sess = await tx.stockTakeSession.create({
        data: {
          storeId,
          status: 'DRAFT',
          createdById: user.userId
        }
      });

      await tx.stockTakeItem.createMany({
        data: stockBalances.map(sb => ({
          sessionId: sess.id,
          itemId: sb.itemId,
          systemQty: sb.quantity,
          avgCostPrice: sb.avgCostPrice
        }))
      });

      return sess;
    });

    const fullSession = await prisma.stockTakeSession.findUnique({
      where: { id: session.id },
      include: {
        items: { include: { item: true } },
        createdBy: { select: { name: true } }
      }
    });

    return NextResponse.json(fullSession, { status: 201 });
  } catch (error) {
    console.error('Create Audit Session Error:', error);
    return createErrorResponse('Failed to create audit session.', 500);
  }
}
