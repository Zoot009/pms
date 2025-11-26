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
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // Build where condition with AND array for proper nesting
    const whereCondition: any = {
      AND: [
        // Exclude asking tasks from delivered (completed) orders
        {
          order: {
            status: {
              not: 'COMPLETED'
            }
          }
        }
      ]
    }

    // Status filter
    if (status === 'active') {
      whereCondition.AND.push({ completedAt: null })
    } else if (status === 'completed') {
      whereCondition.AND.push({ completedAt: { not: null } })
    }

    // Flagged filter
    if (flagged === 'flagged') {
      whereCondition.AND.push({ isFlagged: true })
    } else if (flagged === 'unflagged') {
      whereCondition.AND.push({ isFlagged: false })
    }

    // Stage filter
    if (stage !== 'all') {
      whereCondition.AND.push({ currentStage: stage })
    }

    // Search filter - use OR within AND structure
    if (search) {
      whereCondition.AND.push({
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { order: { orderNumber: { contains: search, mode: 'insensitive' } } },
          { order: { customerName: { contains: search, mode: 'insensitive' } } },
        ]
      })
    }

    // Get total count for pagination
    const totalCount = await prisma.askingTask.count({
      where: whereCondition,
    })

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
            requiresCompletionNote: true,
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
      skip: (page - 1) * limit,
      take: limit,
    })

    return NextResponse.json({ 
      askingTasks,
      hasMore: (page * limit) < totalCount,
      totalCount,
      page,
      limit,
    })
  } catch (error) {
    console.error('Error fetching asking tasks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch asking tasks' },
      { status: 500 }
    )
  }
}
