import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser, createAuditLog } from '@/lib/auth-utils'

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { name, timeLimitDays, description, serviceIds } = body

    if (!name || !timeLimitDays || !serviceIds || serviceIds.length === 0) {
      return NextResponse.json(
        { message: 'Name, time limit, and at least one service are required' },
        { status: 400 }
      )
    }

    const slug = generateSlug(name)

    // Check if slug already exists
    const existingOrderType = await prisma.orderType.findUnique({
      where: { slug },
    })

    if (existingOrderType) {
      return NextResponse.json(
        { message: 'An order type with this name already exists' },
        { status: 400 }
      )
    }

    // Create order type with services
    const orderType = await prisma.orderType.create({
      data: {
        name,
        slug,
        timeLimitDays: Number(timeLimitDays),
        description: description || null,
        createdById: user.id,
        services: {
          create: serviceIds.map((serviceId: string) => ({
            serviceId,
          })),
        },
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
      action: 'CREATE',
      entityType: 'ORDER_TYPE',
      entityId: orderType.id,
      description: `Created order type: ${orderType.name}`,
    })

    return NextResponse.json(orderType, { status: 201 })
  } catch (error) {
    console.error('Error creating order type:', error)
    return NextResponse.json(
      { message: 'Failed to create order type' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const orderTypes = await prisma.orderType.findMany({
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
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(orderTypes)
  } catch (error) {
    console.error('Error fetching order types:', error)
    return NextResponse.json(
      { message: 'Failed to fetch order types' },
      { status: 500 }
    )
  }
}
