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
        services: {
          include: {
            service: {
              include: {
                team: {
                  select: {
                    name: true
                  }
                }
              }
            },
            tasks: {
              select: {
                id: true,
                status: true,
                assignedTo: true,
              }
            },
            askingTasks: {
              select: {
                id: true,
                completedAt: true,
              }
            }
          }
        }
      }
    })

    if (!order) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 })
    }

    // Check if user has permission to edit services (admin or any order creator)
    const isAdmin = currentUser.role === 'ADMIN'
    const isOrderCreator = currentUser.role === 'ORDER_CREATOR'
    
    if (!isAdmin && !isOrderCreator) {
      return NextResponse.json(
        { 
          message: 'You can only edit services if you are an admin or an order creator',
        },
        { status: 403 }
      )
    }

    // Get all available active services (not restricted to order type)
    const availableServices = await prisma.service.findMany({
      where: {
        isActive: true,
      },
      include: {
        team: {
          select: {
            name: true
          }
        }
      },
      orderBy: [
        { type: 'asc' },
        { name: 'asc' }
      ]
    })

    // Group order services by serviceId with quantities and instance details
    const serviceInstancesMap = new Map<string, {
      serviceId: string
      service: any
      quantity: number
      removableCount: number
      assignedCount: number
      instances: Array<{ id: string, canRemove: boolean, hasAssignedTasks: boolean }>
    }>()

    order.services.forEach(os => {
      // Check if THIS specific OrderService instance has assigned tasks
      const hasAssignedTasks = os.tasks.some(task => task.assignedTo !== null)
      const canRemove = !hasAssignedTasks
      
      if (!serviceInstancesMap.has(os.serviceId)) {
        serviceInstancesMap.set(os.serviceId, {
          serviceId: os.serviceId,
          service: {
            id: os.service.id,
            name: os.service.name,
            type: os.service.type,
            description: os.service.description,
            isMandatory: os.service.isMandatory,
            team: os.service.team
          },
          quantity: 0,
          removableCount: 0,
          assignedCount: 0,
          instances: []
        })
      }
      
      const entry = serviceInstancesMap.get(os.serviceId)!
      entry.quantity++
      if (canRemove) {
        entry.removableCount++
      } else {
        entry.assignedCount++
      }
      entry.instances.push({
        id: os.id,
        canRemove,
        hasAssignedTasks
      })
    })

    const serviceInstances = Array.from(serviceInstancesMap.values())

    return NextResponse.json({
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        isCustomized: order.isCustomized
      },
      serviceInstances,
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
    const { serviceInstances } = body

    if (!serviceInstances || !Array.isArray(serviceInstances)) {
      return NextResponse.json(
        { message: 'serviceInstances must be an array' },
        { status: 400 }
      )
    }

    // Validate structure
    for (const instance of serviceInstances) {
      if (!instance.serviceId || typeof instance.quantity !== 'number' || instance.quantity < 1) {
        return NextResponse.json(
          { message: 'Each service instance must have serviceId and quantity >= 1' },
          { status: 400 }
        )
      }
    }

    // Get order with current services
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        services: {
          include: {
            service: true,
            tasks: {
              select: {
                id: true,
                status: true,
                assignedTo: true,
              }
            }
          }
        }
      }
    })

    if (!order) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 })
    }

    // Check if user has permission to edit services (admin or any order creator)
    const isAdmin = currentUser.role === 'ADMIN'
    const isOrderCreator = currentUser.role === 'ORDER_CREATOR'
    
    if (!isAdmin && !isOrderCreator) {
      return NextResponse.json(
        { 
          message: 'You can only edit services if you are an admin or an order creator',
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

    // Build current service quantities map
    const currentServiceQuantities = new Map<string, {
      quantity: number
      instances: Array<{ id: string, hasAssignedTasks: boolean }>
    }>()
    
    console.log('=== BUILDING CURRENT SERVICE QUANTITIES ===')
    console.log('Total order.services:', order.services.length)
    
    order.services.forEach(os => {
      console.log('Processing OrderService:', {
        id: os.id,
        serviceId: os.serviceId,
        serviceName: os.service.name,
        tasksCount: os.tasks.length,
        assignedTasksCount: os.tasks.filter(t => t.assignedTo !== null).length
      })
      
      // Check if THIS specific OrderService instance has assigned tasks
      const hasAssignedTasks = os.tasks.some(task => task.assignedTo !== null)
      
      if (!currentServiceQuantities.has(os.serviceId)) {
        currentServiceQuantities.set(os.serviceId, { quantity: 0, instances: [] })
      }
      
      const entry = currentServiceQuantities.get(os.serviceId)!
      entry.quantity++
      entry.instances.push({ id: os.id, hasAssignedTasks })
    })
    
    console.log('=== FINAL CURRENT QUANTITIES MAP ===')
    currentServiceQuantities.forEach((value, key) => {
      console.log('ServiceId:', key, 'Quantity:', value.quantity)
    })

    // Build desired service quantities map
    const desiredServiceQuantities = new Map<string, number>()
    serviceInstances.forEach(si => {
      desiredServiceQuantities.set(si.serviceId, si.quantity)
    })
    
    console.log('=== DESIRED QUANTITIES ===')
    desiredServiceQuantities.forEach((value, key) => {
      console.log('ServiceId:', key, 'Quantity:', value)
    })

    // Calculate changes
    const servicesToAdd: Array<{ serviceId: string, count: number }> = []
    const instancesToRemove: string[] = []

    // Check for additions
    desiredServiceQuantities.forEach((desiredQty, serviceId) => {
      const currentEntry = currentServiceQuantities.get(serviceId)
      const currentQty = currentEntry?.quantity || 0
      
      console.log('=== SERVICE ADD CHECK ===')
      console.log('ServiceId:', serviceId)
      console.log('Desired Qty:', desiredQty)
      console.log('Current Qty:', currentQty)
      console.log('Current Entry:', currentEntry)
      
      if (desiredQty > currentQty) {
        const countToAdd = desiredQty - currentQty
        console.log('ADDING:', countToAdd, 'instances')
        servicesToAdd.push({ serviceId, count: countToAdd })
      }
    })

    // Check for removals
    currentServiceQuantities.forEach((currentEntry, serviceId) => {
      const desiredQty = desiredServiceQuantities.get(serviceId) || 0
      const currentQty = currentEntry.quantity
      
      if (desiredQty < currentQty) {
        const removeCount = currentQty - desiredQty
        
        // Sort instances: removable first (no assigned tasks)
        const sortedInstances = currentEntry.instances.sort((a, b) => 
          a.hasAssignedTasks === b.hasAssignedTasks ? 0 : a.hasAssignedTasks ? 1 : -1
        )
        
        // Check if we have enough removable instances
        const removableInstances = sortedInstances.filter(i => !i.hasAssignedTasks)
        if (removableInstances.length < removeCount) {
          return NextResponse.json(
            { message: `Cannot remove ${removeCount} instance(s) of service. Only ${removableInstances.length} instance(s) can be removed (others have assigned tasks).` },
            { status: 400 }
          )
        }
        
        // Mark instances for removal
        for (let i = 0; i < removeCount; i++) {
          instancesToRemove.push(removableInstances[i].id)
        }
      }
    })

    // Validate new services exist and are active
    const newServiceIds = servicesToAdd.map(s => s.serviceId)
    if (newServiceIds.length > 0) {
      const validServices = await prisma.service.findMany({
        where: {
          id: { in: newServiceIds },
          isActive: true
        }
      })

      if (validServices.length !== newServiceIds.length) {
        return NextResponse.json(
          { message: 'Some selected services are invalid or inactive' },
          { status: 400 }
        )
      }
    }

    // Store old state for audit
    const oldServiceInstances = Array.from(currentServiceQuantities.entries()).map(([serviceId, data]) => ({
      serviceId,
      quantity: data.quantity
    }))

    // Execute the update in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Remove service instances
      if (instancesToRemove.length > 0) {
        // Delete tasks for these instances (only unassigned ones)
        await tx.task.deleteMany({
          where: {
            orderServiceId: { in: instancesToRemove },
            assignedTo: null
          }
        })

        // Delete asking tasks for these instances
        await tx.askingTask.deleteMany({
          where: {
            orderServiceId: { in: instancesToRemove }
          }
        })

        // Remove order service records
        await tx.orderService.deleteMany({
          where: {
            id: { in: instancesToRemove }
          }
        })
      }

      // Add new service instances
      for (const { serviceId, count } of servicesToAdd) {
        console.log('=== ADDING NEW SERVICE INSTANCES ===')
        console.log('ServiceId:', serviceId)
        console.log('Count to create:', count)
        
        // Get service details
        const service = await tx.service.findUnique({
          where: { id: serviceId },
          select: {
            id: true,
            name: true,
            type: true,
            teamId: true,
            isMandatory: true,
            hasTaskCount: true,
            taskCount: true,
            autoAssignEnabled: true,
            autoAssignUserId: true,
          },
        })

        if (!service) {
          console.log('Service not found, skipping')
          continue
        }
        
        console.log('Service details:', {
          name: service.name,
          type: service.type,
          hasTaskCount: service.hasTaskCount,
          taskCount: service.taskCount
        })

        // Create multiple instances
        for (let i = 0; i < count; i++) {
          console.log(`Creating OrderService instance ${i + 1} of ${count}`)
          
          // Create order service record
          const orderService = await tx.orderService.create({
            data: {
              orderId,
              serviceId
            }
          })
          
          console.log('Created OrderService:', orderService.id)

          // Create tasks based on service type
          if (service.type === 'SERVICE_TASK') {
            // Create 1 task per OrderService (ignore taskCount configuration)
            console.log(`Creating 1 task for this OrderService`)
            
            // Check if order has folderLink and service has auto-assignment enabled
            const shouldAutoAssign = order.folderLink && service.autoAssignEnabled && service.autoAssignUserId
            const assignedTo = shouldAutoAssign ? service.autoAssignUserId : null
            const status = assignedTo ? 'ASSIGNED' : 'NOT_ASSIGNED'
            
            console.log('[AUTO-ASSIGN DEBUG] Order has folderLink:', !!order.folderLink)
            console.log('[AUTO-ASSIGN DEBUG] Service auto-assign enabled:', service.autoAssignEnabled)
            console.log('[AUTO-ASSIGN DEBUG] Should auto-assign:', shouldAutoAssign)
            
            await tx.task.create({
              data: {
                orderId,
                orderServiceId: orderService.id,
                serviceId: service.id,
                teamId: service.teamId,
                title: service.name,
                assignedTo,
                status,
                priority: 'MEDIUM'
              }
            })
          } else if (service.type === 'ASKING_SERVICE') {
            console.log('Creating 1 asking task for this OrderService')
            
            // Check if order has folderLink and service has auto-assignment enabled
            const shouldAutoAssign = order.folderLink && service.autoAssignEnabled && service.autoAssignUserId
            const assignedTo = shouldAutoAssign ? service.autoAssignUserId : null
            
            console.log('[AUTO-ASSIGN DEBUG] Order has folderLink:', !!order.folderLink)
            console.log('[AUTO-ASSIGN DEBUG] Service auto-assign enabled:', service.autoAssignEnabled)
            console.log('[AUTO-ASSIGN DEBUG] Should auto-assign asking task:', shouldAutoAssign)
            
            // Create asking task
            await tx.askingTask.create({
              data: {
                orderId,
                orderServiceId: orderService.id,
                serviceId: service.id,
                teamId: service.teamId,
                title: service.name,
                assignedTo,
                currentStage: 'ASKED',
                isMandatory: service.isMandatory || false,
              }
            })
          }
        }
      }

      // Check if order should be marked as customized
      // Get order type default services
      const orderType = await tx.orderType.findUnique({
        where: { id: order.orderTypeId },
        include: {
          services: {
            select: {
              serviceId: true
            }
          }
        }
      })

      if (orderType) {
        const defaultServiceIds = orderType.services.map(s => s.serviceId).sort()
        const currentServiceIds = Array.from(desiredServiceQuantities.keys()).sort()
        
        // Check if services differ from defaults
        const servicesDiffer = JSON.stringify(defaultServiceIds) !== JSON.stringify(currentServiceIds)
        
        // Check if any service has quantity > 1
        const hasMultipleInstances = Array.from(desiredServiceQuantities.values()).some(qty => qty > 1)
        
        const shouldBeCustomized = servicesDiffer || hasMultipleInstances

        if (shouldBeCustomized && !order.isCustomized) {
          await tx.order.update({
            where: { id: orderId },
            data: { isCustomized: true }
          })
        }
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
        oldValue: { serviceInstances: oldServiceInstances },
        newValue: { serviceInstances: serviceInstances.map(si => ({ serviceId: si.serviceId, quantity: si.quantity })) },
        description: `Updated order services. Removed: ${instancesToRemove.length} instance(s), Added: ${servicesToAdd.reduce((sum, s) => sum + s.count, 0)} instance(s)`,
      },
    })

    return NextResponse.json({
      message: 'Order services updated successfully',
      changes: {
        removed: instancesToRemove.length,
        added: servicesToAdd.reduce((sum, s) => sum + s.count, 0)
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