import { PrismaClient } from '../../../../generated/prisma';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers'; // For setting cookies

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return new NextResponse('Please provide both email and password', { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return new NextResponse('Invalid credentials', { status: 401 });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return new NextResponse('Invalid credentials', { status: 401 });
    }

    // In a real application, you would likely create a session token
    // and set it as a cookie or return it in the response.
    // For this basic example, we'll just indicate success.
    // Consider using libraries like `jsonwebtoken` for token generation.

    // Example of setting a simple session cookie (for demonstration purposes only)
    (await
          // In a real application, you would likely create a session token
          // and set it as a cookie or return it in the response.
          // For this basic example, we'll just indicate success.
          // Consider using libraries like `jsonwebtoken` for token generation.
          // Example of setting a simple session cookie (for demonstration purposes only)
          cookies()).set('userId', user.id.toString(), {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return NextResponse.json({ message: 'Login successful', userId: user.id }, { status: 200 });

  } catch (error: any) {
    console.error('Login error:', error);
    return new NextResponse('Something went wrong', { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}