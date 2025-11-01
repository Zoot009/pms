import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-utils'
import { UserRole } from '@/lib/generated/prisma'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Only ADMIN role can access admin routes
  if (user.role !== UserRole.ADMIN) {
    redirect('/auth/unauthorized')
  }

  return <>{children}</>
}
