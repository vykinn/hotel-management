import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser, createErrorResponse } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return createErrorResponse('Unauthorized. Invalid or missing token.', 401);
  }

  const propertyId = user.propertyId;
  if (!propertyId) {
    return createErrorResponse('Property ID missing.', 400);
  }

  try {
    const stores = await prisma.store.findMany({ where: { propertyId } });
    return NextResponse.json(stores);
  } catch (error) {
    console.error('Get Stores Error:', error);
    return createErrorResponse('Failed to retrieve stores.', 500);
  }
}

export async function POST(req: NextRequest) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return createErrorResponse('Unauthorized. Invalid or missing token.', 401);
  }

  const propertyId = user.propertyId;
  if (!propertyId) {
    return createErrorResponse('Property ID missing.', 400);
  }

  try {
    const { name } = await req.json();
    if (!name) {
      return createErrorResponse('Store name is required.', 400);
    }

    const newStore = await prisma.store.create({ data: { name, propertyId } });
    return NextResponse.json(newStore, { status: 201 });
  } catch (error) {
    console.error('Create Store Error:', error);
    return createErrorResponse('Failed to create store.', 500);
  }
}
