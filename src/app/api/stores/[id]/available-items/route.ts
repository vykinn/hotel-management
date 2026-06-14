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
    const existingBalances = await prisma.stockBalance.findMany({
      where: { storeId },
      select: { itemId: true }
    });
    const assignedItemIds = existingBalances.map(b => b.itemId);

    const availableItems = await prisma.inventoryItem.findMany({
      where: {
        organizationId: user.organizationId,
        id: { notIn: assignedItemIds.length > 0 ? assignedItemIds : undefined }
      }
    });

    const filtered = assignedItemIds.length > 0
      ? availableItems
      : await prisma.inventoryItem.findMany({ where: { organizationId: user.organizationId } });

    const mapped = (assignedItemIds.length > 0 ? availableItems : filtered).map(item => ({
      id: item.id,
      name: item.name,
      category: item.category,
      sku: item.sku,
      consumptionUnit: item.consumptionUnit
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    console.error('Get Available Items Error:', error);
    return createErrorResponse('Failed to retrieve available items.', 500);
  }
}
