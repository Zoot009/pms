# React Query Implementation - Quick Reference

## 🎉 What's Been Completed

### ✅ Infrastructure
- React Query installed and configured
- QueryClient with fresh data strategy (30s stale time)
- QueryProvider wrapping entire app
- React Query DevTools integrated

### ✅ Custom Hooks Created
All hooks are in `hooks/queries/` directory:

1. **`use-orders.ts`** - Complete with infinite scroll, mutations
2. **`use-asking-tasks.ts`** - Complete with all mutations
3. **`use-teams.ts`** - Complete with CRUD operations
4. **`use-auth.ts`** - User and permissions

### ✅ Type Definitions
- `lib/types/api.ts` - All TypeScript types for API responses

### ✅ Pages Refactored
- **`/orders` page** - ✅ FULLY WORKING with React Query

## 🚧 What Needs To Be Done

### 1. Asking Tasks Page (`/asking-tasks`)
**Status:** Partially refactored, needs completion

**Guide:** See `ASKING_TASKS_REFACTORING_GUIDE.md`

**Quick Steps:**
1. Fix imports (remove axios, add React Query hooks)
2. Replace useState/useEffect with `useAskingTasks()` hook
3. Update mutation handlers
4. Test all functionality

### 2. Delivered Page (`/delivered`)
**Status:** Not started

**Approach:**
- Create `useDeliveredOrders()` hook (or reuse `useOrders` with filters)
- Follow same pattern as `/orders` page
- Should be straightforward copy-paste-modify

### 3. Team Pages
**Status:** Not started

**Hooks Ready:** Yes (`use-teams.ts`)

**Steps:**
1. Find all team-related pages
2. Replace axios calls with appropriate hooks from `use-teams.ts`
3. Test CRUD operations

## 📖 How To Use React Query in Your App

### Basic Query Pattern
```tsx
import { useOrders } from '@/hooks/queries/use-orders'

function MyComponent() {
  const { data, isLoading, error } = useOrders({
    status: 'ALL',
    search: '',
    limit: 20,
  })
  
  if (isLoading) return <Loader />
  if (error) return <Error />
  
  return <div>{/* render data */}</div>
}
```

### Infinite Scroll Pattern
```tsx
const {
  data,
  isLoading,
  isFetchingNextPage,
  hasNextPage,
  fetchNextPage,
} = useOrders({ /* filters */ })

// Flatten pages
const items = useMemo(() => 
  data?.pages.flatMap(page => page.orders) ?? [],
  [data]
)

// Scroll handler
useEffect(() => {
  const handleScroll = () => {
    if (shouldLoadMore && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }
  window.addEventListener('scroll', handleScroll)
  return () => window.removeEventListener('scroll', handleScroll)
}, [hasNextPage, isFetchingNextPage, fetchNextPage])
```

### Mutation Pattern
```tsx
const updateMutation = useUpdateOrderStatus()

const handleUpdate = async () => {
  try {
    await updateMutation.mutateAsync({
      id: orderId,
      data: { status: 'COMPLETED' }
    })
    // Success toast already handled in hook
  } catch (error) {
    // Error toast already handled in hook
  }
}
```

### Search with Debouncing
```tsx
const [searchQuery, setSearchQuery] = useState('')
const [debouncedSearch, setDebouncedSearch] = useState('')

useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedSearch(searchQuery)
  }, 500)
  return () => clearTimeout(timer)
}, [searchQuery])

// Use debouncedSearch in query
const { data } = useOrders({ search: debouncedSearch })
```

## 🔑 Key Concepts

### Query Keys
Structured for cache management:
```typescript
ordersKeys = {
  all: ['orders'],
  lists: () => ['orders', 'list'],
  list: (params) => ['orders', 'list', params],
  details: () => ['orders', 'detail'],
  detail: (id) => ['orders', 'detail', id],
}
```

### Cache Invalidation
Automatic on mutations:
```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ordersKeys.lists() })
}
```

### Stale Time
- **30 seconds** - Regular data (orders, tasks, teams)
- **5 minutes** - User/auth data (changes less frequently)

## 🛠️ Debugging

### Use React Query DevTools
Already installed! Look for the React Query icon in bottom-right of screen (in development mode).

**Features:**
- See all queries and their state
- Inspect cached data
- Trigger manual refetches
- See query timings
- Debug stale/fresh data

### Common Issues

**Issue:** Data not updating after mutation
**Fix:** Check that `invalidateQueries` is called with correct query key

**Issue:** Too many API calls
**Fix:** Check stale time and refetch settings in query client

**Issue:** Search causing too many requests
**Fix:** Ensure debouncing is implemented (500ms recommended)

**Issue:** Infinite scroll not working
**Fix:** Check `getNextPageParam` returns correct value

## 📁 File Structure

```
lib/
  react-query/
    query-client.ts          # QueryClient configuration
  types/
    api.ts                   # TypeScript type definitions

hooks/
  queries/
    use-orders.ts            # Orders queries & mutations
    use-asking-tasks.ts      # Asking tasks queries & mutations
    use-teams.ts             # Teams queries & mutations
    use-auth.ts              # Auth & user queries

components/
  providers/
    query-provider.tsx       # QueryClientProvider wrapper

app/
  layout.tsx                 # Wraps app with QueryProvider
  (home)/
    orders/
      page.tsx               # ✅ Refactored
    asking-tasks/
      page.tsx               # 🚧 Needs completion
    delivered/
      page.tsx               # ❌ Not started
```

## 🎯 Priority Order

1. **Fix `/asking-tasks` page** - Almost done, just needs cleanup
2. **Refactor `/delivered` page** - Should be quick
3. **Refactor team pages** - Hooks are ready
4. **Consider real-time** - Future enhancement (Supabase subscriptions)

## 📚 Documentation Links

- **Implementation Summary:** `REACT_QUERY_IMPLEMENTATION.md`
- **Asking Tasks Guide:** `ASKING_TASKS_REFACTORING_GUIDE.md`
- **React Query Docs:** https://tanstack.com/query/latest

## 🎓 Learning Resources

- [React Query in 100 Seconds](https://www.youtube.com/watch?v=novnyCaa7To)
- [TanStack Query Docs](https://tanstack.com/query/latest/docs/react/overview)
- [Infinite Queries Guide](https://tanstack.com/query/latest/docs/react/guides/infinite-queries)
- [Mutations Guide](https://tanstack.com/query/latest/docs/react/guides/mutations)

## ✅ Testing Checklist

For each refactored page:
- [ ] Initial load displays data
- [ ] Filters update correctly
- [ ] Search works with debouncing
- [ ] Infinite scroll loads more data
- [ ] Mutations update UI correctly
- [ ] Error states show properly
- [ ] Loading states show correctly
- [ ] Window focus refetches data
- [ ] DevTools show correct queries

## 🚀 Next Level Features (Future)

- [ ] Prefetching on hover for better UX
- [ ] Optimistic updates for instant feedback
- [ ] Supabase real-time subscriptions
- [ ] Offline support
- [ ] Request deduplication
- [ ] Pagination cursor strategy
- [ ] Custom error boundaries
- [ ] Analytics integration

---

**Remember:** The `/orders` page is a perfect reference example. Copy its patterns for other pages!
