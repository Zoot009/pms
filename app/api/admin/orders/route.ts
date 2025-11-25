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
      customServiceIds, // Array of service IDs if customized (legacy support)
      serviceInstances, // Array of service instances with metadata
      isCustomized, // Boolean flag
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
          isCustomized: isCustomized || false, // Track if services were customized
          createdById: currentUser.id,
        },
      })

      // Determine which services to use
      let servicesToCreate: any[] = []

      if (serviceInstances && Array.isArray(serviceInstances) && serviceInstances.length > 0) {
        // New format: service instances with metadata
        servicesToCreate = serviceInstances
      } else if (isCustomized && customServiceIds && Array.isArray(customServiceIds)) {
        // Legacy format: just service IDs
        const validServiceIds = customServiceIds.filter(id => id !== null && id !== undefined && id !== '')
        
        if (validServiceIds.length > 0) {
          const customServices = await tx.service.findMany({
            where: {
              id: { in: validServiceIds },
              isActive: true,
            },
          })

          servicesToCreate = customServices.map(s => ({
            serviceId: s.id,
            service: s,
          }))
        }
      } else {
        // Default: use order type services
        servicesToCreate = orderType.services
      }

      // Create OrderService records for each service instance
      if (servicesToCreate.length > 0) {
        const orderServiceRecords = await Promise.all(
          servicesToCreate.map(async (instance: any) => {
            const serviceId = instance.serviceId || instance.service?.id || instance.id
            
            return tx.orderService.create({
              data: {
                orderId: newOrder.id,
                serviceId: serviceId,
                description: instance.description || null,
                targetName: instance.targetName || null,
                targetUrl: instance.targetUrl || null,
              },
            })
          })
        )

        // Separate regular tasks and asking services
        const regularServiceInstances = orderServiceRecords.filter((os: any, index: number) => {
          const instance = servicesToCreate[index]
          const service = instance.service || instance
          return service.type === 'SERVICE_TASK'
        })
        const askingServiceInstances = orderServiceRecords.filter((os: any, index: number) => {
          const instance = servicesToCreate[index]
          const service = instance.service || instance
          return service.type === 'ASKING_SERVICE'
        })

        // Create regular tasks for SERVICE_TASK type
        if (regularServiceInstances.length > 0) {
          const taskData = await Promise.all(
            regularServiceInstances.map(async (orderService: any) => {
              const instance = servicesToCreate.find((s: any) => 
                (s.serviceId || s.service?.id || s.id) === orderService.serviceId
              )
              const service = instance?.service || instance
              const taskTitle = orderService.targetName 
                ? `${service.name} - ${orderService.targetName}`
                : `${service.name} - ${newOrder.orderNumber}`

              // Fetch full service details if teamId is missing
              let teamId = service.teamId
              if (!teamId) {
                const fullService = await tx.service.findUnique({
                  where: { id: orderService.serviceId },
                  select: { teamId: true }
                })
                teamId = fullService?.teamId
              }

              return {
                orderId: newOrder.id,
                orderServiceId: orderService.id,
                serviceId: orderService.serviceId,
                teamId: teamId!,
                title: taskTitle,
                description: orderService.description || null,
                status: 'NOT_ASSIGNED' as const,
              }
            })
          )

          await tx.task.createMany({
            data: taskData,
          })
        }

        // Create asking tasks for ASKING_SERVICE type
        if (askingServiceInstances.length > 0) {
          for (const orderService of askingServiceInstances) {
            const instance = servicesToCreate.find((s: any) => 
              (s.serviceId || s.service?.id || s.id) === orderService.serviceId
            )
            const service = instance?.service || instance
            const taskTitle = orderService.targetName 
              ? `${service.name} - ${orderService.targetName}`
              : `${service.name} - ${newOrder.orderNumber}`

            // Fetch full service details if teamId is missing
            let teamId = service.teamId
            if (!teamId) {
              const fullService = await tx.service.findUnique({
                where: { id: orderService.serviceId },
                select: { teamId: true }
              })
              teamId = fullService?.teamId
            }

            await tx.askingTask.create({
              data: {
                orderId: newOrder.id,
                orderServiceId: orderService.id,
                serviceId: orderService.serviceId,
                teamId: teamId!,
                title: taskTitle,
                description: orderService.description || `Asking service for order ${newOrder.orderNumber}`,
                currentStage: 'ASKED',
                priority: 'MEDIUM',
              },
            })
          }
        }
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
            servicesCount: servicesToCreate.length,
            isCustomized: isCustomized || false,
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
