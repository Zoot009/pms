import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { completionNotes } = body

    // Check if task exists and is assigned to this user
    const task = await prisma.task.findUnique({
      where: { id },
    })

    if (!task) {
      return NextResponse.json({ message: 'Task not found' }, { status: 404 })
    }

    if (task.assignedTo !== user.id) {
      return NextResponse.json(
        { message: 'You are not assigned to this task' },
        { status: 403 }
      )
    }

    if (task.status === 'COMPLETED') {
      return NextResponse.json(
        { message: 'Task is already completed' },
        { status: 400 }
      )
    }

    if (task.status === 'ASSIGNED') {
      return NextResponse.json(
        { message: 'Please start the task before completing it' },
        { status: 400 }
      )
    }

    const completedAt = new Date()

    // Update task to COMPLETED
    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt,
        notes: completionNotes || task.notes,
      },
    })

    // Calculate time spent (in milliseconds)
    let timeSpentMs = 0
    if (task.startedAt) {
      timeSpentMs = completedAt.getTime() - task.startedAt.getTime()
    }

    // Convert to hours, minutes
    const hours = Math.floor(timeSpentMs / (1000 * 60 * 60))
    const minutes = Math.floor((timeSpentMs % (1000 * 60 * 60)) / (1000 * 60))

    return NextResponse.json({
      message: 'Task completed successfully',
      task: updatedTask,
      timeSpent: {
        hours,
        minutes,
        totalMs: timeSpentMs,
      },
    })
  } catch (error) {
    console.error('Error completing task:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
