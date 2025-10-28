import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { UserRole } from '@/lib/generated/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser || currentUser.role !== UserRole.ADMIN) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 })
    }

    const resolvedParams = await params
    const team = await prisma.team.findUnique({
      where: { id: resolvedParams.id },
      include: {
        members: {
          select: {
            userId: true,
          },
        },
      },
    })

    if (!team) {
      return NextResponse.json({ message: 'Team not found' }, { status: 404 })
    }

    // Get current member user IDs
    const currentMemberIds = team.members.map((m) => m.userId)

    // Get all active users who are not already members
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        id: {
          notIn: currentMemberIds,
        },
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
      },
      orderBy: {
        displayName: 'asc',
      },
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Error fetching available users:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
