import { z } from 'zod'

export const signupSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  username: z.string().min(3, 'Username must be at least 3 characters long').optional(),
  name: z.string().min(2, 'Name must be at least 2 characters long').optional(),
})

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
})

export const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long').optional(),
  username: z.string().min(3, 'Username must be at least 3 characters long').optional(),
  avatar: z.string().url('Invalid avatar URL').optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  timezone: z.string().optional(),
  dateFormat: z.string().optional(),
  weekStartsOn: z.number().min(0).max(6).optional(),
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  reminderNotifications: z.boolean().optional(),
})
