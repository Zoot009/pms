import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    // Get all tasks assigned to this member
    const allTasks = await prisma.task.findMany({
      where: {
        assignedTo: user.id,
      },
      include: {
        order: {
          select: {
            orderNumber: true,
            customerName: true,
            deliveryDate: true,
          },
        },
        service: {
          select: {
            name: true,
            type: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Calculate statistics
    const stats = {
      totalTasks: allTasks.length,
      notStarted: allTasks.filter((t) => t.status === 'ASSIGNED').length,
      pendingTasks: allTasks.filter((t) => t.status === 'NOT_ASSIGNED').length,
      inProgress: allTasks.filter((t) => t.status === 'IN_PROGRESS').length,
      completedToday: allTasks.filter(
        (t) => t.status === 'COMPLETED' && t.completedAt && t.completedAt >= startOfToday
      ).length,
      completedTotal: allTasks.filter((t) => t.status === 'COMPLETED').length,
      overdue: allTasks.filter(
        (t) =>
          t.status !== 'COMPLETED' && t.deadline && new Date(t.deadline) < now
      ).length,
    }

    // Calculate average completion time
    const completedTasksWithTime = allTasks.filter(
      (t) => t.status === 'COMPLETED' && t.startedAt && t.completedAt
    )

    let averageCompletionTime = 0
    if (completedTasksWithTime.length > 0) {
      const totalTime = completedTasksWithTime.reduce((sum, task) => {
        if (task.startedAt && task.completedAt) {
          return sum + (task.completedAt.getTime() - task.startedAt.getTime())
        }
        return sum
      }, 0)
      averageCompletionTime = Math.round(totalTime / completedTasksWithTime.length / (1000 * 60 * 60)) // in hours
    }

    // Get recent tasks (last 5)
    const recentTasks = allTasks.slice(0, 5).map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      deadline: task.deadline,
      orderNumber: task.order.orderNumber,
      customerName: task.order.customerName,
      serviceName: task.service.name,
      serviceType: task.service.type,
      createdAt: task.createdAt,
    }))

    // Get upcoming deadlines (next 7 days)
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const upcomingDeadlines = allTasks
      .filter(
        (t) =>
          t.status !== 'COMPLETED' &&
          t.deadline &&
          new Date(t.deadline) >= now &&
          new Date(t.deadline) <= weekFromNow
      )
      .sort((a, b) => {
        if (!a.deadline || !b.deadline) return 0
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
      })
      .slice(0, 5)
      .map((task) => ({
        id: task.id,
        title: task.title,
        deadline: task.deadline,
        priority: task.priority,
        orderNumber: task.order.orderNumber,
        serviceName: task.service.name,
      }))

    return NextResponse.json({
      stats: {
        ...stats,
        averageCompletionTimeHours: averageCompletionTime,
      },
      recentTasks,
      upcomingDeadlines,
    })
  } catch (error) {
    console.error('Error fetching member dashboard:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
