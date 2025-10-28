import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'
import { AskingStageType } from '@/lib/generated/prisma'

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
    const { 
      stage,
      initialConfirmation,
      initialStaff,
      updateRequest,
      updateStaff,
      notes
    } = body

    // Verify the asking task exists and is assigned to the user
    const askingTask = await prisma.askingTask.findFirst({
      where: {
        id,
        assignedTo: user.id
      }
    })

    if (!askingTask) {
      return NextResponse.json(
        { error: 'Asking task not found or not assigned to you' },
        { status: 404 }
      )
    }

    // Validate stage
    const validStages = Object.values(AskingStageType)
    if (stage && !validStages.includes(stage)) {
      return NextResponse.json(
        { error: 'Invalid stage value' },
        { status: 400 }
      )
    }

    const stageToUse = stage || askingTask.currentStage

    // Create stage history entry
    await prisma.askingTaskStage.create({
      data: {
        askingTaskId: id,
        stage: stageToUse,
        initialConfirmation,
        initialStaff,
        updateRequest,
        updateStaff,
        notes,
        completedBy: user.id,
        completedAt: new Date()
      }
    })

    // Update asking task current stage
    const updatedTask = await prisma.askingTask.update({
      where: { id },
      data: {
        currentStage: stageToUse,
        // Mark as completed if reached INFORMED_TEAM stage
        completedAt: stageToUse === 'INFORMED_TEAM' ? new Date() : askingTask.completedAt
      },
      include: {
        order: {
          select: {
            orderNumber: true,
            customerName: true
          }
        },
        service: {
          select: {
            name: true
          }
        },
        stageHistory: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      askingTask: {
        id: updatedTask.id,
        serviceName: updatedTask.service.name,
        currentStage: updatedTask.currentStage,
        deadline: updatedTask.deadline,
        stageHistory: updatedTask.stageHistory,
        orderNumber: updatedTask.order.orderNumber,
        customerName: updatedTask.order.customerName
      }
    })
  } catch (error) {
    console.error('Error updating asking task:', error)
    return NextResponse.json(
      { error: 'Failed to update asking task' },
      { status: 500 }
    )
  }
}
