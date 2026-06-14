import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser, createErrorResponse } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, context: RouteParams) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return createErrorResponse('Unauthorized. Invalid or missing token.', 401);
  }

  const { id: storeId } = await context.params;

  try {
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      include: { property: true }
    });

    if (!store || store.property.organizationId !== user.organizationId) {
      return createErrorResponse('Store not found.', 404);
    }

    const stockBalances = await prisma.stockBalance.findMany({
      where: { storeId },
      include: { item: true }
    });

    const stockList = stockBalances.map(sb => ({
      id: sb.id,
      itemId: sb.item.id,
      itemName: sb.item.name,
      category: sb.item.category,
      sku: sb.item.sku,
      quantity: sb.quantity,
      minStockLevel: sb.minStockLevel,
      avgCostPrice: sb.avgCostPrice,
      purchaseUnit: sb.item.purchaseUnit,
      consumptionUnit: sb.item.consumptionUnit,
      factor: sb.item.factor
    }));

    return NextResponse.json(stockList);
  } catch (error) {
    console.error('Get Store Stock Error:', error);
    return createErrorResponse('Failed to retrieve stock levels.', 500);
  }
}
