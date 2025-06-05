import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, generateToken } from '@/lib/auth'
import { signupSchema } from '@/lib/validation'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validatedData = signupSchema.parse(body)
    
    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: validatedData.email },
          ...(validatedData.username ? [{ username: validatedData.username }] : [])
        ]
      }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email or username already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await hashPassword(validatedData.password)

    // Create user
    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        password: hashedPassword,
        username: validatedData.username,
        name: validatedData.name,
      },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        avatar: true,
        theme: true,
        timezone: true,
        createdAt: true,
      }
    })

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      username: user.username || undefined,
    })

    return NextResponse.json({
      message: 'User created successfully',
      user,
      token,
    }, { status: 201 })

  } catch (error: any) {
    console.error('Signup error:', error)
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

 
