'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  LogOut,
  User as UserIcon,
  LayoutDashboard,
  ListTodo,
  CheckCircle2,
  Clock,
  Calendar,
  Users,
  ClipboardList,
  BarChart3,
  UsersRound,
  Briefcase,
  PackageSearch,
  FileText,
  Settings,
  Activity,
  LucideIcon,
} from 'lucide-react'

// Icon mapping for dynamic icon rendering
const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  ListTodo,
  CheckCircle2,
  Clock,
  Calendar,
  Users,
  ClipboardList,
  BarChart3,
  UsersRound,
  Briefcase,
  PackageSearch,
  FileText,
  Settings,
  Activity,
}

interface NavItem {
  title: string
  href: string
  icon: string
}

interface DashboardSidebarProps {
  user: {
    displayName?: string | null
    email: string
    avatar?: string | null
    role: string
  }
  navItems: NavItem[]
  title: string
}

export function DashboardSidebar({ user, navItems, title }: DashboardSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const getInitials = (name?: string | null, email?: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    return email?.slice(0, 2).toUpperCase() || 'U'
  }

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-gray-50/40">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{user.role.replace('_', ' ')}</p>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = iconMap[item.icon]
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
            
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? 'secondary' : 'ghost'}
                  className={cn(
                    'w-full justify-start',
                    isActive && 'bg-secondary'
                  )}
                >
                  {Icon && <Icon className="mr-2 h-4 w-4" />}
                  {item.title}
                </Button>
              </Link>
            )
          })}
        </nav>
      </ScrollArea>

      {/* User Menu */}
      <div className="border-t p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start px-2">
              <Avatar className="mr-2 h-8 w-8">
                <AvatarImage src={user.avatar || undefined} />
                <AvatarFallback>{getInitials(user.displayName, user.email)}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start text-sm">
                <span className="font-medium">{user.displayName || 'User'}</span>
                <span className="text-xs text-muted-foreground">{user.email}</span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <UserIcon className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
