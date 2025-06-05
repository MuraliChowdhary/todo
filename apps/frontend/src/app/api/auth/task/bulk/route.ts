import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { bulkUpdateSchema } from '../../../../lib/task-validations'

// PUT /api/tasks/bulk - Bulk update tasks
export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { taskIds, updates } = bulkUpdateSchema.parse(body)

    // Verify user has access to all tasks
    const accessibleTasks = await prisma.task.findMany({
      where: {
        id: { in: taskIds },
        OR: [
          { creatorId: userId },
          { assigneeId: userId },
          { project: { workspace: { members: { some: { userId } } } } }
        ]
      },
      select: { id: true }
    })

    if (accessibleTasks.length !== taskIds.length) {
      return NextResponse.json({ error: 'Some tasks not found or access denied' }, { status: 403 })
    }

    // Perform bulk update
    const result = await prisma.task.updateMany({
      where: { id: { in: taskIds } },
      data: updates
    })

    return NextResponse.json({
      message: `${result.count} tasks updated successfully`,
      updatedCount: result.count
    })

  } catch (error: any) {
    console.error('Bulk update error:', error)
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}