import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createTaskSchema, taskFilterSchema } from '@/lib/task-validations'
import { buildTaskFilters, buildTaskOrderBy } from '@/lib/task-helpers'


export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const filters = taskFilterSchema.parse({
      status: searchParams.get('status') || undefined,
      priority: searchParams.get('priority') || undefined,
      assigneeId: searchParams.get('assigneeId') || undefined,
      projectId: searchParams.get('projectId') || undefined,
      milestoneId: searchParams.get('milestoneId') || undefined,
      tags: searchParams.get('tags')?.split(',') || undefined,
      search: searchParams.get('search') || undefined,
      dueDateFrom: searchParams.get('dueDateFrom') || undefined,
      dueDateTo: searchParams.get('dueDateTo') || undefined,
      isOverdue: searchParams.get('isOverdue') === 'true' || undefined,
      hasSubtasks: searchParams.get('hasSubtasks') === 'true' || undefined,
      createdBy: searchParams.get('createdBy') || undefined,
      sortBy: searchParams.get('sortBy') as any || 'createdAt',
      sortOrder: searchParams.get('sortOrder') as any || 'desc',
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
    })

    const where = buildTaskFilters(filters)
    const orderBy = buildTaskOrderBy(filters.sortBy, filters.sortOrder)
    
    // Add user access control - user can see tasks they created or are assigned to
    where.OR = [
      { creatorId: userId },
      { assigneeId: userId },
      { project: { workspace: { members: { some: { userId } } } } }
    ]

    const skip = (filters.page - 1) * filters.limit

    const [tasks, totalCount] = await Promise.all([
      prisma.task.findMany({
        where,
        orderBy,
        skip,
        take: filters.limit,
        include: {
          creator: {
            select: { id: true, name: true, email: true, avatar: true }
          },
          assignee: {
            select: { id: true, name: true, email: true, avatar: true }
          },
          project: {
            select: { id: true, name: true, color: true, workspace: { select: { id: true, name: true } } }
          },
          milestone: {
            select: { id: true, title: true, dueDate: true, status: true }
          },
          tags: {
            include: { tag: { select: { id: true, name: true, color: true } } }
          },
          parent: {
            select: { id: true, title: true, status: true }
          },
          subtasks: {
            select: { id: true, title: true, status: true, priority: true },
            orderBy: { position: 'asc' }
          },
          _count: {
            select: { 
              subtasks: true, 
              comments: true, 
              attachments: true, 
              timeEntries: true 
            }
          }
        }
      }),
      prisma.task.count({ where })
    ])

    const totalPages = Math.ceil(totalCount / filters.limit)
    const hasNextPage = filters.page < totalPages
    const hasPrevPage = filters.page > 1

    return NextResponse.json({
      tasks,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        totalCount,
        totalPages,
        hasNextPage,
        hasPrevPage
      },
      filters: filters
    })

  } catch (error: any) {
    console.error('Get tasks error:', error)
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid filter parameters', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}



export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createTaskSchema.parse(body)

    // Validate project access if projectId is provided
    if (validatedData.projectId) {
      const project = await prisma.project.findFirst({
        where: {
          id: validatedData.projectId,
          workspace: {
            members: { some: { userId } }
          }
        }
      })
      if (!project) {
        return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 })
      }
    }

    // Validate assignee exists if provided
    if (validatedData.assigneeId) {
      const assignee = await prisma.user.findUnique({
        where: { id: validatedData.assigneeId }
      })
      if (!assignee) {
        return NextResponse.json({ error: 'Assignee not found' }, { status: 404 })
      }
    }

    // Create task
    const task = await prisma.task.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        status: validatedData.status,
        priority: validatedData.priority,
        startDate: validatedData.startDate ? new Date(validatedData.startDate) : null,
        dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
        estimatedHours: validatedData.estimatedHours,
        position: validatedData.position,
        creatorId: userId,
        assigneeId: validatedData.assigneeId,
        projectId: validatedData.projectId,
        milestoneId: validatedData.milestoneId,
        parentId: validatedData.parentId,
      },
      include: {
        creator: { select: { id: true, name: true, email: true, avatar: true } },
        assignee: { select: { id: true, name: true, email: true, avatar: true } },
        project: { select: { id: true, name: true, color: true } },
        milestone: { select: { id: true, title: true, dueDate: true } },
        tags: { include: { tag: { select: { id: true, name: true, color: true } } } }
      }
    })

    // Add tags if provided
    if (validatedData.tags && validatedData.tags.length > 0) {
      const tagConnections = validatedData.tags.map(tagId => ({
        taskId: task.id,
        tagId: tagId
      }))
      await prisma.taskTag.createMany({
        data: tagConnections,
        skipDuplicates: true
      })
    }

    return NextResponse.json({
      message: 'Task created successfully',
      task
    }, { status: 201 })

  } catch (error: any) {
    console.error('Create task error:', error)
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
