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
    const { userId, userIds } = body

    // Support both single user (userId) and multiple users (userIds)
    const targetUserIds = userIds || (userId ? [userId] : [])

    if (!targetUserIds || targetUserIds.length === 0) {
      return NextResponse.json({ message: 'At least one User ID is required' }, { status: 400 })
    }

    const resolvedParams = await params
    
    // Check if team exists
    const team = await prisma.team.findUnique({
      where: { id: resolvedParams.id },
    })

    if (!team) {
      return NextResponse.json({ message: 'Team not found' }, { status: 404 })
    }

    const results = {
      added: [] as string[],
      reactivated: [] as string[],
      alreadyMembers: [] as string[],
      notFound: [] as string[],
      inactive: [] as string[],
    }

    // Process each user
    for (const uid of targetUserIds) {
      // Check if user exists and is active
      const user = await prisma.user.findUnique({
        where: { id: uid },
      })

      if (!user) {
        results.notFound.push(uid)
        continue
      }

      if (!user.isActive) {
        results.inactive.push(user.email)
        continue
      }

      // Check if user is already a member
      const existingMembership = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId: resolvedParams.id,
            userId: uid,
          },
        },
      })

      if (existingMembership) {
        if (existingMembership.isActive) {
          results.alreadyMembers.push(user.email)
        } else {
          // Reactivate membership
          await prisma.teamMember.update({
            where: { id: existingMembership.id },
            data: { isActive: true },
          })
          results.reactivated.push(user.email)
        }
      } else {
        // Create new membership
        await prisma.teamMember.create({
          data: {
            teamId: resolvedParams.id,
            userId: uid,
            isActive: true,
          },
        })
        results.added.push(user.email)
      }
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

    // Create audit log for successful additions
    if (results.added.length > 0 || results.reactivated.length > 0) {
      const allAdded = [...results.added, ...results.reactivated]
      await createAuditLog({
        action: 'CREATE',
        entityType: 'TeamMember',
        entityId: resolvedParams.id,
        performedBy: currentUser.id,
        description: `Added ${allAdded.length} member(s) to team ${team.name}: ${allAdded.join(', ')}`,
        newValue: JSON.stringify({ teamId: resolvedParams.id, userIds: targetUserIds, results }),
        request,
      })
    }

    // Build response message
    const messages = []
    if (results.added.length > 0) {
      messages.push(`✅ Added ${results.added.length} member(s)`)
    }
    if (results.reactivated.length > 0) {
      messages.push(`🔄 Reactivated ${results.reactivated.length} member(s)`)
    }
    if (results.alreadyMembers.length > 0) {
      messages.push(`ℹ️ ${results.alreadyMembers.length} already member(s)`)
    }
    if (results.inactive.length > 0) {
      messages.push(`⚠️ ${results.inactive.length} inactive user(s) skipped`)
    }
    if (results.notFound.length > 0) {
      messages.push(`❌ ${results.notFound.length} user(s) not found`)
    }

    return NextResponse.json({
      message: messages.join(' | ') || 'No changes made',
      team: updatedTeam,
      results,
    })
  } catch (error) {
    console.error('Error adding team member:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
