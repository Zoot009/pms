import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser, createAuditLog } from '@/lib/auth-utils'
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

    if (!team) {
      return NextResponse.json({ message: 'Team not found' }, { status: 404 })
    }

    return NextResponse.json({ team })
  } catch (error) {
    console.error('Error fetching team:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser || currentUser.role !== UserRole.ADMIN) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const { name, slug, leaderId } = body

    const resolvedParams = await params
    // Get existing team for audit log
    const existingTeam = await prisma.team.findUnique({
      where: { id: resolvedParams.id },
    })

    if (!existingTeam) {
      return NextResponse.json({ message: 'Team not found' }, { status: 404 })
    }

    // Validate leader if being changed
    if (leaderId && leaderId !== existingTeam.leaderId) {
      const leader = await prisma.user.findUnique({
        where: { id: leaderId },
      })

      if (!leader) {
        return NextResponse.json({ message: 'Team leader not found' }, { status: 404 })
      }

      if (!leader.isActive) {
        return NextResponse.json(
          { message: 'Team leader must be an active user' },
          { status: 400 }
        )
      }
    }

    // Check if slug is unique (if being changed)
    if (slug && slug !== existingTeam.slug) {
      const slugExists = await prisma.team.findUnique({
        where: { slug },
      })

      if (slugExists) {
        return NextResponse.json(
          { message: 'Team slug already exists' },
          { status: 400 }
        )
      }
    }

    // Update team
    const team = await prisma.team.update({
      where: { id: resolvedParams.id },
      data: {
        name: name || existingTeam.name,
        slug: slug || existingTeam.slug,
        leaderId: leaderId || existingTeam.leaderId,
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
      entityId: team.id,
      performedBy: currentUser.id,
      description: `Updated team: ${team.name}`,
      oldValue: JSON.stringify(existingTeam),
      newValue: JSON.stringify(team),
      request,
    })

    return NextResponse.json({ message: 'Team updated successfully', team })
  } catch (error) {
    console.error('Error updating team:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
