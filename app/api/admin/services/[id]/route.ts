import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser, createAuditLog } from '@/lib/auth-utils'

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const service = await prisma.service.findUnique({
      where: { id },
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
    })

    if (!service) {
      return NextResponse.json({ message: 'Service not found' }, { status: 404 })
    }

    // Rename askingDetails to askingDetail for frontend compatibility
    const { askingDetails, ...serviceData } = service
    return NextResponse.json({
      ...serviceData,
      askingDetail: askingDetails,
    })
  } catch (error) {
    console.error('Error fetching service:', error)
    return NextResponse.json(
      { message: 'Failed to fetch service' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
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

    // Check if service exists
    const existingService = await prisma.service.findUnique({
      where: { id },
      include: {
        askingDetails: true,
      },
    })

    if (!existingService) {
      return NextResponse.json({ message: 'Service not found' }, { status: 404 })
    }

    // If name changed, generate new slug and check uniqueness
    let slug = existingService.slug
    if (name && name !== existingService.name) {
      slug = generateSlug(name)
      
      const slugExists = await prisma.service.findFirst({
        where: {
          slug,
          id: { not: id },
        },
      })

      if (slugExists) {
        return NextResponse.json(
          { message: 'A service with this name already exists' },
          { status: 400 }
        )
      }
    }

    // Handle AskingDetail update/create/delete
    let askingDetailUpdate = {}
    
    if (type === 'ASKING_SERVICE') {
      if (existingService.askingDetails) {
        // Update existing
        askingDetailUpdate = {
          askingDetails: {
            update: {
              detail: detailStructure || null,
            },
          },
        }
      } else {
        // Create new
        askingDetailUpdate = {
          askingDetails: {
            create: {
              detail: detailStructure || null,
            },
          },
        }
      }
    } else if (existingService.askingDetails && type === 'SERVICE_TASK') {
      // Delete if changed from ASKING_SERVICE to SERVICE_TASK
      askingDetailUpdate = {
        askingDetails: {
          delete: true,
        },
      }
    }

    // Update service
    const updatedService = await prisma.service.update({
      where: { id },
      data: {
        name: name ?? existingService.name,
        slug,
        type: type ?? existingService.type,
        teamId: teamId ?? existingService.teamId,
        timeLimit: timeLimit !== undefined ? timeLimit : existingService.timeLimit,
        description: description !== undefined ? description : existingService.description,
        isMandatory: isMandatory !== undefined ? isMandatory : existingService.isMandatory,
        hasTaskCount: hasTaskCount !== undefined ? hasTaskCount : existingService.hasTaskCount,
        taskCount: hasTaskCount ? (taskCount ?? null) : null,
        ...askingDetailUpdate,
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
      action: 'UPDATE',
      entityType: 'SERVICE',
      entityId: id,
      oldValue: existingService,
      newValue: updatedService,
      description: `Updated service: ${updatedService.name}`,
    })

    // Rename askingDetails to askingDetail for frontend compatibility
    const { askingDetails, ...serviceData } = updatedService
    return NextResponse.json({
      ...serviceData,
      askingDetail: askingDetails,
    })
  } catch (error) {
    console.error('Error updating service:', error)
    return NextResponse.json(
      { message: 'Failed to update service' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const service = await prisma.service.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            tasks: true,
            askingTasks: true,
          },
        },
      },
    })

    if (!service) {
      return NextResponse.json({ message: 'Service not found' }, { status: 404 })
    }

    // Check if service is being used
    if (service._count.tasks > 0 || service._count.askingTasks > 0) {
      return NextResponse.json(
        {
          message:
            'Cannot delete service that has associated tasks. Please deactivate instead.',
        },
        { status: 400 }
      )
    }

    await prisma.service.delete({
      where: { id },
    })

    // Create audit log
    await createAuditLog({
      performedBy: user.id,
      action: 'DELETE',
      entityType: 'SERVICE',
      entityId: id,
      oldValue: service,
      description: `Deleted service: ${service.name}`,
    })

    return NextResponse.json({ message: 'Service deleted successfully' })
  } catch (error) {
    console.error('Error deleting service:', error)
    return NextResponse.json(
      { message: 'Failed to delete service' },
      { status: 500 }
    )
  }
}
