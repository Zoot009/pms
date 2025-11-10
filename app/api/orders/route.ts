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
    const daysLeft = searchParams.get('daysLeft')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

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
    // If status is 'ALL', show all orders (no status filter applied)

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

    // Filter by days left until delivery
    if (daysLeft) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      if (daysLeft === 'today') {
        // Due today
        const endOfToday = new Date(today)
        endOfToday.setHours(23, 59, 59, 999)
        
        whereCondition.deliveryDate = {
          gte: today,
          lte: endOfToday,
        }
      } else if (daysLeft === 'new') {
        // Orders created recently (e.g., within last 24 hours)
        const last24Hours = new Date()
        last24Hours.setHours(last24Hours.getHours() - 24)
        
        whereCondition.createdAt = {
          gte: last24Hours,
        }
      } else {
        // Specific days left (1-7)
        const daysNumber = parseInt(daysLeft, 10)
        if (!isNaN(daysNumber) && daysNumber > 0) {
          const targetDate = new Date(today)
          targetDate.setDate(targetDate.getDate() + daysNumber)
          targetDate.setHours(0, 0, 0, 0)
          
          const endOfTargetDate = new Date(targetDate)
          endOfTargetDate.setHours(23, 59, 59, 999)
          
          whereCondition.deliveryDate = {
            gte: targetDate,
            lte: endOfTargetDate,
          }
        }
      }
    }

    // Get total count for pagination
    const totalCount = await prisma.order.count({
      where: whereCondition,
    })

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
      skip: (page - 1) * limit,
      take: limit,
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
      hasMore: (page * limit) < totalCount,
      totalCount,
      page,
      limit,
    })
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}
