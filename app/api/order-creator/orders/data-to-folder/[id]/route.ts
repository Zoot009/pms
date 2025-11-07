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

    // Update order with folder link
    const updatedOrder = await prisma.order.update({
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
