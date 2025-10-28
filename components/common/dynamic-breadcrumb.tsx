"use client";

import Link from 'next/link';
import { Home } from 'lucide-react';
import { useNavigation, BreadcrumbItem as BreadcrumbItemType } from '@/context/navigationContext';
import { useBreadcrumbsWithCustom } from '@/hooks/use-breadcrumbs';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

interface DynamicBreadcrumbProps {
  customBreadcrumbs?: BreadcrumbItemType[];
  showHomeIcon?: boolean;
  className?: string;
}

export function DynamicBreadcrumb({
  customBreadcrumbs,
  showHomeIcon = false,
  className,
}: DynamicBreadcrumbProps) {
  const { customBreadcrumbs: contextBreadcrumbs } = useNavigation();

  // Priority: Context > Props > Auto-generated
  const finalCustomBreadcrumbs = contextBreadcrumbs || customBreadcrumbs;

  const breadcrumbs = useBreadcrumbsWithCustom(finalCustomBreadcrumbs);

  // Don't render if only one item (Dashboard only)
  if (breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <Breadcrumb className={className}>
      <BreadcrumbList>
        {breadcrumbs.map((crumb, index) => (
          <div key={`${crumb.href}-${index}`} className="contents">
            <BreadcrumbItem className={index === 0 ? "hidden md:block" : ""}>
              {crumb.isCurrentPage ? (
                <BreadcrumbPage>
                  {index === 0 && showHomeIcon ? (
                    <Home className="h-4 w-4" />
                  ) : (
                    crumb.label
                  )}
                </BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={crumb.href}>
                    {index === 0 && showHomeIcon ? (
                      <Home className="h-4 w-4" />
                    ) : (
                      crumb.label
                    )}
                  </Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
          </div>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
