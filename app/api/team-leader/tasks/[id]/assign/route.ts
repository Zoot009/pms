import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { id: taskId } = await context.params
    const body = await request.json()
    const { assignedTo, deadline, priority, notes } = body

    // Validate required fields
    if (!assignedTo || !deadline || !priority) {
      return NextResponse.json(
        { message: 'Missing required fields: assignedTo, deadline, priority' },
        { status: 400 }
      )
    }

    // Get the task with service and order details
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        service: {
          select: {
            teamId: true,
            type: true,
          },
        },
        order: {
          select: {
            deliveryDate: true,
          },
        },
      },
    })

    if (!task) {
      return NextResponse.json({ message: 'Task not found' }, { status: 404 })
    }

    // Check if deadline is before delivery date and time
    const deadlineDate = new Date(deadline)
    const deliveryDate = new Date(task.order.deliveryDate)
    
    // Allow same day but must be before delivery time
    if (deadlineDate >= deliveryDate) {
      return NextResponse.json(
        { 
          message: `Deadline must be before the order delivery time. Deadline: ${deadlineDate.toISOString()}, Delivery: ${deliveryDate.toISOString()}` 
        },
        { status: 400 }
      )
    }

    // Verify user is team leader of the service's team
    // Team leaders can ONLY assign tasks from their own team's services
    if (!task.service.teamId) {
      return NextResponse.json(
        { message: 'Service must belong to a team' },
        { status: 400 }
      )
    }

    const team = await prisma.team.findUnique({
      where: {
        id: task.service.teamId,
        leaderId: user.id,
      },
    })

    if (!team) {
      return NextResponse.json(
        { message: 'You can only assign tasks from your own team\'s services' },
        { status: 403 }
      )
    }

    // Verify the assignee is a member of one of the team leader's teams
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        userId: assignedTo,
        team: {
          leaderId: user.id,
        },
      },
    })

    if (!teamMember) {
      return NextResponse.json(
        { message: 'Selected user is not in your team' },
        { status: 400 }
      )
    }

    // Check if task is already assigned
    if (task.status !== 'NOT_ASSIGNED') {
      return NextResponse.json(
        { message: `Task is already assigned or completed. Current status: ${task.status}` },
        { status: 400 }
      )
    }

    // Assign the task
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        assignedTo,
        deadline: new Date(deadline),
        priority,
        notes: notes || null,
        status: 'ASSIGNED',
      },
      include: {
        service: {
          select: {
            name: true,
            type: true,
          },
        },
        assignedUser: {
          select: {
            displayName: true,
            email: true,
          },
        },
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        entityType: 'Task',
        entityId: taskId,
        performedBy: user.id,
        newValue: {
          assignedTo,
          deadline,
          priority,
          notes,
          status: 'ASSIGNED',
        },
        description: 'Task assigned to team member',
      },
    })

    return NextResponse.json({
      message: 'Task assigned successfully',
      task: updatedTask,
    })
  } catch (error) {
    console.error('Error assigning task:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
