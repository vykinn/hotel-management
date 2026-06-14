import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser, createErrorResponse } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ storeId: string }>;
}

export async function GET(req: NextRequest, context: RouteParams) {
  const user = getAuthenticatedUser(req);
  if (!user || !user.propertyId) {
    return createErrorResponse('Unauthorized. Invalid or missing token.', 401);
  }

  const { storeId } = await context.params;

  try {
    const session = await prisma.stockTakeSession.findFirst({
      where: {
        storeId,
        status: 'DRAFT',
        store: { propertyId: user.propertyId }
      },
      include: {
        items: {
          include: { item: true }
        },
        createdBy: {
          select: { name: true, email: true }
        }
      }
    });

    return NextResponse.json(session || null);
  } catch (error) {
    console.error('Get Active Audit Session Error:', error);
    return createErrorResponse('Failed to retrieve active audit session.', 500);
  }
}
