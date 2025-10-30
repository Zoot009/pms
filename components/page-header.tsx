"use client";

import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ModeToggle } from "./dark-mode-toggle"
import { DynamicBreadcrumb } from "./common/dynamic-breadcrumb"
import { BreadcrumbItem } from "@/context/navigationContext"

interface PageHeaderProps {
  customBreadcrumbs?: BreadcrumbItem[]
  showHomeIcon?: boolean
}

export function PageHeader({ customBreadcrumbs, showHomeIcon = false }: PageHeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        <DynamicBreadcrumb 
          customBreadcrumbs={customBreadcrumbs}
          showHomeIcon={showHomeIcon}
        />
      </div>
      <div className="ml-auto px-4">
        <ModeToggle/>
      </div>
    </header>
  )
}
