import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser, createErrorResponse } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return createErrorResponse('Unauthorized. Invalid or missing token.', 401);
  }

  try {
    const properties = await prisma.property.findMany({
      where: { organizationId: user.organizationId }
    });
    return NextResponse.json(properties);
  } catch (error) {
    console.error('Get Properties Error:', error);
    return createErrorResponse('Failed to retrieve properties.', 500);
  }
}
