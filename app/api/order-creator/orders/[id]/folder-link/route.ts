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

    const { folderLink } = await request.json()
    const { id: orderId } = await params

    // Verify the order belongs to this user
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.createdById !== user.id) {
      return NextResponse.json(
        { error: 'You can only update orders you created' },
        { status: 403 }
      )
    }

    // Update folder link
    await prisma.order.update({
      where: { id: orderId },
      data: {
        folderLink: folderLink || null,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating folder link:', error)
    return NextResponse.json(
      { error: 'Failed to update folder link' },
      { status: 500 }
    )
  }
}
