import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ORDER_CREATOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { notes } = await request.json()
    const { id: orderId } = await params

    // Verify the order belongs to this user
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        tasks: {
          where: {
            status: { not: 'COMPLETED' },
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.createdById !== user.id) {
      return NextResponse.json(
        { error: 'You can only deliver orders you created' },
        { status: 403 }
      )
    }

    if (order.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Order is already delivered' },
        { status: 400 }
      )
    }

    // Check if there are incomplete tasks
    if (order.tasks.length > 0) {
      return NextResponse.json(
        { error: 'Cannot deliver order with incomplete tasks' },
        { status: 400 }
      )
    }

    // Mark order as completed
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        notes: notes ? `${order.notes || ''}\n\nDelivery Notes: ${notes}` : order.notes,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error delivering order:', error)
    return NextResponse.json(
      { error: 'Failed to deliver order' },
      { status: 500 }
    )
  }
}
