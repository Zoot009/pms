import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser, createAuditLog } from '@/lib/auth-utils'

// PATCH - Update folder link for an order
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const { folderLink } = body

    if (!folderLink) {
      return NextResponse.json(
        { message: 'Folder link is required' },
        { status: 400 }
      )
    }

    // Check if order exists
    const existingOrder = await prisma.order.findUnique({
      where: { id },
    })

    if (!existingOrder) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 })
    }

    // Update order with folder link and auto-assign tasks
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Update the order
      const order = await tx.order.update({
        where: { id },
        data: {
          folderLink,
        },
        include: {
          orderType: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })

      // Auto-assign unassigned tasks that have auto-assign enabled services
      const unassignedTasks = await tx.task.findMany({
        where: {
          orderId: id,
          assignedTo: null,
        },
        include: {
          service: {
            select: {
              id: true,
              name: true,
              autoAssignEnabled: true,
              autoAssignUserId: true,
            },
          },
        },
      })

      for (const task of unassignedTasks) {
        if (task.service?.autoAssignEnabled && task.service?.autoAssignUserId) {
          await tx.task.update({
            where: { id: task.id },
            data: {
              assignedTo: task.service.autoAssignUserId,
              status: 'ASSIGNED',
            },
          })
        }
      }

      // Auto-assign unassigned asking tasks that have auto-assign enabled services
      const unassignedAskingTasks = await tx.askingTask.findMany({
        where: {
          orderId: id,
          assignedTo: null,
        },
        include: {
          service: {
            select: {
              id: true,
              name: true,
              autoAssignEnabled: true,
              autoAssignUserId: true,
            },
          },
        },
      })

      for (const askingTask of unassignedAskingTasks) {
        if (askingTask.service?.autoAssignEnabled && askingTask.service?.autoAssignUserId) {
          await tx.askingTask.update({
            where: { id: askingTask.id },
            data: {
              assignedTo: askingTask.service.autoAssignUserId,
            },
          })
        }
      }

      return order
    })

    // Create audit log
    await createAuditLog({
      performedBy: user.id,
      action: 'UPDATE',
      entityType: 'ORDER',
      entityId: id,
      oldValue: { folderLink: existingOrder.folderLink },
      newValue: { folderLink: updatedOrder.folderLink },
      description: `Added folder link to order: ${updatedOrder.orderNumber}`,
    })

    return NextResponse.json(updatedOrder)
  } catch (error) {
    console.error('Error updating folder link:', error)
    return NextResponse.json(
      { message: 'Failed to update folder link' },
      { status: 500 }
    )
  }
}
