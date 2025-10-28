import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-utils'
import { getRedirectPath } from '@/lib/auth-utils'

export default async function Home() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  // Redirect to appropriate dashboard based on role
  redirect(getRedirectPath(user.role))
}
