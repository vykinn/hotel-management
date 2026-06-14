import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser, createErrorResponse } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(req: NextRequest, context: RouteParams) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return createErrorResponse('Unauthorized. Invalid or missing token.', 401);
  }

  const { id } = await context.params;

  try {
    const { quantity, minStockLevel, avgCostPrice } = await req.json();

    const stockBalance = await prisma.stockBalance.update({
      where: { id },
      data: {
        quantity: quantity !== undefined ? Number(quantity) : undefined,
        minStockLevel: minStockLevel !== undefined ? Number(minStockLevel) : undefined,
        avgCostPrice: avgCostPrice !== undefined ? Number(avgCostPrice) : undefined
      }
    });

    return NextResponse.json(stockBalance);
  } catch (error) {
    console.error('Update Stock Level Error:', error);
    return createErrorResponse('Failed to update stock level.', 500);
  }
}
