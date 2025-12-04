import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser, createAuditLog } from '@/lib/auth-utils'

// PATCH - Update folder link for an order (order creator)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'ORDER_CREATOR') {
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

    // Check if order exists (ORDER_CREATOR can update any order)
    const existingOrder = await prisma.order.findUnique({
      where: {
        id,
      },
    })

    if (!existingOrder) {
      return NextResponse.json(
        { message: 'Order not found' },
        { status: 404 }
      )
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

      console.log('[FOLDER-LINK AUTO-ASSIGN] Order ID:', id)
      console.log('[FOLDER-LINK AUTO-ASSIGN] Folder link added:', folderLink)
      console.log('[FOLDER-LINK AUTO-ASSIGN] Found unassigned tasks:', unassignedTasks.length)

      for (const task of unassignedTasks) {
        console.log('[FOLDER-LINK AUTO-ASSIGN] Checking task:', task.title)
        console.log('[FOLDER-LINK AUTO-ASSIGN] Service autoAssignEnabled:', task.service?.autoAssignEnabled)
        console.log('[FOLDER-LINK AUTO-ASSIGN] Service autoAssignUserId:', task.service?.autoAssignUserId)
        
        if (task.service?.autoAssignEnabled && task.service?.autoAssignUserId) {
          console.log('[FOLDER-LINK AUTO-ASSIGN] ✓ Auto-assigning task:', task.title, 'to user:', task.service.autoAssignUserId)
          
          await tx.task.update({
            where: { id: task.id },
            data: {
              assignedTo: task.service.autoAssignUserId,
              status: 'ASSIGNED',
            },
          })
        } else {
          console.log('[FOLDER-LINK AUTO-ASSIGN] ✗ Skipping task (auto-assign not enabled or no user set)')
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

      console.log('[FOLDER-LINK AUTO-ASSIGN] Found unassigned asking tasks:', unassignedAskingTasks.length)

      for (const askingTask of unassignedAskingTasks) {
        console.log('[FOLDER-LINK AUTO-ASSIGN] Checking asking task:', askingTask.title)
        console.log('[FOLDER-LINK AUTO-ASSIGN] Service autoAssignEnabled:', askingTask.service?.autoAssignEnabled)
        console.log('[FOLDER-LINK AUTO-ASSIGN] Service autoAssignUserId:', askingTask.service?.autoAssignUserId)
        
        if (askingTask.service?.autoAssignEnabled && askingTask.service?.autoAssignUserId) {
          console.log('[FOLDER-LINK AUTO-ASSIGN] ✓ Auto-assigning asking task:', askingTask.title, 'to user:', askingTask.service.autoAssignUserId)
          
          await tx.askingTask.update({
            where: { id: askingTask.id },
            data: {
              assignedTo: askingTask.service.autoAssignUserId,
            },
          })
        } else {
          console.log('[FOLDER-LINK AUTO-ASSIGN] ✗ Skipping asking task (auto-assign not enabled or no user set)')
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
