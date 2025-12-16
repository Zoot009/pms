import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-utils'
import { AppSidebar } from '@/components/app-sidebar'
import { PageHeader } from '@/components/page-header'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { revisionManagerNavGroups } from '@/lib/nav-config'

export default async function RevisionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/auth/login')
  }

  // Check if user has REVISION_MANAGER or ADMIN role
  // No need to query DB again - we already have the user role from auth
  if (user.role !== 'REVISION_MANAGER' && user.role !== 'ADMIN') {
    redirect('/auth/unauthorized')
  }

  const environment = process.env.ENVIRONMENT || 'development'

  return (
    <SidebarProvider>
      <AppSidebar
        user={{
          displayName: user.displayName || user.email,
          email: user.email,
          avatar: user.avatar,
          role: user.role,
        }}
        dashboardHref="/revision/delivered-order"
        navGroups={revisionManagerNavGroups}
        environment={environment}
      />
      <SidebarInset>
        <PageHeader />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
