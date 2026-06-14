import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

export interface AuthenticatedUser {
  userId: string;
  role: string;
  organizationId: string;
  propertyId?: string;
}

export function getAuthenticatedUser(req: NextRequest): AuthenticatedUser | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return null;

  const token = authHeader.split(' ')[1];
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    return decoded;
  } catch (err) {
    return null;
  }
}

export function createErrorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}
