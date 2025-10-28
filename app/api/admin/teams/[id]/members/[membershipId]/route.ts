import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser, createAuditLog } from '@/lib/auth-utils'
import { UserRole } from '@/lib/generated/prisma'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; membershipId: string }> }
) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser || currentUser.role !== UserRole.ADMIN) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 })
    }

    const resolvedParams = await params
    // Get membership details
    const membership = await prisma.teamMember.findUnique({
      where: { id: resolvedParams.membershipId },
      include: {
        user: true,
        team: true,
      },
    })

    if (!membership) {
      return NextResponse.json({ message: 'Membership not found' }, { status: 404 })
    }

    // Deactivate membership (soft delete)
    await prisma.teamMember.update({
      where: { id: resolvedParams.membershipId },
      data: { isActive: false },
    })

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
      action: 'DELETE',
      entityType: 'TeamMember',
      entityId: resolvedParams.membershipId,
      performedBy: currentUser.id,
      description: `Removed ${membership.user.displayName || membership.user.email} from team ${membership.team.name}`,
      oldValue: JSON.stringify(membership),
      request,
    })

    return NextResponse.json({
      message: 'Member removed successfully',
      team: updatedTeam,
    })
  } catch (error) {
    console.error('Error removing team member:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
