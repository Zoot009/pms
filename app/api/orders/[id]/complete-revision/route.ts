import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { UserRole } from '@/lib/generated/prisma'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    })

    if (!dbUser || (dbUser.role !== UserRole.REVISION_MANAGER && dbUser.role !== UserRole.ADMIN)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id: orderId } = await params

    // Check if order exists and is a revision order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        isRevision: true,
        revisionCompletedAt: true,
        orderNumber: true,
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (!order.isRevision) {
      return NextResponse.json({ error: 'This is not a revision order' }, { status: 400 })
    }

    if (order.revisionCompletedAt) {
      return NextResponse.json({ error: 'Revision already completed' }, { status: 400 })
    }

    // Update revision order as completed
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        revisionCompletedAt: new Date(),
        status: 'COMPLETED',
        metadata: {
          ...((order as any).metadata || {}),
          revisionCompletedBy: user.id,
          revisionCompletedAt: new Date().toISOString(),
        },
      },
      include: {
        orderType: true,
        originalOrder: {
          select: {
            id: true,
            orderNumber: true,
            completedAt: true,
          },
        },
      },
    })

    return NextResponse.json({
      message: 'Revision marked as completed successfully',
      order: updatedOrder,
    })
  } catch (error) {
    console.error('Error completing revision:', error)
    return NextResponse.json(
      { error: 'Failed to complete revision' },
      { status: 500 }
    )
  }
}
