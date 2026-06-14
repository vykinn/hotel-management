import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser, createErrorResponse } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return createErrorResponse('Unauthorized. Invalid or missing token.', 401);
  }

  try {
    const checklists = await prisma.cleanChecklist.findMany({
      where: { organizationId: user.organizationId },
      include: { item: true },
      orderBy: { cleanType: 'asc' }
    });
    return NextResponse.json(checklists);
  } catch (error) {
    console.error('Get Clean Checklists Error:', error);
    return createErrorResponse('Failed to retrieve clean templates.', 500);
  }
}

export async function POST(req: NextRequest) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return createErrorResponse('Unauthorized. Invalid or missing token.', 401);
  }

  try {
    const { cleanType, items } = await req.json();

    if (!cleanType) return createErrorResponse('Clean type is required.', 400);
    if (!items || !Array.isArray(items)) {
      return createErrorResponse('Items array is required.', 400);
    }

    for (const it of items) {
      if (!it.itemId || it.quantity === undefined || Number(it.quantity) <= 0) {
        return createErrorResponse('Each template item must have a valid itemId and positive quantity.', 400);
      }

      const item = await prisma.inventoryItem.findFirst({
        where: { id: it.itemId, organizationId: user.organizationId }
      });
      if (!item) {
        return createErrorResponse(`Inventory item with ID ${it.itemId} not found in this organization.`, 404);
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.cleanChecklist.deleteMany({
        where: { cleanType, organizationId: user.organizationId }
      });

      if (items.length > 0) {
        await tx.cleanChecklist.createMany({
          data: items.map((it: any) => ({
            cleanType,
            itemId: it.itemId,
            quantity: Number(it.quantity),
            organizationId: user.organizationId
          }))
        });
      }
    });

    const updated = await prisma.cleanChecklist.findMany({
      where: { cleanType, organizationId: user.organizationId },
      include: { item: true }
    });

    return NextResponse.json({ message: 'Housekeeping checklist template saved.', template: updated });
  } catch (error) {
    console.error('Save Clean Checklist Error:', error);
    return createErrorResponse('Failed to save housekeeping template.', 500);
  }
}
