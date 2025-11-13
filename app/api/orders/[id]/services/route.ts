import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { id: orderId } = await context.params

    // Get order with services and their task assignment status
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderType: {
          include: {
            services: {
              include: {
                service: {
                  include: {
                    tasks: {
                      where: { orderId },
                      select: {
                        id: true,
                        status: true,
                        assignedTo: true,
                      }
                    }
                  }
                }
              }
            }
          }
        },
        services: {
          include: {
            service: {
              include: {
                tasks: {
                  where: { orderId },
                  select: {
                    id: true,
                    status: true,
                    assignedTo: true,
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!order) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 })
    }

    // Check if user has permission to edit services (admin or order creator who created the order)
    console.log('Debug - User ID:', currentUser.id)
    console.log('Debug - User Role:', currentUser.role)
    console.log('Debug - Order Created By ID:', order.createdById)
    
    const isAdmin = currentUser.role === 'ADMIN'
    const isOrderCreator = currentUser.role === 'ORDER_CREATOR' && order.createdById === currentUser.id
    
    console.log('Debug - Is Admin:', isAdmin)
    console.log('Debug - Is Order Creator:', isOrderCreator)
    
    if (!isAdmin && !isOrderCreator) {
      return NextResponse.json(
        { 
          message: 'You can only edit services if you are an admin or the order creator',
          debug: {
            userId: currentUser.id,
            userRole: currentUser.role,
            orderCreatedById: order.createdById,
            isAdmin,
            isOrderCreator
          }
        },
        { status: 403 }
      )
    }

    // Get all available services for the order type
    const availableServices = await prisma.service.findMany({
      where: {
        isActive: true,
        orderTypeServices: {
          some: {
            orderTypeId: order.orderTypeId
          }
        }
      },
      include: {
        team: {
          select: {
            name: true
          }
        }
      }
    })

    // Mark services that can't be removed (have assigned tasks)
    const currentServices = order.services.map(os => ({
      ...os.service,
      canRemove: !os.service.tasks.some(task => task.assignedTo !== null),
      hasAssignedTasks: os.service.tasks.some(task => task.assignedTo !== null),
      taskCount: os.service.tasks.length
    }))

    return NextResponse.json({
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        isCustomized: order.isCustomized
      },
      currentServices,
      availableServices
    })

  } catch (error) {
    console.error('Error fetching order services:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { id: orderId } = await context.params
    const body = await request.json()
    const { serviceIds } = body

    if (!serviceIds || !Array.isArray(serviceIds)) {
      return NextResponse.json(
        { message: 'serviceIds must be an array' },
        { status: 400 }
      )
    }

    // Get order with current services
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        services: {
          include: {
            service: {
              include: {
                tasks: {
                  where: { orderId },
                  select: {
                    id: true,
                    status: true,
                    assignedTo: true,
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!order) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 })
    }

    // Check if user has permission to edit services (admin or order creator who created the order)
    console.log('Debug PATCH - User ID:', currentUser.id)
    console.log('Debug PATCH - User Role:', currentUser.role)
    console.log('Debug PATCH - Order Created By ID:', order.createdById)
    
    const isAdmin = currentUser.role === 'ADMIN'
    const isOrderCreator = currentUser.role === 'ORDER_CREATOR' && order.createdById === currentUser.id
    
    console.log('Debug PATCH - Is Admin:', isAdmin)
    console.log('Debug PATCH - Is Order Creator:', isOrderCreator)
    
    if (!isAdmin && !isOrderCreator) {
      return NextResponse.json(
        { 
          message: 'You can only edit services if you are an admin or the order creator',
          debug: {
            userId: currentUser.id,
            userRole: currentUser.role,
            orderCreatedById: order.createdById,
            isAdmin,
            isOrderCreator
          }
        },
        { status: 403 }
      )
    }

    // Check if order can be modified
    if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
      return NextResponse.json(
        { message: 'Cannot modify services for completed or cancelled orders' },
        { status: 400 }
      )
    }

    const currentServiceIds = order.services.map(os => os.serviceId)
    const servicesToRemove = currentServiceIds.filter(id => !serviceIds.includes(id))
    const servicesToAdd = serviceIds.filter(id => !currentServiceIds.includes(id))

    // Check if any service being removed has assigned tasks
    for (const serviceId of servicesToRemove) {
      const orderService = order.services.find(os => os.serviceId === serviceId)
      if (orderService?.service.tasks.some(task => task.assignedTo !== null)) {
        return NextResponse.json(
          { message: 'Cannot remove service with assigned tasks. Please unassign tasks first.' },
          { status: 400 }
        )
      }
    }

    // Validate new services exist and are active
    if (servicesToAdd.length > 0) {
      const validServices = await prisma.service.findMany({
        where: {
          id: { in: servicesToAdd },
          isActive: true
        }
      })

      if (validServices.length !== servicesToAdd.length) {
        return NextResponse.json(
          { message: 'Some selected services are invalid or inactive' },
          { status: 400 }
        )
      }
    }

    // Store old services for audit
    const oldServices = currentServiceIds

    // Execute the update in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Remove services and their tasks
      for (const serviceId of servicesToRemove) {
        // Delete unassigned tasks first
        await tx.task.deleteMany({
          where: {
            orderId,
            serviceId,
            assignedTo: null
          }
        })

        // Remove order service relation
        await tx.orderService.deleteMany({
          where: {
            orderId,
            serviceId
          }
        })
      }

      // Add new services
      if (servicesToAdd.length > 0) {
        // Create order service relations
        await tx.orderService.createMany({
          data: servicesToAdd.map(serviceId => ({
            orderId,
            serviceId
          }))
        })

        // Get new services details to create tasks
        const newServices = await tx.service.findMany({
          where: {
            id: { in: servicesToAdd }
          }
        })

        // Create tasks for new services
        for (const service of newServices) {
          if (service.type === 'SERVICE_TASK') {
            // Create regular tasks based on taskCount or default to 1
            const taskCount = service.hasTaskCount ? (service.taskCount || 1) : 1
            
            for (let i = 1; i <= taskCount; i++) {
              await tx.task.create({
                data: {
                  orderId,
                  serviceId: service.id,
                  teamId: service.teamId,
                  title: taskCount > 1 ? `${service.name} - Task ${i}` : service.name,
                  status: 'NOT_ASSIGNED',
                  priority: 'MEDIUM'
                }
              })
            }
          } else if (service.type === 'ASKING_SERVICE') {
            // Create asking tasks with default stages
            await tx.askingTask.create({
              data: {
                orderId,
                serviceId: service.id,
                teamId: service.teamId,
                title: service.name,
                currentStage: 'ASKED',
                isMandatory: service.isMandatory || false,
              }
            })
          }
        }
      }

      // Mark order as customized if it wasn't already
      if (!order.isCustomized) {
        await tx.order.update({
          where: { id: orderId },
          data: { isCustomized: true }
        })
      }

      return { success: true }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        entityType: 'Order',
        entityId: orderId,
        performedBy: currentUser.id,
        oldValue: { serviceIds: oldServices },
        newValue: { serviceIds },
        description: `Updated order services. Removed: ${servicesToRemove.length}, Added: ${servicesToAdd.length}`,
      },
    })

    return NextResponse.json({
      message: 'Order services updated successfully',
      changes: {
        removed: servicesToRemove.length,
        added: servicesToAdd.length
      }
    })

  } catch (error) {
    console.error('Error updating order services:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}