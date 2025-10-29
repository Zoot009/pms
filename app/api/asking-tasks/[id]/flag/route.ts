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
    const { isFlagged, notes } = body

    const askingTask = await prisma.askingTask.findUnique({
      where: { id },
    })

    if (!askingTask) {
      return NextResponse.json({ error: 'Asking task not found' }, { status: 404 })
    }

    const updatedTask = await prisma.askingTask.update({
      where: { id },
      data: {
        isFlagged: isFlagged !== undefined ? isFlagged : askingTask.isFlagged,
        // notes: notes !== undefined ? notes : askingTask.notes, // Will work after Prisma generate
      },
      include: {
        order: {
          select: {
            orderNumber: true,
            customerName: true,
          },
        },
        service: {
          select: {
            name: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      askingTask: updatedTask,
    })
  } catch (error) {
    console.error('Error updating asking task flag:', error)
    return NextResponse.json(
      { error: 'Failed to update asking task' },
      { status: 500 }
    )
  }
}
