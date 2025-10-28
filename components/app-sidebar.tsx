"use client"

import * as React from "react"
import * as LucideIcons from "lucide-react"
import { type LucideIcon } from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

interface NavItem {
  title: string
  href: string
  icon: string
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: {
    displayName: string
    email: string
    avatar?: string | null
  }
  navItems: NavItem[]
  title: string
}

export function AppSidebar({ user, navItems, title, ...props }: AppSidebarProps) {
  // Convert string icon names to LucideIcon components
  const navMainItems = navItems.map(item => {
    const IconComponent = (LucideIcons as any)[item.icon] as LucideIcon
    return {
      title: item.title,
      url: item.href,
      icon: IconComponent,
    }
  })

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <LucideIcons.LayoutDashboard className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{title}</span>
                <span className="truncate text-xs">Project Management</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMainItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser 
          user={{
            name: user.displayName,
            email: user.email,
            avatar: user.avatar || '',
          }} 
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
