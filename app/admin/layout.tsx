import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-utils'
import { UserRole } from '@/lib/generated/prisma'
import { AppSidebar } from '@/components/app-sidebar'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { PageHeader } from '@/components/page-header'

const adminNavItems = [
  {
    title: 'Dashboard',
    href: '/admin/dashboard',
    icon: 'LayoutDashboard',
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
  {
    title: 'Order Types',
    href: '/admin/order-types',
    icon: 'PackageSearch',
  },
  {
    title: 'Orders',
    href: '/admin/orders',
    icon: 'FileText',
  },
  {
    title: 'Order Dashboard',
    href: '/orders',
    icon: 'Package',
  },
  {
    title: 'Asking Tasks',
    href: '/asking-tasks',
    icon: 'MessageSquare',
  },
  {
    title: 'Data to Folder',
    href: '/admin/data-to-folder',
    icon: 'FolderInput',
  },
  {
    title: 'Audit Logs',
    href: '/admin/audit-logs',
    icon: 'Activity',
  },
  {
    title: 'Settings',
    href: '/admin/settings',
    icon: 'Settings',
  },
]

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  if (user.role !== UserRole.ADMIN) {
    redirect('/unauthorized')
  }

  return (
    <SidebarProvider>
      <AppSidebar
        user={{
          displayName: user.displayName || user.email,
          email: user.email,
          avatar: user.avatar,
        }}
        navItems={adminNavItems}
        title="Admin Panel"
      />
      <SidebarInset>
        <PageHeader />
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
