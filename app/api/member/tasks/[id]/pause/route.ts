import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
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

    if (task.assignedTo !== currentUser.id) {
      return NextResponse.json(
        { message: 'You are not assigned to this task' },
        { status: 403 }
      )
    }

    let updatedTask
    let message

    if (task.status === 'PAUSED') {
      // Unpause the task - resume to IN_PROGRESS
      updatedTask = await prisma.task.update({
        where: { id },
        data: {
          status: 'IN_PROGRESS',
        },
      })
      message = 'Task resumed successfully'
    } else {
      // Pause the task
      updatedTask = await prisma.task.update({
        where: { id },
        data: {
          status: 'PAUSED',
        },
      })
      message = 'Task paused successfully'
    }

    return NextResponse.json({
      message,
      task: updatedTask,
    })
  } catch (error) {
    console.error('Error toggling task pause state:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}