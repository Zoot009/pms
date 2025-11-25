# React Query Refactoring Guide - Asking Tasks Page

## Current Status
The `/orders` page has been successfully refactored to use React Query. The `/asking-tasks` page needs to follow the same pattern.

## Step-by-Step Refactoring Guide

### Step 1: Update Imports

**Remove:**
```tsx
import axios from 'axios'
```

**Add:**
```tsx
import { useAskingTasks, useCompleteAskingTask, useFlagAskingTask } from '@/hooks/queries/use-asking-tasks'
import type { AskingTaskDetailed } from '@/lib/types/api'
```

### Step 2: Replace State Management

**Remove these useState declarations:**
```tsx
const [askingTasks, setAskingTasks] = useState<AskingTask[]>([])
const [isLoading, setIsLoading] = useState(true)
const [isLoadingMore, setIsLoadingMore] = useState(false)
const [hasMore, setHasMore] = useState(true)
const [page, setPage] = useState(1)
const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
```

**Replace with:**
```tsx
const [debouncedSearch, setDebouncedSearch] = useState('')

// Debounce search query
useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedSearch(searchQuery)
  }, 500)
  return () => clearTimeout(timer)
}, [searchQuery])

// Fetch asking tasks with React Query
const {
  data,
  isLoading,
  isFetchingNextPage,
  hasNextPage,
  fetchNextPage,
} = useAskingTasks({
  status: activeTab === 'completed' ? 'completed' : statusFilter,
  flagged: flaggedFilter,
  stage: stageFilter,
  search: debouncedSearch,
  limit: 20,
})

// Mutations
const completeTaskMutation = useCompleteAskingTask()
const flagTaskMutation = useFlagAskingTask()

// Flatten all pages of tasks
const askingTasks = useMemo(() => {
  return data?.pages.flatMap((page) => page.tasks) ?? []
}, [data])
```

### Step 3: Remove fetchAskingTasks Function

**Delete entire function:**
```tsx
const fetchAskingTasks = async (pageNum: number = 1, reset: boolean = false) => {
  // ... entire function body
}
```

This is now handled by React Query automatically.

### Step 4: Remove loadMoreTasks and handleSearch Functions

**Delete:**
```tsx
const loadMoreTasks = () => {
  if (!isLoadingMore && hasMore) {
    fetchAskingTasks(page + 1, false)
  }
}

const handleSearch = () => {
  setPage(1)
  setAskingTasks([])
  setHasMore(true)
  fetchAskingTasks(1, true)
}
```

Search is now automatic via debouncing, and infinite scroll is handled by React Query.

### Step 5: Update Infinite Scroll Effect

**Replace:**
```tsx
useEffect(() => {
  const handleScroll = () => {
    if (
      window.innerHeight + document.documentElement.scrollTop
      >= document.documentElement.offsetHeight - 1000 &&
      !isLoadingMore &&
      hasMore
    ) {
      loadMoreTasks()
    }
  }

  window.addEventListener('scroll', handleScroll)
  return () => window.removeEventListener('scroll', handleScroll)
}, [isLoadingMore, hasMore, page])
```

**With:**
```tsx
useEffect(() => {
  const handleScroll = () => {
    if (
      window.innerHeight + document.documentElement.scrollTop
      >= document.documentElement.offsetHeight - 1000 &&
      !isFetchingNextPage &&
      hasNextPage
    ) {
      fetchNextPage()
    }
  }

  window.addEventListener('scroll', handleScroll)
  return () => window.removeEventListener('scroll', handleScroll)
}, [isFetchingNextPage, hasNextPage, fetchNextPage])
```

### Step 6: Update handleMarkComplete Function

**Replace:**
```tsx
const handleMarkComplete = async () => {
  if (!selectedTask) return

  try {
    setIsSubmitting(true)
    const response = await axios.patch(`/api/asking-tasks/${selectedTask.id}/complete`, {
      notes: completionNotes || undefined,
    })
    
    // Update the task in the local state instead of refetching
    const updatedTask = response.data.askingTask
    setAskingTasks(prevTasks => 
      prevTasks.map(task => 
        task.id === selectedTask.id 
          ? { 
              ...task, 
              completedAt: updatedTask.completedAt, 
              completedUser: updatedTask.completedUser 
            }
          : task
      )
    )
    
    // ... rest of function
  } catch (error: any) {
    console.error('Error completing task:', error)
    toast.error(error.response?.data?.error || 'Failed to complete task')
  } finally {
    setIsSubmitting(false)
  }
}
```

**With:**
```tsx
const handleMarkComplete = async () => {
  if (!selectedTask) return

  try {
    setIsSubmitting(true)
    await completeTaskMutation.mutateAsync({
      id: selectedTask.id,
      data: { notes: completionNotes || undefined },
    })
    
    // Keep the order expanded so user can see the updated task
    setOpenOrders(prev => ({
      ...prev,
      [selectedTask.order.id]: true
    }))
    
    setShowCompleteDialog(false)
    setSelectedTask(null)
    setCompletionNotes('')
  } catch (error: any) {
    console.error('Error completing task:', error)
    // Toast is already handled in the mutation
  } finally {
    setIsSubmitting(false)
  }
}
```

### Step 7: Update handleToggleFlag Function

**Replace:**
```tsx
const handleToggleFlag = async (taskId: string, currentFlagged: boolean) => {
  try {
    const response = await axios.patch(`/api/asking-tasks/${taskId}/flag`, {
      isFlagged: !currentFlagged,
    })
    
    // Update the task in local state
    const updatedTask = response.data.askingTask
    setAskingTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === taskId
          ? { ...task, isFlagged: updatedTask.isFlagged }
          : task
      )
    )
    
    toast.success(updatedTask.isFlagged ? 'Task flagged' : 'Task unflagged')
  } catch (error: any) {
    console.error('Error toggling flag:', error)
    toast.error(error.response?.data?.error || 'Failed to update flag')
  }
}
```

**With:**
```tsx
const handleToggleFlag = async (taskId: string, currentFlagged: boolean) => {
  try {
    await flagTaskMutation.mutateAsync({
      id: taskId,
      data: { isFlagged: !currentFlagged },
    })
  } catch (error) {
    console.error('Error toggling flag:', error)
    // Toast is already handled in the mutation
  }
}
```

### Step 8: Remove handleStageUpdate Function

**Delete:**
```tsx
const handleStageUpdate = () => {
  // Refetch only the updated task instead of all tasks
  if (selectedTaskId) {
    axios.get(`/api/asking-tasks/${selectedTaskId}`)
      .then(response => {
        setAskingTasks(prevTasks => 
          prevTasks.map(task => 
            task.id === selectedTaskId ? response.data : task
          )
        )
      })
      .catch(error => {
        console.error('Error refreshing task:', error)
        fetchAskingTasks()
      })
  } else {
    fetchAskingTasks()
  }
}
```

React Query will automatically refetch and update the cache when mutations occur.

### Step 9: Update Loading Indicators in JSX

**Find and replace:**
```tsx
{isLoadingMore && (
```

**With:**
```tsx
{isFetchingNextPage && (
```

**Find and replace:**
```tsx
{!hasMore && askingTasks.length > 0 && (
```

**With:**
```tsx
{!hasNextPage && askingTasks.length > 0 && (
```

### Step 10: Remove useEffect for Filter Changes

**Delete:**
```tsx
useEffect(() => {
  setPage(1)
  setAskingTasks([])
  setHasMore(true)
  fetchAskingTasks(1, true)
}, [statusFilter, flaggedFilter, stageFilter, activeTab, debouncedSearchQuery])
```

React Query will automatically refetch when query keys change (filters in this case).

### Step 11: Update Type Definitions

**Find and replace the interface:**
```tsx
interface AskingTask {
  // ... properties
}
```

**With:**
```tsx
// Remove this interface entirely, it's now imported as AskingTaskDetailed
```

Make sure all references to `AskingTask` are updated to `AskingTaskDetailed`.

### Step 12: Update StageDetailsModal onUpdate Prop

**Find:**
```tsx
<StageDetailsModal
  taskId={selectedTaskId!}
  isOpen={showStageModal}
  onClose={handleCloseStageModal}
  onUpdate={handleStageUpdate}
/>
```

**Replace with:**
```tsx
<StageDetailsModal
  taskId={selectedTaskId!}
  isOpen={showStageModal}
  onClose={handleCloseStageModal}
/>
```

Remove the `onUpdate` prop - the modal should trigger mutations that automatically update the cache.

## Testing Checklist

After refactoring, test the following:

- [ ] Page loads and displays tasks correctly
- [ ] Filters (status, flagged, stage) work correctly
- [ ] Search debouncing works (no API call on every keystroke)
- [ ] Infinite scroll loads more tasks
- [ ] Complete task dialog works
- [ ] Flag/unflag task works
- [ ] Stage details modal works
- [ ] Tab switching (pending/completed) works
- [ ] Loading states display correctly
- [ ] Error states display correctly
- [ ] Window focus refetches data (try switching tabs and coming back)

## Common Pitfalls to Avoid

1. **Don't manually update `askingTasks` state** - React Query manages the cache
2. **Don't call fetchAskingTasks manually** - React Query handles refetching
3. **Don't use `page` state** - useInfiniteQuery manages pagination
4. **Don't forget to add debouncing** - prevents excessive API calls on search
5. **Remove all axios imports and calls** - everything goes through React Query hooks

## Benefits After Refactoring

✅ Automatic background refetching (every 30 seconds)
✅ Window focus refetching
✅ Automatic error handling and retries
✅ Centralized loading states
✅ Cache invalidation on mutations
✅ No need to pass refetch callbacks as props
✅ Better TypeScript types
✅ React Query DevTools for debugging
✅ Optimized re-renders

## Next Steps

After completing the asking-tasks page refactoring:
1. Test thoroughly
2. Move on to `/delivered` page
3. Then refactor team-related pages
4. Consider adding prefetching for better UX
