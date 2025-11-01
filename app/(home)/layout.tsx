import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-utils'
import { AppSidebar } from '@/components/app-sidebar'
import { PageHeader } from '@/components/page-header'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { UserRole } from '@/lib/generated/prisma'
import prisma from '@/lib/prisma'
import {
  adminNavGroups,
  memberNavGroups,
  teamLeaderNavGroups,
  orderCreatorNavGroups,
} from '@/lib/nav-config'

export default async function HomeLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }
  console.log('User Role:', user.role)
  
  // Get the current path segment to determine which section user is trying to access
  // Note: In the real app, we'd use headers() or another method to get the pathname
  // For now, we'll do basic role checks in the layout
  
  // Determine navigation groups and dashboard href based on role
  let navGroups = memberNavGroups
  let dashboardHref = '/member/dashboard'

  if (user.role === UserRole.ADMIN) {
    navGroups = adminNavGroups
    dashboardHref = '/admin/dashboard'
  } else if (user.role === UserRole.ORDER_CREATOR) {
    navGroups = orderCreatorNavGroups
    dashboardHref = '/order-creator/dashboard'
  } else if (user.role === UserRole.MEMBER) {
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
      navGroups = teamLeaderNavGroups
      dashboardHref = '/member/team/dashboard'
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar
        user={{
          displayName: user.displayName || user.email,
          email: user.email,
          avatar: user.avatar,
          role: user.role,
        }}
        dashboardHref={dashboardHref}
        navGroups={navGroups}
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
