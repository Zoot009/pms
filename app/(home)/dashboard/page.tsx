import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'
import { UserRole } from '@/lib/generated/prisma'

export default async function DashboardPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Redirect based on user role
  switch (user.role) {
    case UserRole.ADMIN:
      redirect('/admin/dashboard')
    case UserRole.ORDER_CREATOR:
      redirect('/order-creator/dashboard')
    case UserRole.MEMBER:
      // Check if user is a team leader
      const isTeamLeader = await prisma.team.findFirst({
        where: {
          leaderId: user.id,
        },
        select: {
          id: true,
        },
      })

      if (isTeamLeader) {
        redirect('/member/team/dashboard')
      } else {
        redirect('/member/dashboard')
      }
    default:
      redirect('/auth/login')
  }
}
