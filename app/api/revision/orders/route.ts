import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { UserRole } from '@/lib/generated/prisma'
import { getCurrentUser } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    })

    if (!dbUser || (dbUser.role !== UserRole.REVISION_MANAGER && dbUser.role !== UserRole.ADMIN)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get query parameter 'type'
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'delivered', 'revision', or 'completed'

    let orders

    if (type === 'delivered') {
      // Get all delivered orders (COMPLETED, not revision orders)
      orders = await prisma.order.findMany({
        where: {
          status: 'COMPLETED',
          isRevision: false,
        },
        include: {
          orderType: {
            select: {
              id: true,
              name: true,
            },
          },
          tasks: {
            select: {
              id: true,
              title: true,
              status: true,
              completedAt: true,
              isMandatory: true,
              service: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                },
              },
            },
          },
          askingTasks: {
            select: {
              id: true,
              currentStage: true,
              completedAt: true,
              isMandatory: true,
              service: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                },
              },
            },
          },
        },
        orderBy: {
          completedAt: 'desc',
        },
      })

      // Calculate statistics for each order
      const ordersWithStats = orders.map(order => {
        const totalTasks = order.tasks.length + order.askingTasks.length
        const completedTasks = order.tasks.filter(t => t.status === 'COMPLETED').length +
          order.askingTasks.filter(t => t.completedAt).length

        const serviceTasks = order.tasks.length
        const askingTasks = order.askingTasks.length

        const mandatoryTasks = order.tasks.filter(t => t.isMandatory).length +
          order.askingTasks.filter(t => t.isMandatory).length

        const mandatoryCompleted = order.tasks.filter(t => t.isMandatory && t.status === 'COMPLETED').length +
          order.askingTasks.filter(t => t.isMandatory && t.completedAt).length

        const incompleteMandatoryTasks = mandatoryTasks - mandatoryCompleted

        // Add title for asking tasks
        const askingTasksWithTitle = order.askingTasks.map(task => ({
          ...task,
          title: `${task.service.name} - ${task.currentStage}`,
        }))

        return {
          ...order,
          askingTasks: askingTasksWithTitle,
          statistics: {
            totalTasks,
            completedTasks,
            serviceTasks,
            askingTasks,
            mandatoryTasks,
            mandatoryCompleted,
            incompleteMandatoryTasks,
          },
        }
      })

      return NextResponse.json({ orders: ordersWithStats })

    } else if (type === 'revision') {
      // Get all active revision orders (isRevision=true, revisionCompletedAt=null)
      orders = await prisma.order.findMany({
        where: {
          isRevision: true,
          revisionCompletedAt: null,
        },
        include: {
          orderType: {
            select: {
              id: true,
              name: true,
            },
          },
          originalOrder: {
            select: {
              id: true,
              orderNumber: true,
              completedAt: true,
            },
          },
          tasks: {
            where: {
              isRevisionTask: true,
            },
            include: {
              team: {
                select: {
                  id: true,
                  name: true,
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
            orderBy: {
              createdAt: 'desc',
            },
          },
          _count: {
            select: {
              tasks: true,
            },
          },
        },
        orderBy: {
          orderDate: 'desc',
        },
      })

      return NextResponse.json({ orders })

    } else if (type === 'completed') {
      // Get all completed revision orders (isRevision=true, revisionCompletedAt != null)
      orders = await prisma.order.findMany({
        where: {
          isRevision: true,
          revisionCompletedAt: {
            not: null,
          },
        },
        include: {
          orderType: {
            select: {
              id: true,
              name: true,
            },
          },
          originalOrder: {
            select: {
              id: true,
              orderNumber: true,
              completedAt: true,
            },
          },
          _count: {
            select: {
              tasks: true,
            },
          },
        },
        orderBy: {
          revisionCompletedAt: 'desc',
        },
      })

      return NextResponse.json({ orders })

    } else {
      return NextResponse.json({ error: 'Invalid type parameter. Use: delivered, revision, or completed' }, { status: 400 })
    }

  } catch (error) {
    console.error('Error fetching revision orders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch revision orders' },
      { status: 500 }
    )
  }
}
