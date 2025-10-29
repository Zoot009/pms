import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-utils'
import { AppSidebar } from '@/components/app-sidebar'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { PageHeader } from '@/components/page-header'
import prisma from '@/lib/prisma'

const getNavItems = async (userId: string, userRole: string) => {
  // Check if user is a team leader
  const isTeamLeader = await prisma.team.findFirst({
    where: { leaderId: userId },
    select: { id: true },
  })

  // Base navigation items for all users
  const baseNavItems = [
    {
      title: 'Dashboard',
      href: userRole === 'ADMIN' ? '/admin/dashboard' : '/member/dashboard',
      icon: 'LayoutDashboard',
    },
    {
      title: 'My Tasks',
      href: '/member/tasks',
      icon: 'ListTodo',
    },
    {
      title: 'Orders',
      href: '/orders',
      icon: 'Package',
    },
    {
      title: 'Asking Tasks',
      href: '/asking-tasks',
      icon: 'MessageSquare',
    },
  ]

  // Add admin-specific items
  if (userRole === 'ADMIN') {
    return [
      ...baseNavItems,
      {
        title: '---',
        href: '#',
        icon: 'Minus',
      },
      {
        title: 'Admin Panel',
        href: '/admin/dashboard',
        icon: 'Settings',
      },
      {
        title: 'Users',
        href: '/admin/users',
        icon: 'Users',
      },
      {
        title: 'Teams',
        href: '/admin/teams',
        icon: 'UsersRound',
      },
      {
        title: 'Services',
        href: '/admin/services',
        icon: 'Briefcase',
      },
    ]
  }

  // Add team leader items if applicable
  if (isTeamLeader) {
    return [
      ...baseNavItems,
      {
        title: '---',
        href: '#',
        icon: 'Minus',
      },
      {
        title: 'Team Dashboard',
        href: '/member/team/dashboard',
        icon: 'LayoutDashboard',
      },
      {
        title: 'Assign Tasks',
        href: '/member/team/assign-tasks',
        icon: 'UserPlus',
      },
      {
        title: 'Team Tasks',
        href: '/member/team/team-tasks',
        icon: 'ClipboardList',
      },
    ]
  }

  return baseNavItems
}

export default async function OrdersLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const navItems = await getNavItems(user.id, user.role)

  return (
    <SidebarProvider>
      <AppSidebar
        user={{
          displayName: user.displayName || user.email,
          email: user.email,
          avatar: user.avatar,
        }}
        navItems={navItems}
        title={user.role === 'ADMIN' ? 'Admin Panel' : 'Member Panel'}
      />
      <SidebarInset>
        <PageHeader />
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
