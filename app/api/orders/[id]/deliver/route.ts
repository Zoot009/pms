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

    // Verify order is in IN_PROGRESS status
    if (order.status !== OrderStatus.IN_PROGRESS) {
      return NextResponse.json(
        { error: 'Only orders in progress can be delivered' },
        { status: 400 }
      )
    }

    // Verify all mandatory tasks are completed
    const mandatoryAskingTasks = order.askingTasks.filter(task => task.isMandatory)
    const incompleteMandatory = mandatoryAskingTasks.filter(task => !task.completedAt)
    
    if (incompleteMandatory.length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot deliver order: Not all mandatory tasks are completed',
          incompleteTasks: incompleteMandatory.map(t => ({
            id: t.id,
            title: t.title,
          })),
        },
        { status: 400 }
      )
    }

    // Verify all tasks are completed
    const allTasks = [...order.tasks, ...order.askingTasks]
    const incompleteTasks = allTasks.filter(task => !task.completedAt)
    
    if (incompleteTasks.length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot deliver order: Not all tasks are completed',
          incompleteTasks: incompleteTasks.map(t => ({
            id: t.id,
            title: t.title,
          })),
        },
        { status: 400 }
      )
    }

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
