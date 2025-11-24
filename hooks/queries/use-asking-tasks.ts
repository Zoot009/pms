import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { toast } from 'sonner'
import type {
  AskingTaskDetailed,
  AskingTasksResponse,
  AskingTasksQueryParams,
  CompleteAskingTaskRequest,
  FlagAskingTaskRequest,
  UpdateAskingTaskStageRequest,
} from '@/lib/types/api'

// ============================================
// QUERY KEYS
// ============================================

export const askingTasksKeys = {
  all: ['asking-tasks'] as const,
  lists: () => [...askingTasksKeys.all, 'list'] as const,
  list: (params: AskingTasksQueryParams) => [...askingTasksKeys.lists(), params] as const,
  details: () => [...askingTasksKeys.all, 'detail'] as const,
  detail: (id: string) => [...askingTasksKeys.details(), id] as const,
  stages: (id: string) => [...askingTasksKeys.detail(id), 'stages'] as const,
}

// ============================================
// API FUNCTIONS
// ============================================

async function fetchAskingTasks(
  params: AskingTasksQueryParams & { pageParam?: number }
): Promise<AskingTasksResponse> {
  const searchParams = new URLSearchParams({
    status: params.status || 'all',
    flagged: params.flagged || 'all',
    stage: params.stage || 'all',
    search: params.search || '',
    page: (params.pageParam || params.page || 1).toString(),
    limit: (params.limit || 20).toString(),
  })

  const response = await axios.get(`/api/asking-tasks?${searchParams}`)
  return response.data
}

async function fetchAskingTaskById(id: string): Promise<AskingTaskDetailed> {
  const response = await axios.get(`/api/asking-tasks/${id}`)
  return response.data.task
}

async function fetchAskingTaskStages(id: string): Promise<any> {
  const response = await axios.get(`/api/asking-tasks/${id}/stages`)
  return response.data
}

async function completeAskingTask(
  id: string,
  data: CompleteAskingTaskRequest
): Promise<AskingTaskDetailed> {
  const response = await axios.patch(`/api/asking-tasks/${id}/complete`, data)
  return response.data.task
}

async function flagAskingTask(
  id: string,
  data: FlagAskingTaskRequest
): Promise<AskingTaskDetailed> {
  const response = await axios.patch(`/api/asking-tasks/${id}/flag`, data)
  return response.data.task
}

async function updateAskingTaskStage(
  id: string,
  data: UpdateAskingTaskStageRequest
): Promise<AskingTaskDetailed> {
  const response = await axios.patch(`/api/asking-tasks/${id}/stage`, data)
  return response.data.task
}

async function updateAskingTaskNotes(
  id: string,
  notes: string
): Promise<AskingTaskDetailed> {
  const response = await axios.patch(`/api/asking-tasks/${id}/notes`, { notes })
  return response.data.task
}

// ============================================
// HOOKS
// ============================================

/**
 * Hook for fetching paginated asking tasks with infinite scroll
 */
export function useAskingTasks(params: AskingTasksQueryParams = {}) {
  return useInfiniteQuery({
    queryKey: askingTasksKeys.list(params),
    queryFn: ({ pageParam = 1 }) => fetchAskingTasks({ ...params, pageParam }),
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.hasMore ? allPages.length + 1 : undefined
    },
    initialPageParam: 1,
  })
}

/**
 * Hook for fetching a single asking task by ID
 */
export function useAskingTask(id: string, enabled = true) {
  return useQuery({
    queryKey: askingTasksKeys.detail(id),
    queryFn: () => fetchAskingTaskById(id),
    enabled: enabled && !!id,
  })
}

/**
 * Hook for fetching asking task stages/history
 */
export function useAskingTaskStages(id: string, enabled = true) {
  return useQuery({
    queryKey: askingTasksKeys.stages(id),
    queryFn: () => fetchAskingTaskStages(id),
    enabled: enabled && !!id,
  })
}

/**
 * Hook for completing an asking task
 */
export function useCompleteAskingTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CompleteAskingTaskRequest }) =>
      completeAskingTask(id, data),
    onSuccess: (updatedTask) => {
      // Invalidate asking tasks list to refetch
      queryClient.invalidateQueries({ queryKey: askingTasksKeys.lists() })
      // Update the specific task in cache
      queryClient.setQueryData(askingTasksKeys.detail(updatedTask.id), updatedTask)
      toast.success('Task completed successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to complete task')
    },
  })
}

/**
 * Hook for flagging/unflagging an asking task
 */
export function useFlagAskingTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: FlagAskingTaskRequest }) =>
      flagAskingTask(id, data),
    onSuccess: (updatedTask) => {
      queryClient.invalidateQueries({ queryKey: askingTasksKeys.lists() })
      queryClient.setQueryData(askingTasksKeys.detail(updatedTask.id), updatedTask)
      toast.success(updatedTask.isFlagged ? 'Task flagged' : 'Task unflagged')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update flag')
    },
  })
}

/**
 * Hook for updating asking task stage
 */
export function useUpdateAskingTaskStage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAskingTaskStageRequest }) =>
      updateAskingTaskStage(id, data),
    onSuccess: (updatedTask) => {
      queryClient.invalidateQueries({ queryKey: askingTasksKeys.lists() })
      queryClient.setQueryData(askingTasksKeys.detail(updatedTask.id), updatedTask)
      queryClient.invalidateQueries({ queryKey: askingTasksKeys.stages(updatedTask.id) })
      toast.success('Task stage updated successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update stage')
    },
  })
}

/**
 * Hook for updating asking task notes
 */
export function useUpdateAskingTaskNotes() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      updateAskingTaskNotes(id, notes),
    onSuccess: (updatedTask) => {
      queryClient.invalidateQueries({ queryKey: askingTasksKeys.lists() })
      queryClient.setQueryData(askingTasksKeys.detail(updatedTask.id), updatedTask)
      toast.success('Notes updated successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update notes')
    },
  })
}
