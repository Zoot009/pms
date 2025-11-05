import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser, createAuditLog } from '@/lib/auth-utils'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()

    if (!user || (user.role !== 'ADMIN' && user.role !== 'ORDER_CREATOR')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const service = await prisma.service.findUnique({
      where: { id },
    })

    if (!service) {
      return NextResponse.json({ message: 'Service not found' }, { status: 404 })
    }

    const updatedService = await prisma.service.update({
      where: { id },
      data: {
        isActive: !service.isActive,
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
      oldValue: { isActive: service.isActive },
      newValue: { isActive: updatedService.isActive },
      description: `${updatedService.isActive ? 'Activated' : 'Deactivated'} service: ${service.name}`,
    })

    return NextResponse.json(updatedService)
  } catch (error) {
    console.error('Error toggling service status:', error)
    return NextResponse.json(
      { message: 'Failed to update service status' },
      { status: 500 }
    )
  }
}
