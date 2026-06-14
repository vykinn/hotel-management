import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser, createErrorResponse } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = getAuthenticatedUser(req);
  if (!user || !user.propertyId) {
    return createErrorResponse('Unauthorized. Invalid or missing token.', 401);
  }

  try {
    const sessions = await prisma.stockTakeSession.findMany({
      where: {
        store: { propertyId: user.propertyId },
        status: { in: ['COMPLETED', 'CANCELLED'] }
      },
      include: {
        store: true,
        createdBy: { select: { name: true } },
        items: { include: { item: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(sessions);
  } catch (error) {
    console.error('Get Completed Sessions Error:', error);
    return createErrorResponse('Failed to retrieve completed sessions.', 500);
  }
}
