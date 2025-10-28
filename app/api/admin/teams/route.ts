import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser, createAuditLog } from '@/lib/auth-utils'
import { UserRole } from '@/lib/generated/prisma'

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser || currentUser.role !== UserRole.ADMIN) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const { name, slug, leaderId } = body

    // Validate required fields
    if (!name || !leaderId) {
      return NextResponse.json(
        { message: 'Team name and leader are required' },
        { status: 400 }
      )
    }

    // Check if leader exists and is active
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

    // Check if slug is unique
    if (slug) {
      const existingTeam = await prisma.team.findUnique({
        where: { slug },
      })

      if (existingTeam) {
        return NextResponse.json(
          { message: 'Team slug already exists' },
          { status: 400 }
        )
      }
    }

    // Create team
    const team = await prisma.team.create({
      data: {
        name,
        slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        leaderId,
        isActive: true,
      },
      include: {
        leader: true,
      },
    })

    // Create audit log
    await createAuditLog({
      action: 'CREATE',
      entityType: 'Team',
      entityId: team.id,
      performedBy: currentUser.id,
      description: `Created team: ${team.name}`,
      newValue: JSON.stringify(team),
      request,
    })

    return NextResponse.json(
      { message: 'Team created successfully', team },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating team:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser || currentUser.role !== UserRole.ADMIN) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 })
    }

    const teams = await prisma.team.findMany({
      include: {
        leader: true,
        _count: {
          select: {
            members: true,
            services: true,
            tasks: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ teams })
  } catch (error) {
    console.error('Error fetching teams:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
