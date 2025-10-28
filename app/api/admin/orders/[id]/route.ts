import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { use } from 'react'

// GET /api/admin/orders/[id] - Get order details
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (currentUser.role !== 'ADMIN' && currentUser.role !== 'ORDER_CREATOR') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        orderType: true,
        services: {
          include: {
            service: {
              include: {
                team: true,
              },
            },
          },
        },
        tasks: {
          include: {
            service: true,
            assignedUser: {
              select: {
                id: true,
                displayName: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        createdBy: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error('Error fetching order:', error)
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/orders/[id] - Update order
export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (currentUser.role !== 'ADMIN' && currentUser.role !== 'ORDER_CREATOR') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const {
      customerName,
      customerEmail,
      customerPhone,
      amount,
      orderDate,
      deliveryDate,
      deliveryTime,
      notes,
      status,
    } = body

    // Fetch existing order for audit log
    const existingOrder = await prisma.order.findUnique({
      where: { id: params.id },
    })

    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const updateData: any = {}

    if (customerName !== undefined) updateData.customerName = customerName
    if (customerEmail !== undefined) updateData.customerEmail = customerEmail
    if (customerPhone !== undefined) updateData.customerPhone = customerPhone
    if (amount !== undefined) updateData.amount = parseFloat(amount)
    if (orderDate !== undefined) updateData.orderDate = new Date(orderDate)
    if (deliveryDate !== undefined) updateData.deliveryDate = new Date(deliveryDate)
    if (deliveryTime !== undefined) updateData.deliveryTime = deliveryTime
    if (notes !== undefined) updateData.notes = notes
    if (status !== undefined) {
      updateData.status = status
      if (status === 'COMPLETED') {
        updateData.completedAt = new Date()
      }
    }

    // Update order and create audit log in transaction
    const updatedOrder = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: params.id },
        data: updateData,
        include: {
          orderType: true,
          services: {
            include: {
              service: true,
            },
          },
          tasks: {
            include: {
              service: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },
        },
      })

      // Create audit log
      await tx.auditLog.create({
        data: {
          performedBy: currentUser.id,
          action: 'UPDATE',
          entityType: 'ORDER',
          entityId: updated.id,
          oldValue: existingOrder,
          newValue: updated,
        },
      })

      return updated
    })

    return NextResponse.json(updatedOrder)
  } catch (error) {
    console.error('Error updating order:', error)
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/orders/[id] - Delete order
export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only administrators can delete orders' },
        { status: 403 }
      )
    }

    // Fetch existing order for audit log
    const existingOrder = await prisma.order.findUnique({
      where: { id: params.id },
    })

    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Delete order and create audit log in transaction
    // Note: OrderService and Task records will be cascaded
    await prisma.$transaction(async (tx) => {
      await tx.order.delete({
        where: { id: params.id },
      })

      // Create audit log
      await tx.auditLog.create({
        data: {
          performedBy: currentUser.id,
          action: 'DELETE',
          entityType: 'ORDER',
          entityId: params.id,
          oldValue: existingOrder,
        },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting order:', error)
    return NextResponse.json(
      { error: 'Failed to delete order' },
      { status: 500 }
    )
  }
}
