import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-utils'
import { UserRole } from '@/lib/generated/prisma'

export default async function OrderCreatorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Only ORDER_CREATOR or ADMIN role can access order creator routes
  if (user.role !== UserRole.ORDER_CREATOR && user.role !== UserRole.ADMIN) {
    redirect('/auth/unauthorized')
  }

  return <>{children}</>
}
