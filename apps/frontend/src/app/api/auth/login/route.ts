// apps/frontend/src/app/api/auth/login/route.ts

import { PrismaClient } from '../../../../generated/prisma';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      // Always return JSON if frontend expects it
      return NextResponse.json({ message: 'Please provide both email and password' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Always return JSON if frontend expects it
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      // Always return JSON if frontend expects it
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    // Set cookie using Next.js cookies utility
    (await
      // Set cookie using Next.js cookies utility
      cookies()).set('userId', user.id.toString(), {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
      // secure: process.env.NODE_ENV === 'production', // Add this for production
      // sameSite: 'lax', // Add this for production
    });

    return NextResponse.json({ message: 'Login successful', userId: user.id }, { status: 200 });

  } catch (error: any) {
    console.error('Login error (backend):', error); // Log the actual backend error for debugging
    // Always return JSON, even for a 500 error
    return NextResponse.json({ message: 'Something went wrong on the server.' }, { status: 500 });
  } finally {
    // Ensure disconnect happens even if an error occurs
    await prisma.$disconnect();
  }
}