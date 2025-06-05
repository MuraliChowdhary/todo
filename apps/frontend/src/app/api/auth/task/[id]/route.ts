// src/app/api/tasks/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { updateTaskSchema } from '@/lib/task-validations'

// GET /api/tasks/[id] - Get single task
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const task = await prisma.task.findFirst({
      where: {
        id: params.id,
        OR: [
          { creatorId: userId },
          { assigneeId: userId },
          { project: { workspace: { members: { some: { userId } } } } }
        ]
      },
      include: {
        creator: { select: { id: true, name: true, email: true, avatar: true } },
        assignee: { select: { id: true, name: true, email: true, avatar: true } },
        project: { 
          select: { 
            id: true, name: true, color: true, 
            workspace: { select: { id: true, name: true } } 
          } 
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
          select: { 
            id: true, title: true, status: true, priority: true, 
            assignee: { select: { id: true, name: true, avatar: true } }
          },
          orderBy: { position: 'asc' }
        },
        comments: {
          select: {
            id: true, content: true, createdAt: true,
            author: { select: { id: true, name: true, avatar: true } }
          },
          orderBy: { createdAt: 'desc' }
        },
        attachments: {
          select: { id: true, filename: true, originalName: true, size: true, url: true, createdAt: true }
        },
        timeEntries: {
          select: {
            id: true, description: true, startTime: true, endTime: true, duration: true,
            user: { select: { id: true, name: true, avatar: true } }
          },
          orderBy: { startTime: 'desc' }
        },
        dependencies: {
          include: {
            blockingTask: { select: { id: true, title: true, status: true } }
          }
        },
        dependents: {
          include: {
            dependentTask: { select: { id: true, title: true, status: true } }
          }
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
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    return NextResponse.json({ task })

  } catch (error) {
    console.error('Get task error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/tasks/[id] - Update task
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updateTaskSchema.parse(body)

    // Check if task exists and user has access
    const existingTask = await prisma.task.findFirst({
      where: {
        id: params.id,
        OR: [
          { creatorId: userId },
          { assigneeId: userId },
          { project: { workspace: { members: { some: { userId } } } } }
        ]
      }
    })

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Handle completion
    const updateData: any = { ...validatedData }
    if (validatedData.status === 'done' && existingTask.status !== 'done') {
      updateData.completedAt = new Date()
      updateData.actualHours = await calculateActualHours(params.id)
    } else if (validatedData.status !== 'done' && existingTask.status === 'done') {
      updateData.completedAt = null
    }

    // Convert date strings to Date objects
    if (validatedData.startDate) updateData.startDate = new Date(validatedData.startDate)
    if (validatedData.dueDate) updateData.dueDate = new Date(validatedData.dueDate)

    const task = await prisma.task.update({
      where: { id: params.id },
      data: updateData,
      include: {
        creator: { select: { id: true, name: true, email: true, avatar: true } },
        assignee: { select: { id: true, name: true, email: true, avatar: true } },
        project: { select: { id: true, name: true, color: true } },
        milestone: { select: { id: true, title: true, dueDate: true } },
        tags: { include: { tag: { select: { id: true, name: true, color: true } } } }
      }
    })

    return NextResponse.json({
      message: 'Task updated successfully',
      task
    })

  } catch (error: any) {
    console.error('Update task error:', error)
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/tasks/[id] - Delete task
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const task = await prisma.task.findFirst({
      where: {
        id: params.id,
        creatorId: userId // Only creator can delete
      }
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found or access denied' }, { status: 404 })
    }

    await prisma.task.delete({
      where: { id: params.id }
    })

    return NextResponse.json({
      message: 'Task deleted successfully'
    })

  } catch (error) {
    console.error('Delete task error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


async function calculateActualHours(taskId: string): Promise<number> {
  const timeEntries = await prisma.timeEntry.findMany({
    where: { taskId },
    select: { duration: true }
  })
  
  const totalSeconds = timeEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0)
  return totalSeconds / 3600 // Convert to hours
}
