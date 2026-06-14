import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser, createErrorResponse } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = getAuthenticatedUser(req);
  if (!user || !user.propertyId) {
    return createErrorResponse('Unauthorized. Invalid or missing token.', 401);
  }

  try {
    const alerts = await prisma.stockBalance.findMany({
      where: {
        store: { propertyId: user.propertyId },
        quantity: { lt: prisma.stockBalance.fields.minStockLevel }
      },
      include: {
        item: true,
        store: true
      }
    });

    const responseData = await Promise.all(alerts.map(async (alert) => {
      const lastPurchaseItem = await prisma.purchaseOrderItem.findFirst({
        where: {
          itemId: alert.itemId,
          po: {
            propertyId: user.propertyId,
            status: 'COMPLETED'
          }
        },
        orderBy: {
          po: { createdAt: 'desc' }
        },
        include: {
          po: { select: { vendorId: true, vendor: true } }
        }
      });

      const suggestedReorderConsQty = (alert.minStockLevel * 2) - alert.quantity;
      const conversionFactor = alert.item.factor || 1;
      const suggestedReorderPoQty = Math.ceil(suggestedReorderConsQty / conversionFactor);

      return {
        id: alert.id,
        itemId: alert.itemId,
        itemName: alert.item.name,
        category: alert.item.category,
        storeId: alert.storeId,
        storeName: alert.store.name,
        currentStock: alert.quantity,
        minStockLevel: alert.minStockLevel,
        consumptionUnit: alert.item.consumptionUnit,
        purchaseUnit: alert.item.purchaseUnit,
        factor: conversionFactor,
        suggestedQty: suggestedReorderPoQty,
        lastUnitPrice: lastPurchaseItem ? lastPurchaseItem.unitPrice : 0,
        lastVendor: lastPurchaseItem ? { id: lastPurchaseItem.po.vendorId, name: lastPurchaseItem.po.vendor.name } : null
      };
    }));

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Get Low Stock Alerts Error:', error);
    return createErrorResponse('Failed to fetch low stock alerts', 500);
  }
}
