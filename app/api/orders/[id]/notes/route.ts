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

    // Check if user is admin or team leader
    const isAdmin = currentUser.role === 'ADMIN'
    const isTeamLeader = await prisma.team.findFirst({
      where: { leaderId: currentUser.id },
    })

    if (!isAdmin && !isTeamLeader) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { notes } = body

    // Check if order exists
    const order = await prisma.order.findUnique({
      where: { id },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Update order notes
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        notes: notes || null,
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
        oldValue: { notes: order.notes },
        newValue: { notes: notes || null },
      },
    })

    return NextResponse.json({ 
      success: true,
      order: updatedOrder,
      message: 'Notes updated successfully',
    })
  } catch (error) {
    console.error('Error updating notes:', error)
    return NextResponse.json(
      { error: 'Failed to update notes' },
      { status: 500 }
    )
  }
}
