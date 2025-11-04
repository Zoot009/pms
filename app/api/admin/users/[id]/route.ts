import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser, createAuditLog } from '@/lib/auth-utils'
import { UserRole, AuditAction } from '@/lib/generated/prisma'
import { createAdminClient } from '@/lib/supabase/admin'

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
    const { firstName, lastName, employeeId, role } = body

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
        lastName: lastName || null,
        displayName: lastName ? `${firstName} ${lastName}` : firstName,
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser || currentUser.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    
    // Get user data before deletion for audit log
    const userToDelete = await prisma.user.findUnique({
      where: { id: resolvedParams.id },
    })

    if (!userToDelete) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Prevent deletion of own account
    if (userToDelete.id === currentUser.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      )
    }

    // Delete the user from the database (cascade will handle related records)
    await prisma.user.delete({
      where: { id: resolvedParams.id },
    })

    // Delete the user from Supabase Auth
    try {
      const supabaseAdmin = createAdminClient()
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(
        userToDelete.id
      )
      
      if (authError) {
        console.error('Error deleting user from Supabase Auth:', authError)
        // Log the error but don't fail the request since DB deletion succeeded
      }
    } catch (authError) {
      console.error('Error deleting user from Supabase Auth:', authError)
      // Log the error but don't fail the request since DB deletion succeeded
    }

    // Create audit log
    await createAuditLog({
      entityType: 'User',
      entityId: userToDelete.id,
      action: AuditAction.DELETE,
      performedBy: currentUser.id,
      oldValue: userToDelete,
      description: `Deleted user ${userToDelete.email}`,
      request,
    })

    return NextResponse.json({ 
      message: 'User deleted successfully',
      deletedUser: userToDelete 
    })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
