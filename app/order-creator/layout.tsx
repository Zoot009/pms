import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-utils'
import { AppSidebar } from '@/components/app-sidebar'
import { PageHeader } from '@/components/page-header'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import prisma from '@/lib/prisma'

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
        title: 'Delivery',
        href: '/order-creator/delivery',
        icon: 'Truck',
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

export default async function OrderCreatorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  if (user.role !== 'ORDER_CREATOR') {
    redirect('/unauthorized')
  }

  // Get user's team information if they have one
  let teamInfo = null
  const teamMember = await prisma.teamMember.findFirst({
    where: { userId: user.id },
    include: {
      team: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  if (teamMember) {
    teamInfo = teamMember.team
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
        dashboardHref="/order-creator/dashboard"
        navGroups={orderCreatorNavGroups}
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
