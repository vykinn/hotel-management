import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser, createErrorResponse } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return createErrorResponse('Unauthorized. Invalid or missing token.', 401);
  }

  try {
    const vendors = await prisma.vendor.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { name: 'asc' }
    });
    return NextResponse.json(vendors);
  } catch (error) {
    console.error('Get Vendors Error:', error);
    return createErrorResponse('Failed to retrieve vendors', 500);
  }
}

export async function POST(req: NextRequest) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return createErrorResponse('Unauthorized. Invalid or missing token.', 401);
  }

  try {
    const { name, email, phone, gstin, address } = await req.json();
    if (!name) {
      return createErrorResponse('Vendor name is required', 400);
    }

    const vendor = await prisma.vendor.create({
      data: {
        name,
        email: email || null,
        phone: phone || null,
        gstin: gstin || null,
        address: address || null,
        organizationId: user.organizationId
      }
    });
    return NextResponse.json(vendor, { status: 201 });
  } catch (error) {
    console.error('Create Vendor Error:', error);
    return createErrorResponse('Failed to create vendor', 500);
  }
}
