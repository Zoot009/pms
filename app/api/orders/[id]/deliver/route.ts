import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { UserRole, OrderStatus } from '@/lib/generated/prisma'

// POST /api/orders/[id]/deliver - Mark order as delivered
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only ORDER_CREATOR and ADMIN can deliver orders
    if (currentUser.role !== UserRole.ORDER_CREATOR && currentUser.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: 'Only order creators can deliver orders' },
        { status: 403 }
      )
    }

    const { id } = await context.params

    // Fetch the order with all its tasks
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        tasks: true,
        askingTasks: true,
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Verify order is in PENDING or IN_PROGRESS status
    if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.IN_PROGRESS) {
      return NextResponse.json(
        { error: 'Only pending or in-progress orders can be delivered' },
        { status: 400 }
      )
    }

    // Note: We allow delivery even with incomplete tasks
    // The system will track incomplete tasks in the delivered order history

    // Update order status to COMPLETED
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.COMPLETED,
        completedAt: new Date(),
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
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        entityType: 'Order',
        entityId: order.id,
        action: 'COMPLETE',
        performedBy: currentUser.id,
        description: `Order #${order.orderNumber} delivered and marked as completed`,
        newValue: {
          status: OrderStatus.COMPLETED,
          completedAt: updatedOrder.completedAt,
        },
        oldValue: {
          status: order.status,
          completedAt: null,
        },
      },
    })

    return NextResponse.json({
      message: 'Order delivered successfully',
      order: updatedOrder,
    })
  } catch (error) {
    console.error('Error delivering order:', error)
    return NextResponse.json(
      { error: 'Failed to deliver order' },
      { status: 500 }
    )
  }
}
