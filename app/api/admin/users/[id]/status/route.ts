import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser, createAuditLog } from '@/lib/auth-utils'
import { UserRole, AuditAction } from '@/lib/generated/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser || currentUser.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const body = await request.json()
    const { isActive } = body

    const oldUser = await prisma.user.findUnique({
      where: { id: resolvedParams.id },
    })

    if (!oldUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const user = await prisma.user.update({
      where: { id: resolvedParams.id },
      data: { isActive },
    })

    // Create audit log
    await createAuditLog({
      entityType: 'User',
      entityId: user.id,
      action: AuditAction.UPDATE,
      performedBy: currentUser.id,
      oldValue: { isActive: oldUser.isActive },
      newValue: { isActive: user.isActive },
      description: `${isActive ? 'Activated' : 'Deactivated'} user ${user.email}`,
      request,
    })

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error updating user status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
