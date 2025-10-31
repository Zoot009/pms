import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin, order creator, or team leader
    const isAdmin = currentUser.role === 'ADMIN'
    const isOrderCreator = currentUser.role === 'ORDER_CREATOR'
    const userTeams = await prisma.team.findMany({
      where: { leaderId: currentUser.id },
      select: { id: true },
    })

    if (!isAdmin && !isOrderCreator && userTeams.length === 0) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id: orderId } = await params
    const body = await request.json()
    const { title, description, teamId, assignedTo, priority, deadline, isMandatory } = body

    if (!title || !teamId) {
      return NextResponse.json(
        { error: 'Title and team are required' },
        { status: 400 }
      )
    }

    // Verify team leader has permission for this team
    if (!isAdmin && !isOrderCreator) {
      const hasPermission = userTeams.some(t => t.id === teamId)
      if (!hasPermission) {
        return NextResponse.json(
          { error: 'You do not have permission for this team' },
          { status: 403 }
        )
      }
    }

    // Check if order exists
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Create custom task (serviceId will be undefined for custom tasks)
    const customTask = await prisma.task.create({
      data: {
        orderId,
        // serviceId is undefined for custom tasks - this distinguishes them from service tasks
        teamId,
        title,
        description,
        assignedTo: assignedTo || null,
        status: assignedTo ? 'ASSIGNED' : 'NOT_ASSIGNED',
        priority: priority || 'MEDIUM',
        deadline: deadline ? new Date(deadline) : null,
        createdById: currentUser.id,
      },
      include: {
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
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        performedBy: currentUser.id,
        action: 'CREATE',
        entityType: 'TASK',
        entityId: customTask.id,
        newValue: {
          orderId,
          title,
          type: 'custom',
          assignedTo,
        },
        description: `Custom task "${title}" created for order #${order.orderNumber}`,
      },
    })

    return NextResponse.json({ 
      success: true,
      task: customTask,
      message: 'Custom task created successfully',
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating custom task:', error)
    return NextResponse.json(
      { error: 'Failed to create custom task' },
      { status: 500 }
    )
  }
}
