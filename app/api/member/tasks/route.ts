import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const statusFilter = searchParams.get('status') || 'all' // all, active, paused, completed
    const priorityFilter = searchParams.get('priority') || 'all' // all, high, medium, low, urgent
    const sortBy = searchParams.get('sortBy') || 'default' // default, deadline, priority, orderDate, status

    // Build where clause
    const where: any = {
      assignedTo: user.id,
    }

    // Status filter
    if (statusFilter === 'active') {
      where.status = {
        in: ['ASSIGNED', 'IN_PROGRESS'],
      }
    } else if (statusFilter === 'paused') {
      where.status = 'PAUSED'
    } else if (statusFilter === 'completed') {
      where.status = 'COMPLETED'
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      where.priority = priorityFilter.toUpperCase()
    }

    // Build orderBy clause
    let orderBy: any = { createdAt: 'desc' } // default

    if (sortBy === 'deadline') {
      orderBy = { deadline: 'asc' }
    } else if (sortBy === 'priority') {
      orderBy = { priority: 'desc' }
    } else if (sortBy === 'status') {
      orderBy = { status: 'asc' }
    }

    // Fetch tasks
    const tasks = await prisma.task.findMany({
      where,
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            customerName: true,
            deliveryDate: true,
            orderDate: true,
            amount: true,
            folderLink: true,
            orderType: {
              select: {
                name: true,
              },
            },
          },
        },
        service: {
          select: {
            name: true,
            type: true,
            timeLimit: true,
            requiresCompletionNote: true,
          },
        },
      },
      orderBy,
    })

    // Fetch asking tasks for completed status
    let askingTasks: any[] = []
    if (statusFilter === 'completed') {
      askingTasks = await prisma.askingTask.findMany({
        where: {
          completedBy: user.id,
        },
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              customerName: true,
              deliveryDate: true,
              orderDate: true,
              amount: true,
              folderLink: true,
              orderType: {
                select: {
                  name: true,
                },
              },
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
    }

    // Group tasks by order
    const ordersMap = new Map()
    
    tasks.forEach((task) => {
      if (!ordersMap.has(task.orderId)) {
        ordersMap.set(task.orderId, {
          orderId: task.order.id,
          orderNumber: task.order.orderNumber,
          customerName: task.order.customerName,
          deliveryDate: task.order.deliveryDate,
          orderDate: task.order.orderDate,
          amount: task.order.amount,
          folderLink: task.order.folderLink,
          orderTypeName: task.order.orderType.name,
          tasks: [],
        })
      }
      
      ordersMap.get(task.orderId).tasks.push({
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        deadline: task.deadline,
        startedAt: task.startedAt,
        completedAt: task.completedAt,
        notes: task.notes,
        serviceName: task.service?.name || 'Custom Task',
        serviceType: task.service?.type || 'CUSTOM',
        serviceTimeLimit: task.service?.timeLimit || null,
        service: task.service ? {
          name: task.service.name,
          type: task.service.type,
          timeLimit: task.service.timeLimit,
          requiresCompletionNote: task.service.requiresCompletionNote,
        } : undefined,
        createdAt: task.createdAt,
      })
    })

    // Add asking tasks to the orders map (for completed status)
    askingTasks.forEach((askingTask) => {
      if (!ordersMap.has(askingTask.orderId)) {
        ordersMap.set(askingTask.orderId, {
          orderId: askingTask.order.id,
          orderNumber: askingTask.order.orderNumber,
          customerName: askingTask.order.customerName,
          deliveryDate: askingTask.order.deliveryDate,
          orderDate: askingTask.order.orderDate,
          amount: askingTask.order.amount,
          folderLink: askingTask.order.folderLink,
          orderTypeName: askingTask.order.orderType.name,
          tasks: [],
        })
      }
      
      ordersMap.get(askingTask.orderId).tasks.push({
        id: askingTask.id,
        title: askingTask.title,
        status: 'COMPLETED',
        priority: askingTask.priority,
        deadline: askingTask.deadline,
        completedAt: askingTask.completedAt,
        notes: askingTask.notes,
        serviceName: askingTask.service?.name || 'Asking Service',
        serviceType: 'ASKING_SERVICE',
        serviceTimeLimit: null,
        createdAt: askingTask.createdAt,
        isAskingTask: true,
      })
    })

    const ordersWithTasks = Array.from(ordersMap.values())

    // Sort by order date if needed
    if (sortBy === 'orderDate') {
      ordersWithTasks.sort((a, b) => 
        new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()
      )
    }

    return NextResponse.json({ orders: ordersWithTasks })
  } catch (error) {
    console.error('Error fetching member tasks:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
