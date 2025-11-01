import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'
import { UserRole } from '@/lib/generated/prisma'
import { redirect } from 'next/navigation'

export async function getCurrentUser() {
  const supabase = await createClient()
  
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    return null
  }

  // Get user from database with full details
  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    include: {
      teamMemberships: {
        where: { isActive: true },
        include: {
          team: true,
        },
      },
      leadingTeams: {
        where: { isActive: true },
      },
    },
  })

  return user
}

export async function requireAuth() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/auth/login')
  }
  
  return user
}

export async function requireRole(allowedRoles: UserRole[]) {
  const user = await requireAuth()
  
  if (!allowedRoles.includes(user.role)) {
    redirect('/auth/unauthorized')
  }
  
  return user
}

export async function requireAdmin() {
  return requireRole([UserRole.ADMIN])
}

export async function requireTeamLeader(teamId: string) {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/auth/login')
  }
  
  // Check if user is admin or leads the specific team
  if (user.role === UserRole.ADMIN) {
    return user
  }
  
  const isLeader = await isTeamLeader(user.id, teamId)
  if (!isLeader) {
    redirect('/unauthorized')
  }
  
  return user
}

export async function isTeamLeader(userId: string, teamId: string) {
  const team = await prisma.team.findFirst({
    where: {
      id: teamId,
      leaderId: userId,
      isActive: true,
    },
  })
  
  return !!team
}

export async function isTeamMember(userId: string, teamId: string) {
  const membership = await prisma.teamMember.findFirst({
    where: {
      userId,
      teamId,
      isActive: true,
    },
  })
  
  return !!membership
}

export function getRedirectPath(role: UserRole) {
  switch (role) {
    case UserRole.ADMIN:
      return '/admin/dashboard'
    case UserRole.MEMBER:
      return '/member/dashboard'
    case UserRole.ORDER_CREATOR:
      return '/orders'
    default:
      return '/dashboard'
  }
}
