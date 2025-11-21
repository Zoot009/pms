import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params

    // Check if user has any tasks assigned for this order
    const userTasks = await prisma.task.findMany({
      where: {
        orderId: id,
        assignedTo: user.id,
      },
      select: { id: true },
    })

    if (userTasks.length === 0) {
      return NextResponse.json(
        { error: 'You do not have access to this order' },
        { status: 403 }
      )
    }

    // Fetch all asking tasks with notes for this order
    const askingTasks = await prisma.askingTask.findMany({
      where: {
        orderId: id,
        notes: {
          not: null,
        },
      },
      select: {
        id: true,
        title: true,
        notes: true,
        currentStage: true,
        completedAt: true,
        updatedAt: true,
        service: {
          select: {
            name: true,
          },
        },
        completedUser: {
          select: {
            displayName: true,
            email: true,
          },
        },
        notesUpdatedUser: {
          select: {
            displayName: true,
            email: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    return NextResponse.json({ askingTasks })
  } catch (error) {
    console.error('Error fetching asking task notes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch asking task notes' },
      { status: 500 }
    )
  }
}
