import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser, createAuditLog } from '@/lib/auth-utils'
import { UserRole } from '@/lib/generated/prisma'

export async function PATCH(
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
        leader: true,
      },
    })

    if (!team) {
      return NextResponse.json({ message: 'Team not found' }, { status: 404 })
    }

    // Toggle isActive status
    const updatedTeam = await prisma.team.update({
      where: { id: resolvedParams.id },
      data: {
        isActive: !team.isActive,
      },
      include: {
        leader: true,
        members: {
          where: { isActive: true },
          include: {
            user: true,
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
      action: 'UPDATE',
      entityType: 'Team',
      entityId: updatedTeam.id,
      performedBy: currentUser.id,
      description: `${updatedTeam.isActive ? 'Activated' : 'Deactivated'} team: ${updatedTeam.name}`,
      oldValue: JSON.stringify({ isActive: team.isActive }),
      newValue: JSON.stringify({ isActive: updatedTeam.isActive }),
      request,
    })

    return NextResponse.json({
      message: `Team ${updatedTeam.isActive ? 'activated' : 'deactivated'} successfully`,
      team: updatedTeam,
    })
  } catch (error) {
    console.error('Error updating team status:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
