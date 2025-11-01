import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ShieldAlert } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth-utils'
import { UserRole } from '@/lib/generated/prisma'

export default async function UnauthorizedPage() {
  const user = await getCurrentUser()
  
  // Determine the correct dashboard based on user role
  let dashboardHref = '/auth/login'
  if (user) {
    switch (user.role) {
      case UserRole.ADMIN:
        dashboardHref = '/admin/dashboard'
        break
      case UserRole.ORDER_CREATOR:
        dashboardHref = '/order-creator/dashboard'
        break
      case UserRole.MEMBER:
        dashboardHref = '/member/dashboard'
        break
      default:
        dashboardHref = '/auth/login'
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <ShieldAlert className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-2xl">Access Denied</CardTitle>
          <CardDescription>
            You don't have permission to access this page.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-center text-sm text-muted-foreground">
            If you believe this is an error, please contact your administrator.
          </p>
          <Button asChild className="w-full">
            <Link href={dashboardHref}>
              {user ? 'Go to My Dashboard' : 'Back to Login'}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
