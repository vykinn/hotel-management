import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser, createErrorResponse } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = getAuthenticatedUser(req);
  if (!user || !user.propertyId) {
    return createErrorResponse('Unauthorized. Invalid or missing token.', 401);
  }

  try {
    const grns = await prisma.goodsReceivedNote.findMany({
      where: {
        po: { propertyId: user.propertyId }
      },
      include: {
        po: {
          include: { vendor: true, store: true }
        },
        receivedBy: { select: { name: true } },
        items: {
          include: { item: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const mapped = grns.map(grn => ({
      ...grn,
      items: grn.items.map(gi => ({
        ...gi,
        item: gi.item ? {
          id: gi.item.id,
          sku: gi.item.sku,
          name: gi.item.name,
          category: gi.item.category,
          subcategory: gi.item.subcategory,
          isConsumable: gi.item.isConsumable,
          uom: {
            purchaseUnit: gi.item.purchaseUnit,
            consumptionUnit: gi.item.consumptionUnit,
            factor: gi.item.factor
          }
        } : null
      }))
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    console.error('Get GRNs Error:', error);
    return createErrorResponse('Failed to retrieve Goods Received Notes', 500);
  }
}

export async function POST(req: NextRequest) {
  const user = getAuthenticatedUser(req);
  if (!user || !user.propertyId) {
    return createErrorResponse('Unauthorized. Invalid or missing token.', 401);
  }

  try {
    const { poId, items } = await req.json();

    if (!poId || !items || !Array.isArray(items) || items.length === 0) {
      return createErrorResponse('PO ID and items received quantities are required', 400);
    }

    const po = await prisma.purchaseOrder.findUnique({
      where: { id: poId },
      include: { items: true }
    });

    if (!po) return createErrorResponse('Purchase Order not found', 404);
    if (po.status !== 'APPROVED' && po.status !== 'PARTIALLY_RECEIVED') {
      return createErrorResponse('Goods can only be received against APPROVED or PARTIALLY RECEIVED Purchase Orders', 400);
    }

    const count = await prisma.goodsReceivedNote.count();
    const grnNumber = `GRN-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const grn = await prisma.$transaction(async (tx) => {
      const newGRN = await tx.goodsReceivedNote.create({
        data: {
          grnNumber,
          poId,
          receivedById: user.userId,
          items: {
            create: items.map((i: any) => ({
              itemId: i.itemId,
              receivedQty: Number(i.receivedQty),
              rejectedQty: Number(i.rejectedQty || 0),
              unitPrice: Number(i.unitPrice),
              remarks: i.remarks || null
            }))
          }
        },
        include: {
          items: true
        }
      });

      for (const grnItem of items) {
        const itemObj = await tx.inventoryItem.findUnique({
          where: { id: grnItem.itemId }
        });
        if (!itemObj) throw new Error(`Inventory item ${grnItem.itemId} not found`);

        const acceptedQty = Number(grnItem.receivedQty) - Number(grnItem.rejectedQty || 0);
        if (acceptedQty < 0) throw new Error('Rejected quantity cannot exceed received quantity');

        if (acceptedQty > 0) {
          const acceptedInCons = acceptedQty * itemObj.factor;
          const costPerCons = Number(grnItem.unitPrice) / itemObj.factor;

          const existingStock = await tx.stockBalance.findFirst({
            where: {
              itemId: grnItem.itemId,
              storeId: po.storeId
            }
          });

          if (!existingStock) {
            await tx.stockBalance.create({
              data: {
                itemId: grnItem.itemId,
                storeId: po.storeId,
                quantity: acceptedInCons,
                avgCostPrice: costPerCons,
                minStockLevel: 0.0
              }
            });
          } else {
            const currentQty = existingStock.quantity;
            const currentCost = existingStock.avgCostPrice;
            const newQty = currentQty + acceptedInCons;
            
            const newCost = newQty > 0 
              ? ((currentQty * currentCost) + (acceptedInCons * costPerCons)) / newQty
              : costPerCons;

            await tx.stockBalance.update({
              where: { id: existingStock.id },
              data: {
                quantity: newQty,
                avgCostPrice: newCost
              }
            });
          }
        }

        const poItem = po.items.find(pi => pi.itemId === grnItem.itemId);
        if (poItem) {
          await tx.purchaseOrderItem.update({
            where: { id: poItem.id },
            data: {
              receivedQty: {
                increment: Number(grnItem.receivedQty)
              }
            }
          });
        }
      }

      const updatedPoItems = await tx.purchaseOrderItem.findMany({
        where: { poId }
      });

      let allCompleted = true;
      let anyReceived = false;

      for (const pi of updatedPoItems) {
        if (pi.receivedQty < pi.orderQty) {
          allCompleted = false;
        }
        if (pi.receivedQty > 0) {
          anyReceived = true;
        }
      }

      const nextStatus = allCompleted 
        ? 'COMPLETED' 
        : (anyReceived ? 'PARTIALLY_RECEIVED' : 'APPROVED');

      await tx.purchaseOrder.update({
        where: { id: poId },
        data: { status: nextStatus }
      });

      return newGRN;
    });

    return NextResponse.json(grn, { status: 201 });
  } catch (error: any) {
    console.error('Create GRN Error:', error);
    return createErrorResponse(error.message || 'Failed to complete Goods Received Note receipt', 500);
  }
}
