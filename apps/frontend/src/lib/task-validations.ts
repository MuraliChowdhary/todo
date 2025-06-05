// src/lib/task-validations.ts
import { z } from 'zod'

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().optional(),
  status: z.enum(['todo', 'in_progress', 'in_review', 'done', 'canceled', 'backlog']).default('todo'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  startDate: z.string().datetime().optional(),
  dueDate: z.string().datetime().optional(),
  estimatedHours: z.number().min(0).optional(),
  assigneeId: z.string().optional(),
  projectId: z.string().optional(),
  milestoneId: z.string().optional(),
  parentId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  position: z.number().default(0),
})

export const updateTaskSchema = createTaskSchema.partial()

export const taskFilterSchema = z.object({
  status: z.enum(['todo', 'in_progress', 'in_review', 'done', 'canceled', 'backlog']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  assigneeId: z.string().optional(),
  projectId: z.string().optional(),
  milestoneId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  search: z.string().optional(),
  dueDateFrom: z.string().datetime().optional(),
  dueDateTo: z.string().datetime().optional(),
  isOverdue: z.boolean().optional(),
  hasSubtasks: z.boolean().optional(),
  createdBy: z.string().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'dueDate', 'priority', 'title', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
})

export const bulkUpdateSchema = z.object({
  taskIds: z.array(z.string()).min(1, 'At least one task ID is required'),
  updates: z.object({
    status: z.enum(['todo', 'in_progress', 'in_review', 'done', 'canceled', 'backlog']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    assigneeId: z.string().optional(),
    projectId: z.string().optional(),
    milestoneId: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }),
})
 