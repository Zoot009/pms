import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-utils'
import { AppSidebar } from '@/components/app-sidebar'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { PageHeader } from '@/components/page-header'
import prisma from '@/lib/prisma'

const memberNavItems = [
  {
    title: 'Dashboard',
    href: '/member/dashboard',
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
  {
    title: 'Completed Tasks',
    href: '/member/completed',
    icon: 'CheckCircle2',
  },
  {
    title: 'Schedule',
    href: '/member/schedule',
    icon: 'Calendar',
  },
  {
    title: 'Time Tracking',
    href: '/member/time-tracking',
    icon: 'Clock',
  },
]

const teamLeaderNavItems = [
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
  {
    title: 'Team Members',
    href: '/member/team/members',
    icon: 'Users',
  },
  {
    title: 'Reports',
    href: '/member/team/reports',
    icon: 'BarChart3',
  },
]

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user is a team leader
  const isTeamLeader = await prisma.team.findFirst({
    where: {
      leaderId: user.id,
    },
    select: {
      id: true,
    },
  })

  // Combine navigation items
  let navItems = [...memberNavItems]
  
  if (isTeamLeader) {
    // Add separator and team leader items
    navItems = [
      ...memberNavItems,
      {
        title: '---',
        href: '#',
        icon: 'Minus',
      },
      ...teamLeaderNavItems,
    ]
  }

  return (
    <SidebarProvider>
      <AppSidebar
        user={{
          displayName: user.displayName || user.email,
          email: user.email,
          avatar: user.avatar,
        }}
        navItems={navItems}
        title={isTeamLeader ? 'Member & Team Leader Panel' : 'Member Panel'}
      />
      <SidebarInset>
        <PageHeader />
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
