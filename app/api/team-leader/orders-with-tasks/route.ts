import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('orderId')
    const completedAskingServices = searchParams.get('completedAskingServices')
    
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // Get teams where user is team leader
    const teams = await prisma.team.findMany({
      where: {
        leaderId: user.id,
      },
      include: {
        members: true,
      },
    })

    if (teams.length === 0) {
      return NextResponse.json(
        { message: 'You are not a team leader of any team' },
        { status: 403 }
      )
    }

    // Get all orders with tasks for services that belong to the team leader's teams
    // Exclude delivered (COMPLETED) orders
    const orders = await prisma.order.findMany({
      where: {
        ...(orderId && { id: orderId }),
        status: { not: 'COMPLETED' }
      },
      include: {
        orderType: {
          select: {
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
                timeLimit: true,
                teamId: true,
              },
            },
            assignedUser: {
              select: {
                displayName: true,
                email: true,
              },
            },
          },
          where: {
            OR: [
              // Include asking tasks (visible to all teams)
              {
                service: {
                  type: 'ASKING_SERVICE',
                },
              },
              // Include tasks for services belonging to the team leader's teams
              {
                service: {
                  teamId: {
                    in: teams.map((t: { id: string }) => t.id),
                  },
                },
              },
            ],
          },
        },
        askingTasks: {
          select: {
            id: true,
            serviceId: true,
            completedAt: true,
          },
        },
      },
      orderBy: {
        deliveryDate: 'asc',
      },
    })

    // Filter out orders with no tasks (after the task filtering)
    let ordersWithTasks = orders.filter((order) => order.tasks.length > 0)

    // Filter by completed asking services if specified
    if (completedAskingServices) {
      const serviceIds = completedAskingServices.split(',').filter(Boolean)
      
      if (serviceIds.length > 0) {
        ordersWithTasks = ordersWithTasks.filter((order) => {
          // Check if all selected asking services are completed for this order
          return serviceIds.every((serviceId) => {
            const askingTask = order.askingTasks.find(
              (task) => task.serviceId === serviceId
            )
            return askingTask && askingTask.completedAt !== null
          })
        })
      }
    }

    return NextResponse.json({ orders: ordersWithTasks })
  } catch (error) {
    console.error('Error fetching orders with tasks:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
