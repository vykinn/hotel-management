import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser, createErrorResponse } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, context: RouteParams) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return createErrorResponse('Unauthorized. Invalid or missing token.', 401);
  }

  const { id: storeId } = await context.params;

  try {
    const { itemId, quantity, minStockLevel, avgCostPrice } = await req.json();

    if (!storeId || !itemId) {
      return createErrorResponse('Store ID and Item ID are required.', 400);
    }

    if (quantity === undefined || minStockLevel === undefined || avgCostPrice === undefined) {
      return createErrorResponse(
        'Opening quantity, minimum stock level, and cost per unit are required.',
        400
      );
    }

    const existing = await prisma.stockBalance.findFirst({
      where: { storeId, itemId }
    });

    if (existing) {
      return createErrorResponse('This item is already tracked in this store.', 409);
    }

    const stockBalance = await prisma.stockBalance.create({
      data: {
        storeId,
        itemId,
        quantity: Number(quantity),
        minStockLevel: Number(minStockLevel),
        avgCostPrice: Number(avgCostPrice)
      },
      include: { item: true }
    });

    return NextResponse.json({
      id: stockBalance.id,
      itemId: stockBalance.item.id,
      itemName: stockBalance.item.name,
      category: stockBalance.item.category,
      quantity: stockBalance.quantity,
      minStockLevel: stockBalance.minStockLevel,
      avgCostPrice: stockBalance.avgCostPrice,
      consumptionUnit: stockBalance.item.consumptionUnit
    }, { status: 201 });
  } catch (error) {
    console.error('Add Item to Store Error:', error);
    return createErrorResponse('Failed to add item to store.', 500);
  }
}
