import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'all' // all, active, completed
    const flagged = searchParams.get('flagged') || 'all' // all, flagged, unflagged
    const stage = searchParams.get('stage') || 'all' // all, ASKED, SHARED, VERIFIED, INFORMED_TEAM
    const search = searchParams.get('search') || ''

    // Build where condition
    const whereCondition: any = {}

    // Status filter
    if (status === 'active') {
      whereCondition.completedAt = null
    } else if (status === 'completed') {
      whereCondition.completedAt = { not: null }
    }

    // Flagged filter
    if (flagged === 'flagged') {
      whereCondition.isFlagged = true
    } else if (flagged === 'unflagged') {
      whereCondition.isFlagged = false
    }

    // Stage filter
    if (stage !== 'all') {
      whereCondition.currentStage = stage
    }

    // Search filter
    if (search) {
      whereCondition.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { order: { orderNumber: { contains: search, mode: 'insensitive' } } },
        { order: { customerName: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const askingTasks = await prisma.askingTask.findMany({
      where: whereCondition,
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            customerName: true,
            deliveryDate: true,
            amount: true,
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
        completedUser: {
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
          take: 1, // Only get the latest entry for performance
        },
      },
      orderBy: [
        { isFlagged: 'desc' },
        { completedAt: 'asc' },
        { deadline: 'asc' },
        { createdAt: 'desc' },
      ],
    })

    return NextResponse.json({ askingTasks })
  } catch (error) {
    console.error('Error fetching asking tasks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch asking tasks' },
      { status: 500 }
    )
  }
}
