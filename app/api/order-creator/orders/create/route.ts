import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ORDER_CREATOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()

    // Validate required fields
    if (!data.orderNumber || !data.customerName || !data.orderTypeId || !data.amount || !data.orderDate || !data.deliveryDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check if order number already exists
    const existingOrder = await prisma.order.findUnique({
      where: { orderNumber: data.orderNumber },
    })

    if (existingOrder) {
      return NextResponse.json({ error: 'Order number already exists' }, { status: 400 })
    }

    // Get order type with services
    const orderType = await prisma.orderType.findUnique({
      where: { id: data.orderTypeId },
      include: {
        services: {
          include: {
            service: true,
          },
        },
      },
    })

    if (!orderType) {
      return NextResponse.json({ error: 'Order type not found' }, { status: 404 })
    }

    // Create order with services and tasks
    const order = await prisma.order.create({
      data: {
        orderNumber: data.orderNumber,
        orderTypeId: data.orderTypeId,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone,
        amount: data.amount,
        orderDate: new Date(data.orderDate),
        deliveryDate: new Date(data.deliveryDate),
        deliveryTime: data.deliveryTime,
        notes: data.notes,
        folderLink: data.folderLink,
        status: 'PENDING',
        createdById: user.id,
        isCustomized: false,
      },
    })

    // Create order services
    for (const orderTypeService of orderType.services) {
      await prisma.orderService.create({
        data: {
          orderId: order.id,
          serviceId: orderTypeService.serviceId,
        },
      })

      // Create tasks based on service type
      if (orderTypeService.service.type === 'SERVICE_TASK') {
        await prisma.task.create({
          data: {
            orderId: order.id,
            serviceId: orderTypeService.serviceId,
            teamId: orderTypeService.service.teamId,
            title: orderTypeService.service.name,
            description: orderTypeService.service.description,
            status: 'NOT_ASSIGNED',
            priority: 'MEDIUM',
            deadline: order.deliveryDate,
            isMandatory: orderTypeService.service.isMandatory,
          },
        })
      } else if (orderTypeService.service.type === 'ASKING_SERVICE') {
        await prisma.askingTask.create({
          data: {
            orderId: order.id,
            serviceId: orderTypeService.serviceId,
            teamId: orderTypeService.service.teamId,
            title: orderTypeService.service.name,
            description: orderTypeService.service.description,
            currentStage: 'ASKED',
            priority: 'MEDIUM',
            deadline: order.deliveryDate,
            isMandatory: orderTypeService.service.isMandatory,
          },
        })
      }
    }

    return NextResponse.json({
      message: 'Order created successfully',
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
      },
    })
  } catch (error) {
    console.error('Error creating order:', error)
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    )
  }
}
