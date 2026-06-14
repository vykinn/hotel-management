import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser, createErrorResponse } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = getAuthenticatedUser(req);
  if (!user || !user.propertyId) {
    return createErrorResponse('Unauthorized. Invalid or missing token.', 401);
  }

  const { searchParams } = req.nextUrl;
  const storeId = searchParams.get('storeId') || undefined;
  const itemId = searchParams.get('itemId') || undefined;

  try {
    const transactions = await prisma.stockTransaction.findMany({
      where: {
        store: {
          propertyId: user.propertyId
        },
        storeId: storeId ? String(storeId) : undefined,
        itemId: itemId ? String(itemId) : undefined
      },
      include: {
        item: true,
        store: true,
        recordedBy: {
          select: { name: true, email: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(transactions);
  } catch (error) {
    console.error('Get Stock Ledger Error:', error);
    return createErrorResponse('Failed to retrieve stock ledger transactions.', 500);
  }
}
