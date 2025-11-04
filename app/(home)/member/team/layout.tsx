import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'

export default async function TeamLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  if (!user) {
    console.log('[Team Layout] No user found, redirecting to login')
    redirect('/auth/login')
  }

  console.log('[Team Layout] Checking team leader access for user:', {
    id: user.id,
    email: user.email,
    role: user.role
  })

  // Check if user is a team leader - query the database directly
  const teams = await prisma.team.findMany({
    where: {
      leaderId: user.id,
    },
    select: {
      id: true,
      name: true,
      isActive: true,
    },
  })

  console.log('[Team Layout] Team query result:', {
    totalTeams: teams.length,
    teams: teams.map(t => ({ id: t.id, name: t.name, isActive: t.isActive })),
  })

  const isTeamLeader = teams.length > 0

  console.log('[Team Layout] Team leader check result:', {
    isTeamLeader,
    hasAnyTeam: teams.length > 0,
    activeTeams: teams.filter(t => t.isActive).length,
  })

  if (!isTeamLeader) {
    console.error('[Team Layout] ACCESS DENIED - User is not a team leader')
    console.error('[Team Layout] User ID:', user.id)
    console.error('[Team Layout] Please assign this user as a team leader in the Admin > Teams section')
    redirect('/unauthorized')
  }

  console.log('[Team Layout] ✅ Access granted - user is a team leader')
  return <>{children}</>
}
