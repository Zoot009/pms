import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'
import { AskingStageType } from '@/lib/generated/prisma'

export async function POST(
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
    const {
      stage,
      initialConfirmationValue,
      updateRequestValue,
    } = body

    // Validate stage
    const validStages = Object.values(AskingStageType)
    if (stage && !validStages.includes(stage)) {
      return NextResponse.json({ error: 'Invalid stage value' }, { status: 400 })
    }

    const askingTask = await prisma.askingTask.findUnique({
      where: { id },
    })

    if (!askingTask) {
      return NextResponse.json({ error: 'Asking task not found' }, { status: 404 })
    }

    // Create new stage history entry with full audit trail
    const stageData: any = {
      askingTaskId: id,
      stage: stage || askingTask.currentStage,
    }

    // Track Initial Confirmation update
    if (initialConfirmationValue) {
      stageData.initialConfirmationValue = initialConfirmationValue
      stageData.initialConfirmationUpdatedBy = user.id
      stageData.initialConfirmationUpdatedAt = new Date()
    }

    // Track Update Request update
    if (updateRequestValue) {
      stageData.updateRequestValue = updateRequestValue
      stageData.updateRequestUpdatedBy = user.id
      stageData.updateRequestUpdatedAt = new Date()
    }

    // Create the stage history entry
    const stageHistory = await prisma.askingTaskStage.create({
      data: stageData,
    })

    // Update the asking task's current stage if provided
    if (stage) {
      await prisma.askingTask.update({
        where: { id },
        data: {
          currentStage: stage,
        },
      })
    }

    // Fetch updated asking task with full details
    const updatedTask = await prisma.askingTask.findUnique({
      where: { id },
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
        stageHistory: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      askingTask: updatedTask,
      stageHistory,
    })
  } catch (error) {
    console.error('Error updating asking task stage:', error)
    return NextResponse.json(
      { error: 'Failed to update asking task stage' },
      { status: 500 }
    )
  }
}
