import { PrismaClient } from '../../../../generated/prisma';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return new NextResponse('Please provide both email and password', { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return new NextResponse('User with this email already exists', { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
      },
    });

    // You might want to create a session or return a token here in a real app
    return NextResponse.json({ message: 'User created successfully' }, { status: 201 });

  } catch (error: any) {
    console.error('Signup error:', error);
    return new NextResponse('Something went wrong', { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}