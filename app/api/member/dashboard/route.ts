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

    // Get all tasks assigned to this member (including all instances of the same service)
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
        orderService: {
          select: {
            id: true,
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

    // Get all asking tasks completed by this member (including all instances)
    const completedAskingTasks = await prisma.askingTask.findMany({
      where: {
        completedBy: user.id,
      },
      include: {
        order: {
          select: {
            orderNumber: true,
            customerName: true,
            deliveryDate: true,
          },
        },
        orderService: {
          select: {
            id: true,
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
        completedAt: 'desc',
      },
    })

    // Calculate statistics - each task instance is counted separately
    const completedTasksToday = allTasks.filter(
      (t) => t.status === 'COMPLETED' && t.completedAt && t.completedAt >= startOfToday
    )
    const completedAskingTasksToday = completedAskingTasks.filter(
      (t) => t.completedAt && t.completedAt >= startOfToday
    )
    
    const completedTodayCount = completedTasksToday.length + completedAskingTasksToday.length

    // Log for debugging (can be removed in production)
    console.log(`[Dashboard Stats] User: ${user.id}`)
    console.log(`  Total tasks: ${allTasks.length}`)
    console.log(`  Completed today (tasks): ${completedTasksToday.length}`)
    console.log(`  Completed today (asking): ${completedAskingTasksToday.length}`)
    console.log(`  Total completed today: ${completedTodayCount}`)
    
    // Log details of completed tasks today for verification
    if (completedTasksToday.length > 0) {
      console.log('  Completed tasks today details:')
      completedTasksToday.forEach(t => {
        console.log(`    - ${t.id} | ${t.title} | OrderService: ${t.orderServiceId || 'N/A'} | Order: ${t.order.orderNumber}`)
      })
    }
    
    if (completedAskingTasksToday.length > 0) {
      console.log('  Completed asking tasks today details:')
      completedAskingTasksToday.forEach(t => {
        console.log(`    - ${t.id} | ${t.title} | OrderService: ${t.orderServiceId || 'N/A'} | Order: ${t.order.orderNumber}`)
      })
    }

    const stats = {
      totalTasks: allTasks.length,
      assignedCount: allTasks.filter((t) => t.status === 'ASSIGNED').length,
      inProgressCount: allTasks.filter((t) => t.status === 'IN_PROGRESS').length,
      pausedCount: allTasks.filter((t) => t.status === 'PAUSED').length,
      completedTodayCount,
      completedTotal: allTasks.filter((t) => t.status === 'COMPLETED').length + completedAskingTasks.length,
      overdueCount: allTasks.filter(
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
      serviceName: task.service?.name || 'Custom Task',
      serviceType: task.service?.type || 'CUSTOM',
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
        serviceName: task.service?.name || 'Custom Task',
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
