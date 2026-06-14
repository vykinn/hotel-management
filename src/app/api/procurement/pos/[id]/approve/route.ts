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

  const { id } = await context.params;

  try {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        vendor: true
      }
    });

    if (!po) return createErrorResponse('Purchase Order not found', 404);
    if (po.status !== 'PENDING_APPROVAL' && po.status !== 'DRAFT') {
      return createErrorResponse('Purchase Order is not in a status that can be approved', 400);
    }

    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId }
    });
    if (!org) return createErrorResponse('Organization not found', 404);

    const role = user.role;
    const { deptManagerLimit, genManagerLimit } = org;
    let allowed = false;

    if (role === 'HOTEL_OWNER' || role === 'SUPER_ADMIN') {
      allowed = true;
    } else if (role === 'GENERAL_MANAGER') {
      if (po.totalAmount <= genManagerLimit) allowed = true;
    } else if (role === 'DEPARTMENT_MANAGER') {
      if (po.totalAmount <= deptManagerLimit) allowed = true;
    }

    if (!allowed) {
      return createErrorResponse(
        `Insufficient approval authority. Your role limits approvals up to ₹${
          role === 'GENERAL_MANAGER' ? genManagerLimit : deptManagerLimit
        }. PO total is ₹${po.totalAmount}.`,
        403
      );
    }

    const updatedPO = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById: user.userId
      }
    });

    return NextResponse.json(updatedPO);
  } catch (error) {
    console.error('Approve PO Error:', error);
    return createErrorResponse('Failed to approve Purchase Order', 500);
  }
}
