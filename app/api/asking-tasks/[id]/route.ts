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

    const askingTask = await prisma.askingTask.findUnique({
      where: { id },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            customerName: true,
            deliveryDate: true,
            folderLink: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        assignedUser: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
        stageHistory: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    })

    if (!askingTask) {
      return NextResponse.json({ error: 'Asking task not found' }, { status: 404 })
    }

    return NextResponse.json({ askingTask })
  } catch (error) {
    console.error('Error fetching asking task:', error)
    return NextResponse.json(
      { error: 'Failed to fetch asking task' },
      { status: 500 }
    )
  }
}
