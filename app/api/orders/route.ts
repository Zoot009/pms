import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'

// GET /api/orders - List orders accessible to all authenticated users
export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')
    const status = searchParams.get('status')
    const deliveryDate = searchParams.get('deliveryDate')
    const assignedToMe = searchParams.get('assignedToMe') === 'true'

    const whereCondition: any = {}

    // Members can only see orders they're assigned to (unless viewing all)
    if (currentUser.role === 'MEMBER' && assignedToMe) {
      whereCondition.OR = [
        { tasks: { some: { assignedTo: currentUser.id } } },
        { askingTasks: { some: { assignedTo: currentUser.id } } },
      ]
    }

    if (search) {
      whereCondition.AND = whereCondition.AND || []
      whereCondition.AND.push({
        OR: [
          { orderNumber: { contains: search, mode: 'insensitive' } },
          { customerName: { contains: search, mode: 'insensitive' } },
          { customerEmail: { contains: search, mode: 'insensitive' } },
        ],
      })
    }

    if (status && status !== 'ALL') {
      whereCondition.status = status
    }

    if (deliveryDate) {
      const startOfDay = new Date(deliveryDate)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(deliveryDate)
      endOfDay.setHours(23, 59, 59, 999)

      whereCondition.deliveryDate = {
        gte: startOfDay,
        lte: endOfDay,
      }
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
      orderBy: [{ deliveryDate: 'asc' }, { createdAt: 'desc' }],
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

        // Only asking tasks have isMandatory field
        const mandatoryAskingTasks = askingTasks.filter((t: any) => t.isMandatory === true)
        const mandatoryCompleted = mandatoryAskingTasks.filter((t: any) => t.completedAt).length
        const mandatoryRemaining = mandatoryAskingTasks.length - mandatoryCompleted

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
            mandatoryTasks: mandatoryAskingTasks.length,
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

    // Group by delivery date
    const groupedOrders: Record<string, typeof ordersWithStats> = {}
    ordersWithStats.forEach((order) => {
      const dateKey = order.deliveryDate 
        ? new Date(order.deliveryDate).toISOString().split('T')[0]
        : 'no-date'
      
      if (!groupedOrders[dateKey]) {
        groupedOrders[dateKey] = []
      }
      groupedOrders[dateKey].push(order)
    })

    return NextResponse.json({ 
      orders: ordersWithStats,
      groupedByDate: groupedOrders,
    })
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}
