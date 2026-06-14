import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser, createErrorResponse } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return createErrorResponse('Unauthorized. Invalid or missing token.', 401);
  }

  try {
    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { deptManagerLimit: true, genManagerLimit: true, name: true }
    });
    return NextResponse.json(org);
  } catch (error) {
    console.error('Get Settings Error:', error);
    return createErrorResponse('Failed to retrieve organization settings', 500);
  }
}

export async function PUT(req: NextRequest) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return createErrorResponse('Unauthorized. Invalid or missing token.', 401);
  }

  const role = user.role;
  if (role !== 'HOTEL_OWNER' && role !== 'SUPER_ADMIN') {
    return createErrorResponse('Only administrators or owners can update approval tiers.', 403);
  }

  try {
    const { deptManagerLimit, genManagerLimit } = await req.json();
    if (deptManagerLimit === undefined || genManagerLimit === undefined) {
      return createErrorResponse('Department and General Manager thresholds are required.', 400);
    }

    const org = await prisma.organization.update({
      where: { id: user.organizationId },
      data: {
        deptManagerLimit: Number(deptManagerLimit),
        genManagerLimit: Number(genManagerLimit)
      }
    });

    return NextResponse.json({
      message: 'Approval thresholds updated successfully.',
      deptManagerLimit: org.deptManagerLimit,
      genManagerLimit: org.genManagerLimit
    });
  } catch (error) {
    console.error('Update Settings Error:', error);
    return createErrorResponse('Failed to update organization settings', 500);
  }
}
