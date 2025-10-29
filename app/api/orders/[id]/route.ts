import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        orderType: {
          select: {
            id: true,
            name: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
        tasks: {
          include: {
            service: {
              select: {
                id: true,
                name: true,
                type: true,
                timeLimit: true,
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
                displayName: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        askingTasks: {
          include: {
            service: {
              select: {
                id: true,
                name: true,
                type: true,
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
                displayName: true,
                email: true,
              },
            },
            stageHistory: {
              orderBy: {
                createdAt: 'desc',
              },
              take: 1,
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        services: {
          include: {
            service: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Check access permissions
    if (currentUser.role === 'MEMBER') {
      const hasAccess =
        (order as any).tasks.some((t: any) => t.assignedTo === currentUser.id) ||
        (order as any).askingTasks.some((t: any) => t.assignedTo === currentUser.id)

      if (!hasAccess) {
        return NextResponse.json(
          { error: 'You do not have access to this order' },
          { status: 403 }
        )
      }
    }

    // Calculate statistics
    const allTasks = [...(order as any).tasks, ...(order as any).askingTasks]
    const totalTasks = allTasks.length
    const completedTasks = allTasks.filter((t: any) => 
      'completedAt' in t && t.completedAt !== null
    ).length
    const unassignedTasks = (order as any).tasks.filter((t: any) => t.status === 'NOT_ASSIGNED').length
    const overdueTasks = allTasks.filter((t: any) => {
      if ('completedAt' in t && t.completedAt) return false
      if (!t.deadline) return false
      return new Date(t.deadline) < new Date()
    }).length

    const mandatoryTasks = allTasks.filter((t: any) => 
      'isMandatory' in t && t.isMandatory
    )
    const mandatoryCompleted = mandatoryTasks.filter((t: any) => 
      'completedAt' in t && t.completedAt
    ).length
    const mandatoryRemaining = mandatoryTasks.length - mandatoryCompleted

    const createdAt = new Date(order.createdAt)
    const now = new Date()
    const daysOld = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))

    // Separate service tasks and custom tasks
    const serviceTasks = (order as any).tasks.filter((t: any) => t.serviceId !== null)
    const customTasks = (order as any).tasks.filter((t: any) => t.serviceId === null)

    // Calculate asking task progress
    const askingTasksWithProgress = (order as any).askingTasks.map((at: any) => {
      const stageProgress = {
        ASKED: false,
        SHARED: false,
        VERIFIED: false,
        INFORMED_TEAM: false,
      }

      // Mark completed stages based on stage history
      const stages = ['ASKED', 'SHARED', 'VERIFIED', 'INFORMED_TEAM']
      const currentStageIndex = stages.indexOf(at.currentStage)
      
      for (let i = 0; i <= currentStageIndex; i++) {
        stageProgress[stages[i] as keyof typeof stageProgress] = true
      }

      const completedStages = Object.values(stageProgress).filter(Boolean).length
      const totalStages = 4

      return {
        ...at,
        progress: {
          completed: completedStages,
          total: totalStages,
          percentage: Math.round((completedStages / totalStages) * 100),
          stages: stageProgress,
        },
      }
    })

    return NextResponse.json({
      order: {
        ...order,
        askingTasks: askingTasksWithProgress,
      },
      statistics: {
        totalTasks,
        completedTasks,
        unassignedTasks,
        overdueTasks,
        mandatoryTasks: mandatoryTasks.length,
        mandatoryCompleted,
        mandatoryRemaining,
        daysOld,
      },
      taskGroups: {
        serviceTasks,
        customTasks,
        askingTasks: askingTasksWithProgress,
        mandatoryAskingTasks: askingTasksWithProgress.filter((at: any) => at.isMandatory),
      },
    })
  } catch (error) {
    console.error('Error fetching order details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch order details' },
      { status: 500 }
    )
  }
}
