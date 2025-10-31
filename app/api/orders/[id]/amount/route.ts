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
    const body = await request.json()
    const { amount } = body

    if (amount === undefined || amount === null) {
      return NextResponse.json(
        { error: 'Amount is required' },
        { status: 400 }
      )
    }

    // Check if order exists
    const order = await prisma.order.findUnique({
      where: { id },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Update order amount
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        amount: parseFloat(amount),
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
        oldValue: { amount: order.amount },
        newValue: { amount: parseFloat(amount) },
        description: `Order amount updated from $${order.amount} to $${parseFloat(amount)}`,
      },
    })

    return NextResponse.json({ 
      success: true,
      order: updatedOrder,
      message: 'Order amount updated successfully',
    })
  } catch (error) {
    console.error('Error updating order amount:', error)
    return NextResponse.json(
      { error: 'Failed to update order amount' },
      { status: 500 }
    )
  }
}
