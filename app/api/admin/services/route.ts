import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser, createAuditLog } from '@/lib/auth-utils'

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      name,
      type,
      teamId,
      timeLimit,
      description,
      detailStructure,
      isMandatory,
      hasTaskCount,
      taskCount,
    } = body

    if (!name || !type || !teamId) {
      return NextResponse.json(
        { message: 'Name, type, and team are required' },
        { status: 400 }
      )
    }

    const slug = generateSlug(name)

    // Check if slug already exists
    const existingService = await prisma.service.findUnique({
      where: { slug },
    })

    if (existingService) {
      return NextResponse.json(
        { message: 'A service with this name already exists' },
        { status: 400 }
      )
    }

    // Create service with optional AskingDetail
    const service = await prisma.service.create({
      data: {
        name,
        slug,
        type,
        teamId,
        timeLimit: timeLimit || null,
        description: description || null,
        isMandatory: isMandatory || false,
        hasTaskCount: hasTaskCount || false,
        taskCount: taskCount || null,
        createdById: user.id,
        ...(type === 'ASKING_SERVICE' && detailStructure
          ? {
              askingDetails: {
                create: {
                  detail: detailStructure,
                },
              },
            }
          : {}),
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        askingDetails: true,
      },
    })

    // Create audit log
    await createAuditLog({
      performedBy: user.id,
      action: 'CREATE',
      entityType: 'SERVICE',
      entityId: service.id,
      description: `Created service: ${service.name}`,
    })

    return NextResponse.json(service, { status: 201 })
  } catch (error) {
    console.error('Error creating service:', error)
    return NextResponse.json(
      { message: 'Failed to create service' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const services = await prisma.service.findMany({
      include: {
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        askingDetails: true,
        _count: {
          select: {
            tasks: true,
            askingTasks: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(services)
  } catch (error) {
    console.error('Error fetching services:', error)
    return NextResponse.json(
      { message: 'Failed to fetch services' },
      { status: 500 }
    )
  }
}
