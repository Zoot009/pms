import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-utils'
import { AppSidebar } from '@/components/app-sidebar'
import { PageHeader } from '@/components/page-header'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { UserRole } from '@/lib/generated/prisma'
import prisma from '@/lib/prisma'

const adminNavGroups = [
  {
    title: 'ORDERS',
    items: [
      {
        title: 'All Orders',
        href: '/orders',
        icon: 'PackageSearch',
      },
      {
        title: 'Create Order',
        href: '/admin/orders/new',
        icon: 'Plus',
      },
      {
        title: 'Delivered',
        href: '/delivered',
        icon: 'PackageCheck',
      },
      {
        title: 'Asking Tasks',
        href: '/asking-tasks',
        icon: 'ClipboardList',
      },
    ],
  },
  {
    title: 'TEAM MANAGEMENT',
    items: [
      {
        title: 'Teams',
        href: '/admin/teams',
        icon: 'UsersRound',
      },
      {
        title: 'Users',
        href: '/admin/users',
        icon: 'Users',
      },
    ],
  },
  {
    title: 'CONFIGURATION',
    items: [
      {
        title: 'Services',
        href: '/admin/services',
        icon: 'Briefcase',
      },
      {
        title: 'Order Types',
        href: '/admin/order-types',
        icon: 'PackageSearch',
      },
      {
        title: 'Settings',
        href: '/admin/settings',
        icon: 'Settings',
      },
    ],
  },
]

const memberNavGroups = [
  {
    title: 'MY WORK',
    items: [
      {
        title: 'My Tasks',
        href: '/member/tasks',
        icon: 'ListTodo',
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
    ],
  },
  {
    title: 'ORDERS',
    items: [
      {
        title: 'All Orders',
        href: '/orders',
        icon: 'PackageSearch',
      },
      {
        title: 'Delivered',
        href: '/delivered',
        icon: 'PackageCheck',
      },
      {
        title: 'Asking Tasks',
        href: '/asking-tasks',
        icon: 'ClipboardList',
      },
    ],
  },
]

const teamLeaderNavGroups = [
  {
    title: 'MY WORK',
    items: [
      {
        title: 'My Tasks',
        href: '/member/tasks',
        icon: 'ListTodo',
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
    ],
  },
  {
    title: 'TEAM MANAGEMENT',
    items: [
      {
        title: 'Team Dashboard',
        href: '/member/team/dashboard',
        icon: 'LayoutDashboard',
      },
      {
        title: 'Assign Tasks',
        href: '/member/team/assign-tasks',
        icon: 'ClipboardList',
      },
      {
        title: 'Team Tasks',
        href: '/member/team/team-tasks',
        icon: 'Users',
      },
      {
        title: 'Team Members',
        href: '/member/team/members',
        icon: 'UsersRound',
      },
    ],
  },
  {
    title: 'ORDERS',
    items: [
      {
        title: 'All Orders',
        href: '/orders',
        icon: 'PackageSearch',
      },
      {
        title: 'Delivered',
        href: '/delivered',
        icon: 'PackageCheck',
      },
      {
        title: 'Asking Tasks',
        href: '/asking-tasks',
        icon: 'ClipboardList',
      },
    ],
  },
]

const orderCreatorNavGroups = [
  {
    title: 'ORDERS',
    items: [
      {
        title: 'All Orders',
        href: '/orders',
        icon: 'PackageSearch',
      },
      {
        title: 'Create Order',
        href: '/order-creator/orders/new',
        icon: 'Plus',
      },
      {
        title: 'Delivered',
        href: '/delivered',
        icon: 'PackageCheck',
      },
      {
        title: 'Asking Tasks',
        href: '/asking-tasks',
        icon: 'ClipboardList',
      },
    ],
  },
  {
    title: 'MY WORK',
    items: [
      {
        title: 'My Tasks',
        href: '/order-creator/tasks',
        icon: 'ListTodo',
      },
      {
        title: 'Completed Tasks',
        href: '/order-creator/completed',
        icon: 'CheckCircle2',
      },
      {
        title: 'Schedule',
        href: '/order-creator/schedule',
        icon: 'Calendar',
      },
    ],
  },
]

export default async function AskingTasksLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

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
