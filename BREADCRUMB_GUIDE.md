# Dynamic Breadcrumb System - Usage Guide

## Overview

The dynamic breadcrumb system automatically generates breadcrumbs from the URL path and displays them in the header on every page. It supports custom breadcrumbs when needed.

## Architecture

### 4 Core Components:

1. **NavigationContext** (`context/navigationContext.tsx`) - Global state for breadcrumbs
2. **useBreadcrumbs Hook** (`hooks/use-breadcrumbs.ts`) - Auto-generates breadcrumbs from URL
3. **DynamicBreadcrumb Component** (`components/common/dynamic-breadcrumb.tsx`) - Renders breadcrumbs
4. **PageHeader Component** (`components/page-header.tsx`) - Header with breadcrumbs, sidebar trigger, and theme toggle

## How It Works

### Automatic Breadcrumb Generation

The system automatically generates breadcrumbs based on the URL path:

**Example 1:**
```
URL: /admin/users
Breadcrumbs: Dashboard > Admin > Users
```

**Example 2:**
```
URL: /admin/order-types/new
Breadcrumbs: Dashboard > Admin > Order Types > New
```

**Example 3 (with UUID):**
```
URL: /admin/users/123e4567-e89b-12d3-a456-426614174000
Breadcrumbs: Dashboard > Admin > Users > User 123e4567...
```

### Features

- **Automatic path parsing**: Converts URL segments to readable labels
- **UUID detection**: Detects and truncates UUID parameters
- **Date detection**: Formats date parameters (YYYY-MM-DD)
- **Custom labels**: Predefined labels for common routes
- **Responsive**: First item hidden on mobile
- **Clickable navigation**: All items except current page are clickable

## Usage

### 1. Default Usage (Automatic Breadcrumbs)

The PageHeader is already added to all layouts:
- `app/admin/layout.tsx`
- `app/member/layout.tsx`
- `app/team-leader/layout.tsx`

No additional code needed in your pages! Breadcrumbs are generated automatically.

### 2. Custom Breadcrumbs (Using Context)

Use this when you need to override auto-generated breadcrumbs (e.g., showing a client name instead of UUID):

```tsx
"use client";

import { useEffect } from 'react';
import { useNavigation } from '@/context/navigationContext';

export default function ClientDetailPage({ params }: { params: { id: string } }) {
  const { setCustomBreadcrumbs } = useNavigation();
  
  // Fetch client data...
  const client = { name: "Acme Corp" };
  
  useEffect(() => {
    if (client) {
      setCustomBreadcrumbs([
        { label: "Clients", href: "/admin/clients" },
        { label: client.name, href: "#", isCurrentPage: true }
      ]);
    }
    
    // Cleanup: Remove custom breadcrumbs when component unmounts
    return () => setCustomBreadcrumbs(undefined);
  }, [client, setCustomBreadcrumbs]);
  
  return <div>Client Details</div>;
}
```

### 3. Custom Breadcrumbs (Using Props)

Pass custom breadcrumbs directly to PageHeader (if you need to customize in a specific layout):

```tsx
<PageHeader 
  customBreadcrumbs={[
    { label: "Custom Section", href: "/custom" },
    { label: "Current Page", href: "#", isCurrentPage: true }
  ]} 
/>
```

## Custom Labels Configuration

You can add custom labels for routes in `hooks/use-breadcrumbs.ts`:

```typescript
const routeLabels: Record<string, string> = {
  'admin': 'Admin',
  'dashboard': 'Dashboard',
  'users': 'Users',
  'teams': 'Teams',
  'services': 'Services',
  'order-types': 'Order Types',
  // Add more custom labels here...
};
```

## BreadcrumbItem Type

```typescript
interface BreadcrumbItem {
  label: string;           // Display text
  href: string;            // Link URL (use "#" for current page)
  isCurrentPage?: boolean; // If true, renders as non-clickable text
}
```

## Priority System

When using custom breadcrumbs, the system follows this priority:

1. **Context breadcrumbs** (set via `setCustomBreadcrumbs()`)
2. **Prop breadcrumbs** (passed directly to component)
3. **Auto-generated** (from URL path)

**Note:** "Dashboard" is always kept as the first breadcrumb item.

## Examples by Use Case

### Use Case 1: Standard Admin Page
No additional code needed. Breadcrumbs generated automatically from URL.

### Use Case 2: Detail Page with ID
```tsx
// URL: /admin/teams/abc-123
// Auto breadcrumb: Dashboard > Admin > Teams > Team abc-123...

// With custom breadcrumb:
useEffect(() => {
  setCustomBreadcrumbs([
    { label: "Teams", href: "/admin/teams" },
    { label: team.name, href: "#", isCurrentPage: true }
  ]);
}, [team]);
// Result: Dashboard > Teams > "Engineering Team"
```

### Use Case 3: Complex Nested Route
```tsx
// URL: /admin/teams/abc-123/members/def-456
// Auto: Dashboard > Admin > Teams > Team abc-123... > Members > Member def-456...

// Custom:
setCustomBreadcrumbs([
  { label: "Teams", href: "/admin/teams" },
  { label: team.name, href: `/admin/teams/${team.id}` },
  { label: "Members", href: `/admin/teams/${team.id}/members` },
  { label: member.name, href: "#", isCurrentPage: true }
]);
// Result: Dashboard > Teams > "Engineering Team" > Members > "John Doe"
```

## Customization Options

### Show Home Icon
```tsx
<PageHeader showHomeIcon />
```
This replaces "Dashboard" text with a home icon.

### Custom Styling
```tsx
<DynamicBreadcrumb className="custom-class" />
```

## Technical Notes

- **Performance**: Uses `useMemo` to prevent unnecessary re-renders
- **Accessibility**: Includes proper ARIA labels and semantic HTML
- **Type Safety**: Full TypeScript support
- **Client-Side**: All breadcrumb logic runs on the client
- **SSR Compatible**: Initial render works with server components

## Troubleshooting

### Breadcrumbs not showing
- Make sure you're on a route with 2+ segments
- Check that NavigationProvider wraps your app in root layout

### Custom breadcrumbs not updating
- Ensure you're calling `setCustomBreadcrumbs()` inside `useEffect`
- Add cleanup function to remove breadcrumbs on unmount

### Wrong labels appearing
- Add custom labels to `routeLabels` in `use-breadcrumbs.ts`
- Or use custom breadcrumbs via context

## Summary

✅ **PageHeader is already in all layouts** - breadcrumbs appear automatically
✅ **No code needed for standard pages** - works out of the box
✅ **Use context for dynamic content** - when you need entity names instead of IDs
✅ **Fully customizable** - override anything when needed
