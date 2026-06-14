import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser, createErrorResponse } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ sessionId: string }>;
}

export async function PUT(req: NextRequest, context: RouteParams) {
  const user = getAuthenticatedUser(req);
  if (!user || !user.propertyId) {
    return createErrorResponse('Unauthorized. Invalid or missing token.', 401);
  }

  const { sessionId } = await context.params;

  try {
    const { items } = await req.json();

    if (!items || !Array.isArray(items)) {
      return createErrorResponse('Items array is required.', 400);
    }

    const session = await prisma.stockTakeSession.findFirst({
      where: { id: sessionId, status: 'DRAFT', store: { propertyId: user.propertyId } }
    });
    if (!session) {
      return createErrorResponse('Active draft session not found.', 404);
    }

    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        if (item.physicalQty !== undefined && item.physicalQty !== null && Number(item.physicalQty) < 0) {
          throw new Error('400:Physical count cannot be negative.');
        }

        const sessionItem = await tx.stockTakeItem.findFirst({
          where: { sessionId, itemId: item.itemId }
        });

        if (sessionItem) {
          const physicalQty = item.physicalQty !== null ? Number(item.physicalQty) : null;
          let varianceQty = null;
          let varianceValue = null;

          if (physicalQty !== null) {
            varianceQty = physicalQty - sessionItem.systemQty;
            varianceValue = varianceQty * sessionItem.avgCostPrice;
          }

          await tx.stockTakeItem.update({
            where: { id: sessionItem.id },
            data: {
              physicalQty,
              varianceQty,
              varianceValue
            }
          });
        }
      }
    });

    const updated = await prisma.stockTakeSession.findUnique({
      where: { id: sessionId },
      include: {
        items: { include: { item: true } },
        createdBy: { select: { name: true } }
      }
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Update Audit Counts Error:', error);
    if (error.message && error.message.startsWith('400:')) {
      return createErrorResponse(error.message.substring(4), 400);
    }
    return createErrorResponse('Failed to update audit counts.', 500);
  }
}
