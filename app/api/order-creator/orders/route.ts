import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      console.error('No user found in session')
      return NextResponse.json({ error: 'Unauthorized - Please log in' }, { status: 401 })
    }

    if (user.role !== 'ORDER_CREATOR') {
      console.error(`User ${user.email} has role ${user.role}, expected ORDER_CREATOR`)
      return NextResponse.json({ 
        error: 'Unauthorized - You do not have permission to access this resource',
        requiredRole: 'ORDER_CREATOR',
        currentRole: user.role
      }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'ALL'
    const search = searchParams.get('search') || ''

    // Build where condition
    const whereCondition: any = {}

    // Status filter - exclude COMPLETED orders for delivery page
    if (status !== 'ALL') {
      whereCondition.status = status
    } else {
      // When status is ALL, exclude COMPLETED orders (show only deliverable orders)
      whereCondition.status = {
        not: 'COMPLETED'
      }
    }

    // Search filter
    if (search) {
      whereCondition.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerEmail: { contains: search, mode: 'insensitive' } },
      ]
    }

    const orders = await prisma.order.findMany({
      where: whereCondition,
      include: {
        orderType: {
          select: {
            id: true,
            name: true,
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
      orderBy: [
        { orderDate: 'desc' },
      ],
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
        const unassignedTasks = tasks.filter((t: any) => t.status === 'NOT_ASSIGNED').length
        const overdueTasks = allTasks.filter((t: any) => {
          if (t.completedAt) return false
          if (!t.deadline) return false
          return new Date(t.deadline) < new Date()
        }).length

        // Both tasks and asking tasks can have isMandatory field
        const mandatoryTasks = tasks.filter((t: any) => t.isMandatory === true)
        const mandatoryAskingTasks = askingTasks.filter((t: any) => t.isMandatory === true)
        const allMandatoryTasks = [...mandatoryTasks, ...mandatoryAskingTasks]
        const mandatoryCompleted = allMandatoryTasks.filter((t: any) => t.completedAt).length
        const mandatoryRemaining = allMandatoryTasks.length - mandatoryCompleted

        const createdAt = new Date(order.createdAt)
        const now = new Date()
        const daysOld = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))

        return {
          ...order,
          statistics: {
            totalTasks,
            completedTasks,
            unassignedTasks,
            overdueTasks,
            mandatoryTasks: allMandatoryTasks.length,
            mandatoryCompleted,
            mandatoryRemaining,
            daysOld,
          },
        }
      } catch (err) {
        console.error(`Error calculating stats for order ${order.id}:`, err)
        return {
          ...order,
          statistics: {
            totalTasks: 0,
            completedTasks: 0,
            unassignedTasks: 0,
            overdueTasks: 0,
            mandatoryTasks: 0,
            mandatoryCompleted: 0,
            mandatoryRemaining: 0,
            daysOld: 0,
          },
        }
      }
    })

    return NextResponse.json({ orders: ordersWithStats })
  } catch (error) {
    console.error('Error fetching order creator orders:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch orders',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
