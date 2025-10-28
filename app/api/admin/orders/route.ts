import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'

// GET /api/admin/orders - List orders with filters
export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (currentUser.role !== 'ADMIN' && currentUser.role !== 'ORDER_CREATOR') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')
    const status = searchParams.get('status')
    const orderTypeId = searchParams.get('orderType')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const whereCondition: any = {}

    if (search) {
      whereCondition.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerEmail: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (status && status !== 'ALL') {
      whereCondition.status = status as any
    }

    if (orderTypeId && orderTypeId !== 'all') {
      whereCondition.orderTypeId = orderTypeId
    }

    if (startDate || endDate) {
      whereCondition.orderDate = {}
      if (startDate) {
        whereCondition.orderDate.gte = new Date(startDate)
      }
      if (endDate) {
        whereCondition.orderDate.lte = new Date(endDate)
      }
    }

    const orders = await prisma.order.findMany({
      where: whereCondition,
      include: {
        orderType: {
          select: {
            id: true,
            name: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
        _count: {
          select: {
            tasks: true,
            services: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(orders)
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}

// POST /api/admin/orders - Create new order
export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (currentUser.role !== 'ADMIN' && currentUser.role !== 'ORDER_CREATOR') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const {
      orderNumber,
      customerName,
      customerEmail,
      customerPhone,
      orderTypeId,
      amount,
      orderDate,
      deliveryDate,
      deliveryTime,
      notes,
    } = body

    // Validate required fields
    if (!orderNumber || !customerName || !orderTypeId || !amount || !orderDate || !deliveryDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if order number is unique
    const existingOrder = await prisma.order.findUnique({
      where: { orderNumber },
    })

    if (existingOrder) {
      return NextResponse.json(
        { error: 'Order number already exists' },
        { status: 400 }
      )
    }

    // Check if order type exists and is active
    const orderType = await prisma.orderType.findUnique({
      where: { id: orderTypeId },
      include: {
        services: {
          include: {
            service: true,
          },
        },
      },
    })

    if (!orderType) {
      return NextResponse.json(
        { error: 'Order type not found' },
        { status: 404 }
      )
    }

    if (!orderType.isActive) {
      return NextResponse.json(
        { error: 'Order type is not active' },
        { status: 400 }
      )
    }

    // Create order with services and tasks in a transaction
    const order = await prisma.$transaction(async (tx) => {
      // Create the order
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          customerName,
          customerEmail: customerEmail || '',
          customerPhone: customerPhone || '',
          orderTypeId,
          amount: amount,
          orderDate: new Date(orderDate),
          deliveryDate: new Date(deliveryDate),
          deliveryTime: deliveryTime || null,
          notes: notes || null,
          status: 'PENDING',
          createdById: currentUser.id,
        },
      })

      // Create OrderService records for each service in the order type
      if (orderType.services.length > 0) {
        await tx.orderService.createMany({
          data: orderType.services.map((os) => ({
            orderId: newOrder.id,
            serviceId: os.serviceId,
          })),
        })

        // Create tasks for each service with status NOT_ASSIGNED
        const taskData = orderType.services.map((os) => ({
          orderId: newOrder.id,
          serviceId: os.serviceId,
          teamId: os.service.teamId,
          title: `${os.service.name} - ${newOrder.orderNumber}`,
          status: 'NOT_ASSIGNED' as const,
        }))

        await tx.task.createMany({
          data: taskData,
        })
      }

      // Create audit log
      await tx.auditLog.create({
        data: {
          performedBy: currentUser.id,
          action: 'CREATE',
          entityType: 'ORDER',
          entityId: newOrder.id,
          newValue: {
            orderNumber: newOrder.orderNumber,
            orderType: orderType.name,
            servicesCount: orderType.services.length,
          },
        },
      })

      return newOrder
    })

    // Fetch the complete order with relations
    const completeOrder = await prisma.order.findUnique({
      where: { id: order.id },
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

    return NextResponse.json(completeOrder, { status: 201 })
  } catch (error) {
    console.error('Error creating order:', error)
    if (error && typeof error === 'object' && 'code' in error) {
      if ((error as any).code === 'P2002') {
        return NextResponse.json(
          { error: 'Order number already exists' },
          { status: 400 }
        )
      }
    }
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    )
  }
}
