import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser, createErrorResponse } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(req: NextRequest, context: RouteParams) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return createErrorResponse('Unauthorized. Invalid or missing token.', 401);
  }

  const { id } = await context.params;

  try {
    const recipe = await prisma.recipe.findFirst({
      where: { id, organizationId: user.organizationId }
    });

    if (!recipe) {
      return createErrorResponse('Recipe not found.', 404);
    }

    await prisma.recipe.delete({ where: { id } });
    return NextResponse.json({ message: 'Recipe deleted successfully.' });
  } catch (error) {
    console.error('Delete Recipe Error:', error);
    return createErrorResponse('Failed to delete recipe.', 500);
  }
}
