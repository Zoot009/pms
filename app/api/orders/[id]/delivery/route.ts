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
    const { deliveryDate, deliveryTime } = body

    if (!deliveryDate) {
      return NextResponse.json(
        { error: 'Delivery date is required' },
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

    // Update delivery details
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        deliveryDate: new Date(deliveryDate),
        deliveryTime: deliveryTime || null,
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
        oldValue: { 
          deliveryDate: order.deliveryDate,
          deliveryTime: order.deliveryTime,
        },
        newValue: { 
          deliveryDate: new Date(deliveryDate),
          deliveryTime: deliveryTime || null,
        },
      },
    })

    return NextResponse.json({ 
      success: true,
      order: updatedOrder,
      message: 'Delivery details updated successfully',
    })
  } catch (error) {
    console.error('Error updating delivery details:', error)
    return NextResponse.json(
      { error: 'Failed to update delivery details' },
      { status: 500 }
    )
  }
}
