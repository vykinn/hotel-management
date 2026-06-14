import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser, createErrorResponse } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ sessionId: string }>;
}

export async function POST(req: NextRequest, context: RouteParams) {
  const user = getAuthenticatedUser(req);
  if (!user || !user.propertyId) {
    return createErrorResponse('Unauthorized. Invalid or missing token.', 401);
  }

  if (user.role === 'STOREKEEPER') {
    return createErrorResponse('Access Denied. Storekeepers cannot submit final reconciliations.', 403);
  }

  const { sessionId } = await context.params;

  try {
    const session = await prisma.stockTakeSession.findFirst({
      where: { id: sessionId, status: 'DRAFT', store: { propertyId: user.propertyId } },
      include: { items: true }
    });

    if (!session) {
      return createErrorResponse('Active draft audit session not found.', 404);
    }

    const finalResult = await prisma.$transaction(async (tx) => {
      const ledgerLogs = [];

      for (const sItem of session.items) {
        const physical = sItem.physicalQty !== null ? sItem.physicalQty : sItem.systemQty;
        const varianceQty = physical - sItem.systemQty;
        const varianceValue = varianceQty * sItem.avgCostPrice;

        await tx.stockTakeItem.update({
          where: { id: sItem.id },
          data: {
            physicalQty: physical,
            varianceQty,
            varianceValue
          }
        });

        if (varianceQty !== 0) {
          let balance = await tx.stockBalance.findFirst({
            where: { storeId: session.storeId, itemId: sItem.itemId }
          });

          if (!balance) {
            balance = await tx.stockBalance.create({
              data: {
                storeId: session.storeId,
                itemId: sItem.itemId,
                quantity: 0.0,
                minStockLevel: 0.0,
                avgCostPrice: sItem.avgCostPrice
              }
            });
          }

          await tx.stockBalance.update({
            where: { id: balance.id },
            data: {
              quantity: {
                increment: varianceQty
              }
            }
          });

          const txn = await tx.stockTransaction.create({
            data: {
              itemId: sItem.itemId,
              storeId: session.storeId,
              type: 'ADJUSTMENT',
              quantity: varianceQty,
              costPrice: sItem.avgCostPrice,
              referenceId: session.id,
              remarks: `Reconciliation Audit adjustment (Physical: ${physical}, Sys: ${sItem.systemQty})`,
              recordedById: user.userId
            }
          });

          ledgerLogs.push(txn);
        }
      }

      await tx.stockTakeSession.update({
        where: { id: sessionId },
        data: { status: 'COMPLETED' }
      });

      return ledgerLogs;
    });

    return NextResponse.json({
      message: 'Stock audit finalized and reconciled successfully.',
      adjustmentsCount: finalResult.length
    });
  } catch (error) {
    console.error('Finalize Audit Session Error:', error);
    return createErrorResponse('Failed to finalize stock take reconciliation.', 500);
  }
}
