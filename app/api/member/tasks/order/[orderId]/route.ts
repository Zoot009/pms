import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { orderId } = await params

    // Fetch order with member's tasks and asking tasks
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderType: {
          select: {
            name: true,
          },
        },
        tasks: {
          where: {
            assignedTo: user.id,
          },
          include: {
            service: {
              select: {
                name: true,
                type: true,
                timeLimit: true,
              },
            },
          },
        },
        askingTasks: {
          where: {
            completedAt: null,
          },
          include: {
            service: {
              select: {
                name: true,
              },
            },
            team: {
              select: {
                name: true,
              },
            },
            stageHistory: {
              orderBy: {
                createdAt: 'desc',
              },
            },
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 })
    }

    // Check if user has any tasks in this order
    if (order.tasks.length === 0) {
      return NextResponse.json(
        { message: 'No tasks assigned to you in this order' },
        { status: 403 }
      )
    }

    return NextResponse.json({ order })
  } catch (error) {
    console.error('Error fetching order:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
