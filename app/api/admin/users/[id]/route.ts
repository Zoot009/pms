import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser, createAuditLog } from '@/lib/auth-utils'
import { UserRole, AuditAction } from '@/lib/generated/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser || currentUser.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const user = await prisma.user.findUnique({
      where: { id: resolvedParams.id },
      include: {
        _count: {
          select: {
            teamMemberships: true,
            leadingTeams: true,
            assignedTasks: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const body = await request.json()
    const { firstName, lastName, phone, employeeId, role } = body

    const oldUser = await prisma.user.findUnique({
      where: { id: resolvedParams.id },
    })

    if (!oldUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const user = await prisma.user.update({
      where: { id: resolvedParams.id },
      data: {
        firstName,
        lastName,
        displayName: `${firstName} ${lastName}`,
        phone: phone || null,
        employeeId: employeeId || null,
        role: role as UserRole,
      },
    })

    // Create audit log
    await createAuditLog({
      entityType: 'User',
      entityId: user.id,
      action: AuditAction.UPDATE,
      performedBy: currentUser.id,
      oldValue: oldUser,
      newValue: user,
      description: `Updated user ${user.email}`,
      request,
    })

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
