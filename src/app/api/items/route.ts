import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser, createErrorResponse } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return createErrorResponse('Unauthorized. Invalid or missing token.', 401);
  }

  try {
    const items = await prisma.inventoryItem.findMany({
      where: { organizationId: user.organizationId }
    });

    const mapped = items.map((item) => ({
      id: item.id,
      sku: item.sku,
      name: item.name,
      category: item.category,
      subcategory: item.subcategory,
      isConsumable: item.isConsumable,
      uom: {
        purchaseUnit: item.purchaseUnit,
        consumptionUnit: item.consumptionUnit,
        factor: item.factor
      }
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    console.error('Get Items Error:', error);
    return createErrorResponse('Failed to retrieve catalog items.', 500);
  }
}

export async function POST(req: NextRequest) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return createErrorResponse('Unauthorized. Invalid or missing token.', 401);
  }

  try {
    const { name, category, subcategory, isConsumable, sku, uom } = await req.json();

    if (!name || !category || !uom || !uom.purchaseUnit || !uom.consumptionUnit || uom.factor === undefined) {
      return createErrorResponse(
        'Name, category, and UoM details (purchaseUnit, consumptionUnit, factor) are required.',
        400
      );
    }

    const newItem = await prisma.inventoryItem.create({
      data: {
        name,
        category,
        subcategory,
        sku,
        isConsumable: isConsumable !== undefined ? isConsumable : true,
        purchaseUnit: uom.purchaseUnit,
        consumptionUnit: uom.consumptionUnit,
        factor: Number(uom.factor),
        organizationId: user.organizationId
      }
    });

    return NextResponse.json({
      id: newItem.id,
      sku: newItem.sku,
      name: newItem.name,
      category: newItem.category,
      subcategory: newItem.subcategory,
      isConsumable: newItem.isConsumable,
      uom: {
        purchaseUnit: newItem.purchaseUnit,
        consumptionUnit: newItem.consumptionUnit,
        factor: newItem.factor
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Create Item Error:', error);
    return createErrorResponse('Failed to create item.', 500);
  }
}
