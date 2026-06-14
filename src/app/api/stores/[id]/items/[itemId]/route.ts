import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser, createErrorResponse } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string; itemId: string }>;
}

export async function DELETE(req: NextRequest, context: RouteParams) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return createErrorResponse('Unauthorized. Invalid or missing token.', 401);
  }

  const { id: storeId, itemId } = await context.params;

  try {
    const balance = await prisma.stockBalance.findFirst({
      where: { storeId, itemId }
    });

    if (!balance) {
      return createErrorResponse('Item not found in this store.', 404);
    }

    await prisma.stockBalance.delete({ where: { id: balance.id } });
    return NextResponse.json({ message: 'Item removed from store successfully.' });
  } catch (error) {
    console.error('Remove Item from Store Error:', error);
    return createErrorResponse('Failed to remove item from store.', 500);
  }
}
