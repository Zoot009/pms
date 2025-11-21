import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params
    const body = await request.json()
    const { notes } = body

    if (notes === undefined) {
      return NextResponse.json({ error: 'Notes field is required' }, { status: 400 })
    }

    const askingTask = await prisma.askingTask.findUnique({
      where: { id },
    })

    if (!askingTask) {
      return NextResponse.json({ error: 'Asking task not found' }, { status: 404 })
    }

    const updatedTask = await prisma.askingTask.update({
      where: { id },
      data: {
        notes,
        notesUpdatedBy: user.id,
        updatedAt: new Date(),
      },
      include: {
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
      },
    })

    return NextResponse.json({
      success: true,
      askingTask: updatedTask,
    })
  } catch (error) {
    console.error('Error updating asking task notes:', error)
    return NextResponse.json(
      { error: 'Failed to update asking task notes' },
      { status: 500 }
    )
  }
}
