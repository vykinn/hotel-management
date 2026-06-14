import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser, createErrorResponse } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = getAuthenticatedUser(req);
  if (!user || !user.propertyId) {
    return createErrorResponse('Unauthorized. Invalid or missing token.', 401);
  }

  try {
    const pos = await prisma.purchaseOrder.findMany({
      where: { propertyId: user.propertyId },
      include: {
        vendor: true,
        store: true,
        createdBy: { select: { name: true, role: true } },
        approvedBy: { select: { name: true } },
        items: {
          include: { item: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Map nested uom for frontend compatibility
    const mapped = pos.map(po => ({
      ...po,
      items: po.items.map(pi => ({
        ...pi,
        item: pi.item ? {
          id: pi.item.id,
          sku: pi.item.sku,
          name: pi.item.name,
          category: pi.item.category,
          subcategory: pi.item.subcategory,
          isConsumable: pi.item.isConsumable,
          uom: {
            purchaseUnit: pi.item.purchaseUnit,
            consumptionUnit: pi.item.consumptionUnit,
            factor: pi.item.factor
          }
        } : null
      }))
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    console.error('Get POs Error:', error);
    return createErrorResponse('Failed to retrieve Purchase Orders', 500);
  }
}

export async function POST(req: NextRequest) {
  const user = getAuthenticatedUser(req);
  if (!user || !user.propertyId) {
    return createErrorResponse('Unauthorized. Invalid or missing token.', 401);
  }

  try {
    const { vendorId, storeId, items, status: requestedStatus } = await req.json();

    if (!vendorId || !storeId || !items || !Array.isArray(items) || items.length === 0) {
      return createErrorResponse('Vendor, store, and at least one item are required', 400);
    }

    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId }
    });
    if (!org) return createErrorResponse('Organization not found', 404);

    const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor) return createErrorResponse('Vendor not found', 404);

    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store) return createErrorResponse('Store not found', 404);

    let totalAmount = 0;
    const poItemsData = [];
    for (const item of items) {
      if (!item.itemId || item.orderQty <= 0 || item.unitPrice < 0) {
        return createErrorResponse('Invalid item parameters (quantity must be > 0 and price >= 0)', 400);
      }

      const dbItem = await prisma.inventoryItem.findUnique({
        where: { id: item.itemId }
      });
      if (!dbItem) {
        return createErrorResponse(`Catalog item with ID ${item.itemId} not found`, 404);
      }

      poItemsData.push({
        itemId: item.itemId,
        purchaseUnit: dbItem.purchaseUnit,
        orderQty: Number(item.orderQty),
        unitPrice: Number(item.unitPrice),
        receivedQty: 0.0
      });

      totalAmount += Number(item.orderQty) * Number(item.unitPrice);
    }

    let status = 'PENDING_APPROVAL';

    if (requestedStatus === 'DRAFT') {
      status = 'DRAFT';
    } else {
      const role = user.role;
      const { deptManagerLimit, genManagerLimit } = org;

      if (role === 'HOTEL_OWNER' || role === 'SUPER_ADMIN') {
        status = 'APPROVED';
      } else if (role === 'GENERAL_MANAGER') {
        if (totalAmount <= genManagerLimit) {
          status = 'APPROVED';
        }
      } else if (role === 'DEPARTMENT_MANAGER') {
        if (totalAmount <= deptManagerLimit) {
          status = 'APPROVED';
        }
      } else {
        status = 'PENDING_APPROVAL';
      }
    }

    const count = await prisma.purchaseOrder.count();
    const poNumber = `PO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const newPO = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        vendorId,
        propertyId: user.propertyId,
        storeId,
        status,
        totalAmount,
        createdById: user.userId,
        approvedById: status === 'APPROVED' ? user.userId : null,
        items: {
          create: poItemsData
        }
      },
      include: {
        vendor: true,
        store: true,
        items: {
          include: { item: true }
        }
      }
    });

    const mappedPO = {
      ...newPO,
      items: newPO.items.map(pi => ({
        ...pi,
        item: pi.item ? {
          id: pi.item.id,
          sku: pi.item.sku,
          name: pi.item.name,
          category: pi.item.category,
          subcategory: pi.item.subcategory,
          isConsumable: pi.item.isConsumable,
          uom: {
            purchaseUnit: pi.item.purchaseUnit,
            consumptionUnit: pi.item.consumptionUnit,
            factor: pi.item.factor
          }
        } : null
      }))
    };

    return NextResponse.json(mappedPO, { status: 201 });
  } catch (error) {
    console.error('Create PO Error:', error);
    return createErrorResponse('Failed to create Purchase Order', 500);
  }
}
