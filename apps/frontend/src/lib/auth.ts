import jwt, { Secret, SignOptions } from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { NextRequest } from 'next/server'

const JWT_SECRET: Secret = process.env.JWT_SECRET ||  'Mypassword'
 console.log('JWT_SECRET:', JWT_SECRET)

export interface JWTPayload {
  userId: string
  email: string
  username?: string
}

export const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, 12)
}

export const comparePassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return await bcrypt.compare(password, hashedPassword)
}

export const generateToken = (payload: JWTPayload): string => {
  const options: SignOptions = { expiresIn: '7d' }
  return jwt.sign(payload, JWT_SECRET, options)
}

export const verifyToken = (token: string): JWTPayload | null => {
  try {
      return  jwt.verify(token, JWT_SECRET) as JWTPayload
     
     
  } catch (error :unknown) {
    return null
  }
}

export const extractTokenFromRequest = (request: NextRequest): string | null => {
  const authHeader = request.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }
  return null
}
