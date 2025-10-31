import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { OrderStatus } from '@/lib/generated/prisma'

// GET /api/orders/delivered - Get all delivered orders
export async function GET() {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const orders = await prisma.order.findMany({
      where: {
        status: OrderStatus.COMPLETED,
      },
      include: {
        orderType: {
          select: {
            id: true,
            name: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
        tasks: {
          include: {
            service: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
            assignedUser: {
              select: {
                id: true,
                displayName: true,
                email: true,
              },
            },
          },
        },
        askingTasks: {
          include: {
            service: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
            assignedUser: {
              select: {
                id: true,
                displayName: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { completedAt: 'desc' },
    })

    // Calculate statistics for each order
    const ordersWithStats = orders.map((order) => {
      try {
        const tasks = order.tasks || []
        const askingTasks = order.askingTasks || []
        const allTasks: any[] = [...tasks, ...askingTasks]
        
        const totalTasks = allTasks.length
        const completedTasks = allTasks.filter((t: any) => 
          t.completedAt !== null && t.completedAt !== undefined
        ).length

        const serviceTasks = tasks.length
        const askingTasksCount = askingTasks.length

        // Both tasks and asking tasks can have isMandatory field
        const mandatoryTasks = tasks.filter((t: any) => t.isMandatory === true)
        const mandatoryAskingTasks = askingTasks.filter((t: any) => t.isMandatory === true)
        const allMandatoryTasks = [...mandatoryTasks, ...mandatoryAskingTasks]
        const mandatoryCompleted = allMandatoryTasks.filter((t: any) => t.completedAt).length
        const mandatoryRemaining = allMandatoryTasks.length - mandatoryCompleted
        const incompleteMandatoryTasks = allMandatoryTasks.filter((t: any) => !t.completedAt).length

        return {
          ...order,
          statistics: {
            totalTasks,
            completedTasks,
            serviceTasks,
            askingTasks: askingTasksCount,
            mandatoryTasks: allMandatoryTasks.length,
            mandatoryCompleted,
            mandatoryRemaining,
            incompleteMandatoryTasks,
          },
        }
      } catch (err) {
        console.error(`Error calculating stats for order ${order.id}:`, err)
        return {
          ...order,
          statistics: {
            totalTasks: 0,
            completedTasks: 0,
            serviceTasks: 0,
            askingTasks: 0,
            mandatoryTasks: 0,
            mandatoryCompleted: 0,
            mandatoryRemaining: 0,
            incompleteMandatoryTasks: 0,
          },
        }
      }
    })

    return NextResponse.json({ 
      orders: ordersWithStats,
    })
  } catch (error) {
    console.error('Error fetching delivered orders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch delivered orders' },
      { status: 500 }
    )
  }
}
