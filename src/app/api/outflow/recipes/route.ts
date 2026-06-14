import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser, createErrorResponse } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return createErrorResponse('Unauthorized. Invalid or missing token.', 401);
  }

  try {
    const recipes = await prisma.recipe.findMany({
      where: { organizationId: user.organizationId },
      include: {
        ingredients: {
          include: { item: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(recipes);
  } catch (error) {
    console.error('Get Recipes Error:', error);
    return createErrorResponse('Failed to retrieve recipes.', 500);
  }
}

export async function POST(req: NextRequest) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return createErrorResponse('Unauthorized. Invalid or missing token.', 401);
  }

  try {
    const { name, code, ingredients } = await req.json();

    if (!name || !code) {
      return createErrorResponse('Name and unique code are required.', 400);
    }
    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return createErrorResponse('At least one ingredient is required.', 400);
    }

    const existing = await prisma.recipe.findFirst({
      where: { organizationId: user.organizationId, code }
    });
    if (existing) {
      return createErrorResponse('A recipe with this code already exists.', 409);
    }

    for (const ing of ingredients) {
      if (!ing.itemId || ing.quantity === undefined || Number(ing.quantity) <= 0) {
        return createErrorResponse('Each ingredient must have a valid itemId and positive quantity.', 400);
      }

      const item = await prisma.inventoryItem.findFirst({
        where: { id: ing.itemId, organizationId: user.organizationId }
      });
      if (!item) {
        return createErrorResponse(`Inventory item with ID ${ing.itemId} not found in this organization.`, 404);
      }
    }

    const newRecipe = await prisma.recipe.create({
      data: {
        name,
        code,
        organizationId: user.organizationId,
        ingredients: {
          create: ingredients.map((ing: any) => ({
            itemId: ing.itemId,
            quantity: Number(ing.quantity)
          }))
        }
      },
      include: {
        ingredients: {
          include: { item: true }
        }
      }
    });

    return NextResponse.json(newRecipe, { status: 201 });
  } catch (error) {
    console.error('Create Recipe Error:', error);
    return createErrorResponse('Failed to create recipe.', 500);
  }
}
