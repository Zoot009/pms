import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser, createAuditLog } from '@/lib/auth-utils'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()

    if (!user || (user.role !== 'ADMIN' && user.role !== 'ORDER_CREATOR')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const orderType = await prisma.orderType.findUnique({
      where: { id },
    })

    if (!orderType) {
      return NextResponse.json({ message: 'Order type not found' }, { status: 404 })
    }

    const updatedOrderType = await prisma.orderType.update({
      where: { id },
      data: {
        isActive: !orderType.isActive,
      },
      include: {
        services: {
          include: {
            service: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
        },
        _count: {
          select: {
            services: true,
            orders: true,
          },
        },
      },
    })

    // Create audit log
    await createAuditLog({
      performedBy: user.id,
      action: 'UPDATE',
      entityType: 'ORDER_TYPE',
      entityId: id,
      oldValue: { isActive: orderType.isActive },
      newValue: { isActive: updatedOrderType.isActive },
      description: `${updatedOrderType.isActive ? 'Activated' : 'Deactivated'} order type: ${orderType.name}`,
    })

    return NextResponse.json(updatedOrderType)
  } catch (error) {
    console.error('Error toggling order type status:', error)
    return NextResponse.json(
      { message: 'Failed to update order type status' },
      { status: 500 }
    )
  }
}
