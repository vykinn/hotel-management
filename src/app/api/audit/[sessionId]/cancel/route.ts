import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser, createErrorResponse } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ sessionId: string }>;
}

export async function POST(req: NextRequest, context: RouteParams) {
  const user = getAuthenticatedUser(req);
  if (!user || !user.propertyId) {
    return createErrorResponse('Unauthorized. Invalid or missing token.', 401);
  }

  const { sessionId } = await context.params;

  try {
    const session = await prisma.stockTakeSession.findFirst({
      where: { id: sessionId, status: 'DRAFT', store: { propertyId: user.propertyId } }
    });

    if (!session) {
      return createErrorResponse('Active draft session not found.', 404);
    }

    await prisma.stockTakeSession.update({
      where: { id: sessionId },
      data: { status: 'CANCELLED' }
    });

    return NextResponse.json({ message: 'Stock audit session cancelled successfully.' });
  } catch (error) {
    console.error('Cancel Audit Session Error:', error);
    return createErrorResponse('Failed to cancel audit session.', 500);
  }
}
