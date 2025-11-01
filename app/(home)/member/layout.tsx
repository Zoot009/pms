import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-utils'
import { UserRole } from '@/lib/generated/prisma'

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Only MEMBER role can access member routes
  if (user.role !== UserRole.MEMBER) {
    redirect('/auth/unauthorized')
  }

  return <>{children}</>
}
