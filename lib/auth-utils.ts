import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'
import { UserRole } from '@/lib/generated/prisma'

/**
 * Get current authenticated user from Supabase and database
 */
export async function getCurrentUser() {
  try {
    const supabase = await createClient()
    
    const {
      data: { user: authUser },
      error
    } = await supabase.auth.getUser()

    if (error || !authUser) {
      return null
    }

    // Get user from database with full details
    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      include: {
        teamMemberships: {
          where: { isActive: true },
          include: {
            team: {
              include: {
                leader: true,
              },
            },
          },
        },
        leadingTeams: {
          where: { isActive: true },
        },
      },
    })

    return user
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

/**
 * Sync Supabase user to database
 * Call this after user signs up or first login
 */
export async function syncUserToDatabase(authUser: any) {
  try {
    const user = await prisma.user.upsert({
      where: { id: authUser.id },
      update: {
        email: authUser.email!,
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      },
      create: {
        id: authUser.id,
        email: authUser.email!,
        displayName: authUser.user_metadata?.full_name || authUser.email!.split('@')[0],
        firstName: authUser.user_metadata?.first_name,
        lastName: authUser.user_metadata?.last_name,
        avatar: authUser.user_metadata?.avatar_url,
        role: UserRole.MEMBER, // Default role
        lastLoginAt: new Date(),
      },
    })

    return user
  } catch (error) {
    console.error('Error syncing user to database:', error)
    throw error
  }
}

/**
 * Check if user has required role
 */
export function hasRole(user: { role: UserRole }, allowedRoles: UserRole[]) {
  return allowedRoles.includes(user.role)
}

/**
 * Check if user is admin
 */
export function isAdmin(user: { role: UserRole }) {
  return user.role === UserRole.ADMIN
}

/**
 * Check if user is team leader of specific team
 */
export async function isTeamLeaderOf(userId: string, teamId: string) {
  const team = await prisma.team.findFirst({
    where: {
      id: teamId,
      leaderId: userId,
      isActive: true,
    },
  })
  
  return !!team
}

/**
 * Check if user is member of specific team
 */
export async function isTeamMemberOf(userId: string, teamId: string) {
  const membership = await prisma.teamMember.findFirst({
    where: {
      userId,
      teamId,
      isActive: true,
    },
  })
  
  return !!membership
}

/**
 * Get redirect path based on user role
 */
export function getRedirectPath(role: UserRole) {
  switch (role) {
    case UserRole.ADMIN:
      return '/admin/dashboard'
    case UserRole.MEMBER:
      return '/member/dashboard'
    case UserRole.ORDER_CREATOR:
      return '/orders'
    case UserRole.REVISION_MANAGER:
      return '/revision/delivered-order'
    default:
      return '/dashboard'
  }
}

/**
 * Create audit log entry
 */
export async function createAuditLog({
  entityType,
  entityId,
  action,
  performedBy,
  oldValue,
  newValue,
  description,
  request,
}: {
  entityType: string
  entityId: string
  action: any
  performedBy: string
  oldValue?: any
  newValue?: any
  description?: string
  request?: NextRequest
}) {
  try {
    await prisma.auditLog.create({
      data: {
        entityType,
        entityId,
        action,
        performedBy,
        oldValue: oldValue ? JSON.parse(JSON.stringify(oldValue)) : null,
        newValue: newValue ? JSON.parse(JSON.stringify(newValue)) : null,
        description,
        ipAddress: request?.headers.get('x-forwarded-for') || request?.headers.get('x-real-ip') || null,
        userAgent: request?.headers.get('user-agent') || null,
      },
    })
  } catch (error) {
    console.error('Error creating audit log:', error)
  }
}
