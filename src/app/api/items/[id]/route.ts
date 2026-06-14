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
    const { name, category, subcategory, isConsumable, sku, uom } = await req.json();

    // Verify item belongs to user's org
    const item = await prisma.inventoryItem.findFirst({
      where: { id, organizationId: user.organizationId }
    });

    if (!item) {
      return createErrorResponse('Item not found in your organization.', 404);
    }

    const updated = await prisma.inventoryItem.update({
      where: { id },
      data: {
        name,
        category,
        subcategory,
        sku,
        isConsumable,
        purchaseUnit: uom?.purchaseUnit,
        consumptionUnit: uom?.consumptionUnit,
        factor: uom ? Number(uom.factor) : undefined
      }
    });

    return NextResponse.json({
      id: updated.id,
      sku: updated.sku,
      name: updated.name,
      category: updated.category,
      subcategory: updated.subcategory,
      isConsumable: updated.isConsumable,
      uom: {
        purchaseUnit: updated.purchaseUnit,
        consumptionUnit: updated.consumptionUnit,
        factor: updated.factor
      }
    });
  } catch (error) {
    console.error('Update Item Error:', error);
    return createErrorResponse('Failed to update item.', 500);
  }
}

export async function DELETE(req: NextRequest, context: RouteParams) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return createErrorResponse('Unauthorized. Invalid or missing token.', 401);
  }

  const { id } = await context.params;

  try {
    const item = await prisma.inventoryItem.findFirst({
      where: { id, organizationId: user.organizationId }
    });

    if (!item) {
      return createErrorResponse('Item not found in your organization.', 404);
    }

    // Delete related stock balances first
    await prisma.stockBalance.deleteMany({
      where: { itemId: id }
    });

    await prisma.inventoryItem.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Item and related balances deleted successfully.' });
  } catch (error) {
    console.error('Delete Item Error:', error);
    return createErrorResponse('Failed to delete item.', 500);
  }
}
