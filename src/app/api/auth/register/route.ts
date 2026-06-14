import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, organizationName, propertyName } = await req.json();

    if (!email || !password || !name || !organizationName || !propertyName) {
      return NextResponse.json(
        { error: 'All fields (email, password, name, organizationName, propertyName) are required.' },
        { status: 400 }
      );
    }

    // 1. Create Organization
    const organization = await prisma.organization.create({
      data: { name: organizationName }
    });

    // 2. Create Default Property under Organization
    const property = await prisma.property.create({
      data: {
        name: propertyName,
        organizationId: organization.id
      }
    });

    // 3. Hash Password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Create Owner User
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'HOTEL_OWNER',
        organizationId: organization.id,
        propertyId: property.id
      }
    });

    return NextResponse.json({
      message: 'Organization and Owner registered successfully.',
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      organization: { id: organization.id, name: organization.name },
      property: { id: property.id, name: property.name }
    }, { status: 201 });
  } catch (error: any) {
    console.error('Registration Error:', error);
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A tenant or user with this name/email already exists.' },
        { status: 409 }
      );
    } else {
      return NextResponse.json(
        { error: 'Registration failed due to server error.' },
        { status: 500 }
      );
    }
  }
}
