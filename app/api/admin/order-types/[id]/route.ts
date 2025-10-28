import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser, createAuditLog } from '@/lib/auth-utils'

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const orderType = await prisma.orderType.findUnique({
      where: { id },
      include: {
        services: {
          include: {
            service: {
              select: {
                id: true,
                name: true,
                type: true,
                timeLimit: true,
                team: {
                  select: {
                    name: true,
                  },
                },
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

    if (!orderType) {
      return NextResponse.json({ message: 'Order type not found' }, { status: 404 })
    }

    // Flatten the services structure for easier consumption
    const flattenedOrderType = {
      ...orderType,
      services: orderType.services.map((s) => s.service),
    }

    return NextResponse.json(flattenedOrderType)
  } catch (error) {
    console.error('Error fetching order type:', error)
    return NextResponse.json(
      { message: 'Failed to fetch order type' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const { name, timeLimitDays, description, serviceIds } = body

    // Check if order type exists
    const existingOrderType = await prisma.orderType.findUnique({
      where: { id },
      include: {
        services: true,
      },
    })

    if (!existingOrderType) {
      return NextResponse.json({ message: 'Order type not found' }, { status: 404 })
    }

    // If name changed, generate new slug and check uniqueness
    let slug = existingOrderType.slug
    if (name && name !== existingOrderType.name) {
      slug = generateSlug(name)

      const slugExists = await prisma.orderType.findFirst({
        where: {
          slug,
          id: { not: id },
        },
      })

      if (slugExists) {
        return NextResponse.json(
          { message: 'An order type with this name already exists' },
          { status: 400 }
        )
      }
    }

    // Update order type and services in a transaction
    const updatedOrderType = await prisma.$transaction(async (tx) => {
      // Update basic info
      const updated = await tx.orderType.update({
        where: { id },
        data: {
          ...(name && { name }),
          slug,
          ...(timeLimitDays !== undefined && { timeLimitDays: Number(timeLimitDays) }),
          description: description !== undefined ? description : existingOrderType.description,
        },
      })

      // Update services if provided
      if (serviceIds && Array.isArray(serviceIds)) {
        // Delete existing services
        await tx.orderTypeService.deleteMany({
          where: { orderTypeId: id },
        })

        // Create new services
        if (serviceIds.length > 0) {
          await tx.orderTypeService.createMany({
            data: serviceIds.map((serviceId: string) => ({
              orderTypeId: id,
              serviceId,
            })),
          })
        }
      }

      // Fetch updated order type with relations
      return tx.orderType.findUnique({
        where: { id },
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
    })

    // Create audit log
    await createAuditLog({
      performedBy: user.id,
      action: 'UPDATE',
      entityType: 'ORDER_TYPE',
      entityId: id,
      oldValue: existingOrderType,
      newValue: updatedOrderType,
      description: `Updated order type: ${updatedOrderType?.name}`,
    })

    return NextResponse.json(updatedOrderType)
  } catch (error) {
    console.error('Error updating order type:', error)
    return NextResponse.json(
      { message: 'Failed to update order type' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const orderType = await prisma.orderType.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            orders: true,
          },
        },
      },
    })

    if (!orderType) {
      return NextResponse.json({ message: 'Order type not found' }, { status: 404 })
    }

    // Check if order type has orders (soft warning, but allow deletion)
    if (orderType._count.orders > 0) {
      // You can choose to prevent deletion here if needed
      // For now, we'll allow it but log it
      console.warn(`Deleting order type ${orderType.name} with ${orderType._count.orders} orders`)
    }

    await prisma.orderType.delete({
      where: { id },
    })

    // Create audit log
    await createAuditLog({
      performedBy: user.id,
      action: 'DELETE',
      entityType: 'ORDER_TYPE',
      entityId: id,
      oldValue: orderType,
      description: `Deleted order type: ${orderType.name}`,
    })

    return NextResponse.json({ message: 'Order type deleted successfully' })
  } catch (error) {
    console.error('Error deleting order type:', error)
    return NextResponse.json(
      { message: 'Failed to delete order type' },
      { status: 500 }
    )
  }
}
