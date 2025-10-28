import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'

export async function DELETE(
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

    // Get the task
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        service: {
          select: {
            name: true,
            teamId: true,
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
        { message: 'You are not authorized to discard this task' },
        { status: 403 }
      )
    }

    // Check if task can be discarded
    if (task.status === 'COMPLETED') {
      return NextResponse.json(
        { message: 'Cannot discard a completed task' },
        { status: 400 }
      )
    }

    // Store old values for audit
    const oldValues = {
      assignedTo: task.assignedTo,
      deadline: task.deadline,
      priority: task.priority,
      status: task.status,
      notes: task.notes,
    }

    // Discard the task (return to NOT_ASSIGNED status)
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        assignedTo: null,
        status: 'NOT_ASSIGNED',
        notes: task.notes ? `[DISCARDED] ${task.notes}` : '[DISCARDED] Task returned to unassigned status',
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
          assignedTo: null,
          status: 'NOT_ASSIGNED',
        },
        description: 'Task assignment discarded and returned to unassigned status',
      },
    })

    return NextResponse.json({
      message: 'Task discarded successfully',
      task: updatedTask,
    })
  } catch (error) {
    console.error('Error discarding task:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
