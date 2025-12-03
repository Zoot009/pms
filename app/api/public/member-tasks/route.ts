import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { TaskStatus } from '@/lib/generated/prisma'

/**
 * Public API endpoint to fetch tasks completed by each member
 * Supports date range filtering or till-date queries
 * 
 * Query Parameters:
 * - date: Specific date (YYYY-MM-DD) - returns tasks completed on that date
 * - startDate: Start date (YYYY-MM-DD) - returns tasks from this date onwards
 * - endDate: End date (YYYY-MM-DD) - returns tasks up to this date
 * - tillDate: Date (YYYY-MM-DD) - returns all tasks completed up to and including this date
 * 
 * If no parameters provided, returns all completed tasks till current date
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const specificDate = searchParams.get('date')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const tillDate = searchParams.get('tillDate')

    // Build date filter for completedAt field
    const dateFilter: any = {}
    
    if (specificDate) {
      // Query for a specific date
      const date = new Date(specificDate)
      const nextDay = new Date(date)
      nextDay.setDate(date.getDate() + 1)
      
      dateFilter.gte = date
      dateFilter.lt = nextDay
    } else if (tillDate) {
      // Query for all tasks till a specific date (inclusive)
      const endOfDay = new Date(tillDate)
      endOfDay.setHours(23, 59, 59, 999)
      dateFilter.lte = endOfDay
    } else {
      // Use startDate and/or endDate
      if (startDate) {
        dateFilter.gte = new Date(startDate)
      }
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        dateFilter.lte = end
      }
    }

    // If no date filters specified, default to till current date
    if (Object.keys(dateFilter).length === 0) {
      const now = new Date()
      now.setHours(23, 59, 59, 999)
      dateFilter.lte = now
    }

    // Fetch completed service tasks
    const serviceTasks = await prisma.task.findMany({
      where: {
        status: TaskStatus.COMPLETED,
        completedAt: dateFilter,
        assignedTo: { not: null },
      },
      include: {
        assignedUser: {
          select: {
            id: true,
            displayName: true,
            email: true,
            employeeId: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
            customerName: true,
          },
        },
      },
      orderBy: {
        completedAt: 'desc',
      },
    })

    // Fetch completed asking tasks
    const askingTasks = await prisma.askingTask.findMany({
      where: {
        completedAt: dateFilter,
        assignedTo: { not: null },
      },
      include: {
        assignedUser: {
          select: {
            id: true,
            displayName: true,
            email: true,
            employeeId: true,
          },
        },
        completedUser: {
          select: {
            id: true,
            displayName: true,
            email: true,
            employeeId: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
            customerName: true,
          },
        },
      },
      orderBy: {
        completedAt: 'desc',
      },
    })

    // Group tasks by member
    const memberTasksMap = new Map<string, {
      member: {
        id: string
        displayName: string | null
        email: string
        employeeId: string | null
      }
      serviceTasks: {
        id: string
        title: string
        orderId: string
        orderNumber: string
        customerName: string | null
        serviceName: string
        serviceType: string
        teamName: string
        completedAt: Date | null
        deadline: Date | null
      }[]
      askingTasks: {
        id: string
        title: string
        orderId: string
        orderNumber: string
        customerName: string | null
        serviceName: string
        serviceType: string
        teamName: string
        currentStage: string
        completedAt: Date | null
        completedBy: string | null
        completedByName: string | null
        deadline: Date | null
      }[]
      totalTasks: number
    }>()

    // Process service tasks
    for (const task of serviceTasks) {
      if (!task.assignedUser) continue

      const userId = task.assignedUser.id
      
      if (!memberTasksMap.has(userId)) {
        memberTasksMap.set(userId, {
          member: {
            id: task.assignedUser.id,
            displayName: task.assignedUser.displayName,
            email: task.assignedUser.email,
            employeeId: task.assignedUser.employeeId,
          },
          serviceTasks: [],
          askingTasks: [],
          totalTasks: 0,
        })
      }

      const memberData = memberTasksMap.get(userId)!
      memberData.serviceTasks.push({
        id: task.id,
        title: task.title,
        orderId: task.orderId,
        orderNumber: task.order.orderNumber,
        customerName: task.order.customerName,
        serviceName: task.service?.name || 'Unknown Service',
        serviceType: task.service?.type || 'SERVICE_TASK',
        teamName: task.team.name,
        completedAt: task.completedAt,
        deadline: task.deadline,
      })
      memberData.totalTasks++
    }

    // Process asking tasks
    for (const task of askingTasks) {
      if (!task.assignedUser) continue

      const userId = task.assignedUser.id
      
      if (!memberTasksMap.has(userId)) {
        memberTasksMap.set(userId, {
          member: {
            id: task.assignedUser.id,
            displayName: task.assignedUser.displayName,
            email: task.assignedUser.email,
            employeeId: task.assignedUser.employeeId,
          },
          serviceTasks: [],
          askingTasks: [],
          totalTasks: 0,
        })
      }

      const memberData = memberTasksMap.get(userId)!
      memberData.askingTasks.push({
        id: task.id,
        title: task.title,
        orderId: task.orderId,
        orderNumber: task.order.orderNumber,
        customerName: task.order.customerName,
        serviceName: task.service.name,
        serviceType: task.service.type,
        teamName: task.team.name,
        currentStage: task.currentStage,
        completedAt: task.completedAt,
        completedBy: task.completedBy,
        completedByName: task.completedUser?.displayName || null,
        deadline: task.deadline,
      })
      memberData.totalTasks++
    }

    // Convert map to array and sort by total tasks
    const memberTasksArray = Array.from(memberTasksMap.values()).sort(
      (a, b) => b.totalTasks - a.totalTasks
    )

    // Calculate summary statistics
    const summary = {
      totalMembers: memberTasksArray.length,
      totalServiceTasks: serviceTasks.length,
      totalAskingTasks: askingTasks.length,
      totalTasks: serviceTasks.length + askingTasks.length,
      dateRange: {
        specificDate: specificDate || null,
        startDate: startDate || null,
        endDate: endDate || null,
        tillDate: tillDate || null,
      },
    }

    return NextResponse.json({
      success: true,
      summary,
      data: memberTasksArray,
    })

  } catch (error) {
    console.error('[Public API] Error fetching member tasks:', error)
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to fetch member tasks',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
