import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'

export async function PATCH(
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

    // Verify user is team leader of the task's team
    const team = await prisma.team.findUnique({
      where: {
        id: task.teamId,
        leaderId: user.id,
      },
    })

    if (!team) {
      return NextResponse.json(
        { message: 'You are not authorized to reassign this task' },
        { status: 403 }
      )
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

    // Verify the new assignee is a member of one of the team leader's teams
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

    // Check if task can be reassigned
    if (task.status === 'COMPLETED') {
      return NextResponse.json(
        { message: 'Cannot reassign a completed task' },
        { status: 400 }
      )
    }

    // Store old values for audit
    const oldValues = {
      assignedTo: task.assignedTo,
      deadline: task.deadline,
      priority: task.priority,
      notes: task.notes,
    }

    // Reassign the task
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        assignedTo,
        deadline: new Date(deadline),
        priority,
        notes: notes || null,
        status: 'ASSIGNED', // Reset status to ASSIGNED when reassigning
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
        oldValue: oldValues,
        newValue: {
          assignedTo,
          deadline,
          priority,
          notes,
          status: 'ASSIGNED',
        },
        description: 'Task reassigned to different team member',
      },
    })

    return NextResponse.json({
      message: 'Task reassigned successfully',
      task: updatedTask,
    })
  } catch (error) {
    console.error('Error reassigning task:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
