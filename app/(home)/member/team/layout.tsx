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
    redirect('/login')
  }

  // Check if user is a team leader
  const isTeamLeader = await prisma.team.findFirst({
    where: {
      leaderId: user.id,
    },
    select: {
      id: true,
    },
  })

  if (!isTeamLeader) {
    redirect('/unauthorized')
  }

  return <>{children}</>
}
