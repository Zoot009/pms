"use client";

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { useNavigation, BreadcrumbItem } from '@/context/navigationContext';

// Predefined route labels for better readability
const routeLabels: Record<string, string> = {
  'admin': 'Admin',
  'dashboard': 'Dashboard',
  'users': 'Users',
  'teams': 'Teams',
  'services': 'Services',
  'order-types': 'Order Types',
  'orders': 'Orders',
  'audit-logs': 'Audit Logs',
  'settings': 'Settings',
  'member': 'Member',
  'team-leader': 'Team Leader',
  'new': 'New',
};

/**
 * Checks if a string is a valid UUID (v1-v5)
 */
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Checks if a string matches YYYY-MM-DD date format
 */
function isDateParam(str: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  return dateRegex.test(str);
}

/**
 * Formats a date string to a readable label
 */
function formatDateLabel(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  } catch {
    return dateStr;
  }
}

/**
 * Formats a URL segment into a readable label
 * Examples:
 * - "activity-log" → "Activity Log"
 * - "user_management" → "User Management"
 */
function formatSegmentLabel(segment: string): string {
  return segment
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Core hook that automatically generates breadcrumbs from the current URL path
 */
export function useBreadcrumbs(): BreadcrumbItem[] {
  const pathname = usePathname();

  return useMemo(() => {
    const breadcrumbs: BreadcrumbItem[] = [];
    
    // Always add Dashboard as the first item
    breadcrumbs.push({
      label: 'Dashboard',
      href: '/',
      isCurrentPage: pathname === '/',
    });

    // Split pathname into segments
    const segments = pathname.split('/').filter(Boolean);
    
    if (segments.length === 0) {
      return breadcrumbs;
    }

    let currentPath = '';

    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const isLast = index === segments.length - 1;

      // Skip route groups (Next.js convention with parentheses)
      if (segment.startsWith('(') && segment.endsWith(')')) {
        return;
      }

      // Detect if segment is a dynamic parameter
      const isDynamicParam = isUUID(segment) || isDateParam(segment);
      
      let label = '';
      let href = currentPath;

      // Handle UUIDs
      if (isUUID(segment)) {
        // Truncate UUID for display
        label = `${segment.slice(0, 8)}...`;
        
        // Try to determine entity type from path
        if (currentPath.includes('/users/')) {
          label = `User ${segment.slice(0, 8)}...`;
        } else if (currentPath.includes('/teams/')) {
          label = `Team ${segment.slice(0, 8)}...`;
        } else if (currentPath.includes('/services/')) {
          label = `Service ${segment.slice(0, 8)}...`;
        } else if (currentPath.includes('/order-types/')) {
          label = `Order Type ${segment.slice(0, 8)}...`;
        } else if (currentPath.includes('/orders/')) {
          label = `Order ${segment.slice(0, 8)}...`;
        }
        
        href = currentPath;
      }
      // Handle dates
      else if (isDateParam(segment)) {
        label = formatDateLabel(segment);
        href = currentPath;
      }
      // Handle regular segments
      else {
        // Use predefined label if available, otherwise format the segment
        label = routeLabels[segment] || formatSegmentLabel(segment);
        href = currentPath;
      }

      breadcrumbs.push({
        label,
        href: isLast ? '#' : href,
        isCurrentPage: isLast,
      });
    });

    return breadcrumbs;
  }, [pathname]);
}

/**
 * Extended hook that supports custom breadcrumbs override
 * Priority: Custom > Auto-generated
 * Always keeps Dashboard as the first item
 */
export function useBreadcrumbsWithCustom(
  customBreadcrumbs?: BreadcrumbItem[]
): BreadcrumbItem[] {
  const autoBreadcrumbs = useBreadcrumbs();

  return useMemo(() => {
    if (!customBreadcrumbs || customBreadcrumbs.length === 0) {
      return autoBreadcrumbs;
    }

    // Keep Dashboard as first item, then add custom breadcrumbs
    const dashboardBreadcrumb = autoBreadcrumbs.find(crumb => crumb.href === '/');

    if (dashboardBreadcrumb) {
      return [dashboardBreadcrumb, ...customBreadcrumbs];
    }

    return customBreadcrumbs;
  }, [autoBreadcrumbs, customBreadcrumbs]);
}
