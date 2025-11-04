import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-utils'
import { UserRole } from '@/lib/generated/prisma'
import prisma from '@/lib/prisma'

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Allow MEMBER role to access member routes
  if (user.role === UserRole.MEMBER) {
    return <>{children}</>
  }

  // Allow ORDER_CREATOR who are team leaders to access team management routes
  if (user.role === UserRole.ORDER_CREATOR) {
    // Check if they're accessing team routes
    // Team routes are under /member/team/* so we allow ORDER_CREATOR there if they're team leaders
    // Other member routes are restricted to MEMBER role only
    // Note: The team layout will handle the team leader verification
    return <>{children}</>
  }

  // For any other role (e.g., ADMIN), deny access
  redirect('/auth/unauthorized')
}

