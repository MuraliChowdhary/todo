import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const timeRange = searchParams.get('timeRange') || '30' // days

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - parseInt(timeRange))

    // Base where clause with proper type handling
    const baseWhere = {
      OR: [
        { creatorId: userId },
        { assigneeId: userId },
        {
          project: {
            workspace: {
              members: {
                some: { userId }
              }
            }
          }
        }
      ],
      ...(projectId ? { projectId } : {})
    }

    const [
      totalTasks,
      tasksByStatus,
      tasksByPriority,
      overdueTasks,
      completedInPeriod,
      upcomingTasks,
      averageCompletionTime
    ] = await Promise.all([
      // Total tasks
      prisma.task.count({ where: baseWhere }),
      
      // Tasks by status
      prisma.task.groupBy({
        by: ['status'],
        where: baseWhere,
        _count: true
      }),
      
      // Tasks by priority
      prisma.task.groupBy({
        by: ['priority'],
        where: baseWhere,
        _count: true
      }),
      
      // Overdue tasks
      prisma.task.count({
        where: {
          ...baseWhere,
          dueDate: { lt: new Date() },
          status: { notIn: ['done', 'canceled'] }
        }
      }),
      
      // Completed tasks in time range
      prisma.task.count({
        where: {
          ...baseWhere,
          status: 'done',
          completedAt: { gte: startDate }
        }
      }),
      
      // Upcoming tasks
      prisma.task.count({
        where: {
          ...baseWhere,
          dueDate: {
            gte: new Date(),
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          },
          status: { notIn: ['done', 'canceled'] }
        }
      }),

      // Average completion time
      prisma.task.findMany({
        where: {
          ...baseWhere,
          status: 'done',
          completedAt: { not: null },
          createdAt: { gte: startDate }
        },
        select: {
          createdAt: true,
          completedAt: true
        }
      })
    ])

    // Calculate average completion time in days
    const avgCompletionDays = averageCompletionTime
      .filter(task => task.completedAt)
      .reduce((acc, task) => {
        const diff = task.completedAt!.getTime() - task.createdAt.getTime()
        return acc + (diff / (1000 * 60 * 60 * 24))
      }, 0) / (averageCompletionTime.length || 1)

    const stats = {
      totalTasks,
      tasksByStatus: tasksByStatus.reduce((acc, item) => ({
        ...acc,
        [item.status]: item._count
      }), {} as Record<string, number>),
      tasksByPriority: tasksByPriority.reduce((acc, item) => ({
        ...acc,
        [item.priority]: item._count
      }), {} as Record<string, number>),
      overdueTasks,
      completedInPeriod,
      upcomingTasks,
      averageCompletionDays: parseFloat(avgCompletionDays.toFixed(1)),
      completionRate: totalTasks > 0
        ? ((completedInPeriod / totalTasks) * 100).toFixed(1)
        : '0'
    }

    return NextResponse.json({ stats })

  } catch (error) {
    console.error('Get stats error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}