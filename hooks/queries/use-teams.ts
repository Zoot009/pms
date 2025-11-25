import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { toast } from 'sonner'
import type { Team, TeamsResponse } from '@/lib/types/api'

// ============================================
// QUERY KEYS
// ============================================

export const teamsKeys = {
  all: ['teams'] as const,
  lists: () => [...teamsKeys.all, 'list'] as const,
  list: (filters?: any) => [...teamsKeys.lists(), filters] as const,
  details: () => [...teamsKeys.all, 'detail'] as const,
  detail: (id: string) => [...teamsKeys.details(), id] as const,
  myTeams: () => [...teamsKeys.all, 'my-teams'] as const,
}

// ============================================
// API FUNCTIONS
// ============================================

async function fetchTeams(): Promise<TeamsResponse> {
  const response = await axios.get('/api/teams')
  return response.data
}

async function fetchTeamById(id: string): Promise<Team> {
  const response = await axios.get(`/api/teams/${id}`)
  return response.data.team
}

async function fetchMyTeams(): Promise<TeamsResponse> {
  const response = await axios.get('/api/team-leader/my-teams')
  return response.data
}

async function createTeam(data: Partial<Team>): Promise<Team> {
  const response = await axios.post('/api/teams', data)
  return response.data.team
}

async function updateTeam(id: string, data: Partial<Team>): Promise<Team> {
  const response = await axios.patch(`/api/teams/${id}`, data)
  return response.data.team
}

async function deleteTeam(id: string): Promise<void> {
  await axios.delete(`/api/teams/${id}`)
}

async function addTeamMember(teamId: string, userId: string): Promise<Team> {
  const response = await axios.post(`/api/teams/${teamId}/members`, { userId })
  return response.data.team
}

async function removeTeamMember(teamId: string, memberId: string): Promise<Team> {
  const response = await axios.delete(`/api/teams/${teamId}/members/${memberId}`)
  return response.data.team
}

// ============================================
// HOOKS
// ============================================

/**
 * Hook for fetching all teams
 */
export function useTeams() {
  return useQuery({
    queryKey: teamsKeys.lists(),
    queryFn: fetchTeams,
  })
}

/**
 * Hook for fetching a single team by ID
 */
export function useTeam(id: string, enabled = true) {
  return useQuery({
    queryKey: teamsKeys.detail(id),
    queryFn: () => fetchTeamById(id),
    enabled: enabled && !!id,
  })
}

/**
 * Hook for fetching teams where current user is a leader
 */
export function useMyTeams() {
  return useQuery({
    queryKey: teamsKeys.myTeams(),
    queryFn: fetchMyTeams,
  })
}

/**
 * Hook for creating a new team
 */
export function useCreateTeam() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Partial<Team>) => createTeam(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamsKeys.lists() })
      toast.success('Team created successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create team')
    },
  })
}

/**
 * Hook for updating a team
 */
export function useUpdateTeam() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Team> }) =>
      updateTeam(id, data),
    onSuccess: (updatedTeam) => {
      queryClient.invalidateQueries({ queryKey: teamsKeys.lists() })
      queryClient.setQueryData(teamsKeys.detail(updatedTeam.id), updatedTeam)
      toast.success('Team updated successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update team')
    },
  })
}

/**
 * Hook for deleting a team
 */
export function useDeleteTeam() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteTeam(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamsKeys.lists() })
      toast.success('Team deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete team')
    },
  })
}

/**
 * Hook for adding a member to a team
 */
export function useAddTeamMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ teamId, userId }: { teamId: string; userId: string }) =>
      addTeamMember(teamId, userId),
    onSuccess: (updatedTeam) => {
      queryClient.invalidateQueries({ queryKey: teamsKeys.lists() })
      queryClient.setQueryData(teamsKeys.detail(updatedTeam.id), updatedTeam)
      toast.success('Member added successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to add member')
    },
  })
}

/**
 * Hook for removing a member from a team
 */
export function useRemoveTeamMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ teamId, memberId }: { teamId: string; memberId: string }) =>
      removeTeamMember(teamId, memberId),
    onSuccess: (updatedTeam) => {
      queryClient.invalidateQueries({ queryKey: teamsKeys.lists() })
      queryClient.setQueryData(teamsKeys.detail(updatedTeam.id), updatedTeam)
      toast.success('Member removed successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to remove member')
    },
  })
}
