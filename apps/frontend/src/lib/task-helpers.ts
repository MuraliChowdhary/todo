import { Prisma } from '../generated/prisma'

export const getPriorityOrder = (priority: string): number => {
  const priorityMap = { low: 1, medium: 2, high: 3, critical: 4 }
  return priorityMap[priority as keyof typeof priorityMap] || 0
}

export const buildTaskFilters = (filters: any): Prisma.TaskWhereInput => {
  const where: Prisma.TaskWhereInput = {}

  if (filters.status) where.status = filters.status
  if (filters.priority) where.priority = filters.priority
  if (filters.assigneeId) where.assigneeId = filters.assigneeId
  if (filters.projectId) where.projectId = filters.projectId
  if (filters.milestoneId) where.milestoneId = filters.milestoneId
  if (filters.createdBy) where.creatorId = filters.createdBy

  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
    ]
  }

  if (filters.dueDateFrom || filters.dueDateTo) {
    where.dueDate = {}
    if (filters.dueDateFrom) where.dueDate.gte = new Date(filters.dueDateFrom)
    if (filters.dueDateTo) where.dueDate.lte = new Date(filters.dueDateTo)
  }

  if (filters.isOverdue) {
    where.dueDate = { lt: new Date() }
    where.status = { not: 'done' }
  }

  if (filters.hasSubtasks !== undefined) {
    if (filters.hasSubtasks) {
      where.subtasks = { some: {} }
    } else {
      where.subtasks = { none: {} }
    }
  }

  if (filters.tags && filters.tags.length > 0) {
    where.tags = {
      some: {
        tag: {
          name: { in: filters.tags }
        }
      }
    }
  }

  return where
}

export const buildTaskOrderBy = (sortBy: string, sortOrder: string): Prisma.TaskOrderByWithRelationInput[] => {
  const orderBy: Prisma.TaskOrderByWithRelationInput[] = []

  if (sortBy === 'priority') {
    // Custom priority sorting
    orderBy.push({
      priority: sortOrder as 'asc' | 'desc'
    })
  } else {
    orderBy.push({
      [sortBy]: sortOrder as 'asc' | 'desc'
    })
  }

  // Always add createdAt as secondary sort
  if (sortBy !== 'createdAt') {
    orderBy.push({ createdAt: 'desc' })
  }

  return orderBy
}