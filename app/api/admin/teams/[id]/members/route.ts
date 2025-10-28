import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser, createAuditLog } from '@/lib/auth-utils'
import { UserRole } from '@/lib/generated/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser || currentUser.role !== UserRole.ADMIN) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json({ message: 'User ID is required' }, { status: 400 })
    }

    const resolvedParams = await params
    // Check if team exists
    const team = await prisma.team.findUnique({
      where: { id: resolvedParams.id },
    })

    if (!team) {
      return NextResponse.json({ message: 'Team not found' }, { status: 404 })
    }

    // Check if user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    if (!user.isActive) {
      return NextResponse.json(
        { message: 'Cannot add inactive user to team' },
        { status: 400 }
      )
    }

    // Check if user is already a member
    const existingMembership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: resolvedParams.id,
          userId: userId,
        },
      },
    })

    if (existingMembership) {
      if (existingMembership.isActive) {
        return NextResponse.json(
          { message: 'User is already a member of this team' },
          { status: 400 }
        )
      } else {
        // Reactivate membership
        await prisma.teamMember.update({
          where: { id: existingMembership.id },
          data: { isActive: true },
        })
      }
    } else {
      // Create new membership
      await prisma.teamMember.create({
        data: {
          teamId: resolvedParams.id,
          userId: userId,
          isActive: true,
        },
      })
    }

    // Get updated team
    const updatedTeam = await prisma.team.findUnique({
      where: { id: resolvedParams.id },
      include: {
        leader: true,
        members: {
          where: { isActive: true },
          include: {
            user: true,
          },
          orderBy: {
            joinedAt: 'desc',
          },
        },
        _count: {
          select: {
            services: true,
            tasks: true,
          },
        },
      },
    })

    // Create audit log
    await createAuditLog({
      action: 'CREATE',
      entityType: 'TeamMember',
      entityId: resolvedParams.id,
      performedBy: currentUser.id,
      description: `Added ${user.displayName || user.email} to team ${team.name}`,
      newValue: JSON.stringify({ teamId: resolvedParams.id, userId }),
      request,
    })

    return NextResponse.json({
      message: 'Member added successfully',
      team: updatedTeam,
    })
  } catch (error) {
    console.error('Error adding team member:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
