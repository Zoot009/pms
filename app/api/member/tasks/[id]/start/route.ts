import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'

export async function POST(
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

    if (task.status !== 'ASSIGNED') {
      return NextResponse.json(
        { message: 'Task has already been started or completed' },
        { status: 400 }
      )
    }

    // Update task to IN_PROGRESS and record start time
    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      },
    })

    return NextResponse.json({
      message: 'Task started successfully',
      task: updatedTask,
    })
  } catch (error) {
    console.error('Error starting task:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
