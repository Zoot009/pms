import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser, createAuditLog } from '@/lib/auth-utils'
import { UserRole } from '@/lib/generated/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const order = await prisma.order.findUnique({
      where: { id },
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
        tasks: {
          include: {
            service: {
              select: {
                id: true,
                name: true,
                type: true,
                timeLimit: true,
              },
            },
            team: {
              select: {
                id: true,
                name: true,
              },
            },
            assignedUser: {
              select: {
                id: true,
                displayName: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        askingTasks: {
          include: {
            service: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
            team: {
              select: {
                id: true,
                name: true,
              },
            },
            assignedUser: {
              select: {
                id: true,
                displayName: true,
                email: true,
              },
            },
            stageHistory: {
              orderBy: {
                createdAt: 'desc',
              },
              take: 1,
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
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
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // All authenticated users can view orders (no access restriction for viewing)

    // Calculate statistics
    const allTasks = [...(order as any).tasks, ...(order as any).askingTasks]
    const totalTasks = allTasks.length
    const completedTasks = allTasks.filter((t: any) => 
      'completedAt' in t && t.completedAt !== null
    ).length
    const unassignedTasks = (order as any).tasks.filter((t: any) => t.status === 'NOT_ASSIGNED').length
    const overdueTasks = allTasks.filter((t: any) => {
      if ('completedAt' in t && t.completedAt) return false
      if (!t.deadline) return false
      return new Date(t.deadline) < new Date()
    }).length

    const mandatoryTasks = allTasks.filter((t: any) => 
      'isMandatory' in t && t.isMandatory
    )
    const mandatoryCompleted = mandatoryTasks.filter((t: any) => 
      'completedAt' in t && t.completedAt
    ).length
    const mandatoryRemaining = mandatoryTasks.length - mandatoryCompleted

    const createdAt = new Date(order.createdAt)
    const now = new Date()
    const daysOld = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))

    // Separate service tasks and custom tasks
    const serviceTasks = (order as any).tasks.filter((t: any) => t.serviceId !== null)
    const customTasks = (order as any).tasks.filter((t: any) => t.serviceId === null)

    // Calculate asking task progress
    const askingTasksWithProgress = (order as any).askingTasks.map((at: any) => {
      const stageProgress = {
        ASKED: false,
        SHARED: false,
        VERIFIED: false,
        INFORMED_TEAM: false,
      }

      // Mark completed stages based on stage history
      const stages = ['ASKED', 'SHARED', 'VERIFIED', 'INFORMED_TEAM']
      const currentStageIndex = stages.indexOf(at.currentStage)
      
      for (let i = 0; i <= currentStageIndex; i++) {
        stageProgress[stages[i] as keyof typeof stageProgress] = true
      }

      const completedStages = Object.values(stageProgress).filter(Boolean).length
      const totalStages = 4

      return {
        ...at,
        progress: {
          completed: completedStages,
          total: totalStages,
          percentage: Math.round((completedStages / totalStages) * 100),
          stages: stageProgress,
        },
      }
    })

    return NextResponse.json({
      order: {
        ...order,
        askingTasks: askingTasksWithProgress,
      },
      statistics: {
        totalTasks,
        completedTasks,
        unassignedTasks,
        overdueTasks,
        mandatoryTasks: mandatoryTasks.length,
        mandatoryCompleted,
        mandatoryRemaining,
        daysOld,
      },
      taskGroups: {
        serviceTasks,
        customTasks,
        askingTasks: askingTasksWithProgress,
        mandatoryTasks: mandatoryTasks.filter((t: any) => !('completedAt' in t && t.completedAt)),
        mandatoryAskingTasks: askingTasksWithProgress.filter((at: any) => at.isMandatory && !at.completedAt),
      },
    })
  } catch (error) {
    console.error('Error fetching order details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch order details' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser()
    
    // Only ADMIN and ORDER_CREATOR can delete orders
    if (!currentUser || (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.ORDER_CREATOR)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 })
    }

    const { id } = await params

    // Get order details before deletion for audit log
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        orderType: {
          select: {
            name: true,
          },
        },
        tasks: {
          select: {
            id: true,
            title: true,
          },
        },
        askingTasks: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 })
    }

    // Delete order (cascade will handle related records based on schema)
    await prisma.order.delete({
      where: { id },
    })

    // Create audit log
    await createAuditLog({
      performedBy: currentUser.id,
      action: 'DELETE',
      entityType: 'ORDER',
      entityId: id,
      oldValue: {
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        amount: order.amount,
        orderType: order.orderType.name,
        tasksCount: order.tasks.length,
        askingTasksCount: order.askingTasks.length,
      },
      description: `Deleted order #${order.orderNumber} for ${order.customerName}`,
    })

    return NextResponse.json(
      { message: 'Order deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error deleting order:', error)
    return NextResponse.json(
      { message: 'Failed to delete order' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser()
    
    // Only ADMIN, ORDER_CREATOR, and TEAM_LEADER can edit orders
    if (!currentUser || !['ADMIN', 'ORDER_CREATOR', 'TEAM_LEADER'].includes(currentUser.role)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()

    const { customerName, customerEmail, customerPhone, amount, notes } = body

    // Validate required fields
    if (!amount || amount <= 0) {
      return NextResponse.json({ message: 'Valid amount is required' }, { status: 400 })
    }

    // Get current order data for audit log
    const currentOrder = await prisma.order.findUnique({
      where: { id },
      select: {
        orderNumber: true,
        customerName: true,
        customerEmail: true,
        customerPhone: true,
        amount: true,
        notes: true,
      },
    })

    if (!currentOrder) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 })
    }

    // Update order
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        customerName: customerName?.trim() || null,
        customerEmail: customerEmail?.trim() || null,
        customerPhone: customerPhone?.trim() || null,
        amount: parseFloat(amount),
        notes: notes?.trim() || null,
      },
    })

    // Create audit log
    const changes = []
    if (currentOrder.customerName !== (customerName?.trim() || null)) {
      changes.push(`Customer Name: ${currentOrder.customerName || 'N/A'} → ${customerName?.trim() || 'N/A'}`)
    }
    if (currentOrder.customerEmail !== (customerEmail?.trim() || null)) {
      changes.push(`Customer Email: ${currentOrder.customerEmail || 'N/A'} → ${customerEmail?.trim() || 'N/A'}`)
    }
    if (currentOrder.customerPhone !== (customerPhone?.trim() || null)) {
      changes.push(`Customer Phone: ${currentOrder.customerPhone || 'N/A'} → ${customerPhone?.trim() || 'N/A'}`)
    }
    if (currentOrder.amount.toString() !== amount.toString()) {
      changes.push(`Amount: $${currentOrder.amount} → $${amount}`)
    }
    if (currentOrder.notes !== (notes?.trim() || null)) {
      changes.push(`Notes updated`)
    }

    if (changes.length > 0) {
      await createAuditLog({
        entityType: 'ORDER',
        entityId: id,
        action: 'UPDATE',
        performedBy: currentUser.id,
        oldValue: {
          customerName: currentOrder.customerName,
          customerEmail: currentOrder.customerEmail,
          customerPhone: currentOrder.customerPhone,
          amount: currentOrder.amount.toString(),
          notes: currentOrder.notes,
        },
        newValue: {
          customerName: customerName?.trim() || null,
          customerEmail: customerEmail?.trim() || null,
          customerPhone: customerPhone?.trim() || null,
          amount: amount.toString(),
          notes: notes?.trim() || null,
        },
        description: `Updated order #${currentOrder.orderNumber}: ${changes.join(', ')}`,
        request,
      })
    }

    return NextResponse.json(
      { message: 'Order updated successfully', order: updatedOrder },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error updating order:', error)
    return NextResponse.json(
      { message: 'Failed to update order' },
      { status: 500 }
    )
  }
}
