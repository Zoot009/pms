import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { UserRole } from '@/lib/generated/prisma'
import { getCurrentUser } from '@/lib/auth-utils'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()

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

    // Fetch the original order
    const originalOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderType: true,
        services: {
          include: {
            service: true,
          },
        },
      },
    })

    if (!originalOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Check if order is delivered (COMPLETED status)
    if (originalOrder.status !== 'COMPLETED') {
      return NextResponse.json({ error: 'Only delivered orders can be converted to revision' }, { status: 400 })
    }

    // Check if already has an active revision
    const existingRevision = await prisma.order.findFirst({
      where: {
        revisionOrderId: orderId,
        revisionCompletedAt: null,
      },
    })

    if (existingRevision) {
      return NextResponse.json({ error: 'An active revision already exists for this order' }, { status: 400 })
    }

    // Generate new order number for revision
    const revisionOrderNumber = `${originalOrder.orderNumber}-REV-${Date.now().toString().slice(-6)}`

    // Create revision order (duplicate with modifications)
    const revisionOrder = await prisma.order.create({
      data: {
        orderNumber: revisionOrderNumber,
        orderTypeId: originalOrder.orderTypeId,
        customerName: originalOrder.customerName,
        customerEmail: originalOrder.customerEmail,
        customerPhone: originalOrder.customerPhone,
        amount: originalOrder.amount,
        orderDate: new Date(),
        deliveryDate: originalOrder.deliveryDate,
        deliveryTime: originalOrder.deliveryTime,
        notes: originalOrder.notes,
        folderLink: originalOrder.folderLink,
        status: 'IN_PROGRESS',
        isRevision: true,
        revisionOrderId: originalOrder.id,
        createdById: user.id,
        metadata: {
          ...((originalOrder.metadata as any) || {}),
          originalOrderId: originalOrder.id,
          convertedToRevisionAt: new Date().toISOString(),
          convertedBy: user.id,
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

    // Copy order services (for reference, tasks will be created manually)
    for (const orderService of originalOrder.services) {
      await prisma.orderService.create({
        data: {
          orderId: revisionOrder.id,
          serviceId: orderService.serviceId,
          targetName: orderService.targetName,
          description: orderService.description,
        },
      })
    }

    return NextResponse.json({
      message: 'Order converted to revision successfully',
      revisionOrder,
    })
  } catch (error) {
    console.error('Error converting order to revision:', error)
    return NextResponse.json(
      { error: 'Failed to convert order to revision' },
      { status: 500 }
    )
  }
}
