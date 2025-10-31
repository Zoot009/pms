import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin, order creator, or team leader
    const isAdmin = currentUser.role === 'ADMIN'
    const isOrderCreator = currentUser.role === 'ORDER_CREATOR'
    const isTeamLeader = await prisma.team.findFirst({
      where: { leaderId: currentUser.id },
    })

    if (!isAdmin && !isOrderCreator && !isTeamLeader) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    // Check if order exists
    const order = await prisma.order.findUnique({
      where: { id },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Update order to verified status
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: 'IN_PROGRESS',
        updatedAt: new Date(),
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        performedBy: currentUser.id,
        action: 'UPDATE',
        entityType: 'ORDER',
        entityId: id,
        oldValue: { status: order.status },
        newValue: { status: 'IN_PROGRESS', verifiedBy: currentUser.email },
        description: `Order verified and moved to IN_PROGRESS status by ${currentUser.displayName || currentUser.email}`,
      },
    })

    return NextResponse.json({ 
      success: true,
      order: updatedOrder,
      message: 'Order verified successfully',
    })
  } catch (error) {
    console.error('Error verifying order:', error)
    return NextResponse.json(
      { error: 'Failed to verify order' },
      { status: 500 }
    )
  }
}
