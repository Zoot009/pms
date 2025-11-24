import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import type { User, UserWithPermissions } from '@/lib/types/api'

// ============================================
// QUERY KEYS
// ============================================

export const authKeys = {
  all: ['auth'] as const,
  user: () => [...authKeys.all, 'user'] as const,
  permissions: () => [...authKeys.all, 'permissions'] as const,
}

// ============================================
// API FUNCTIONS
// ============================================

async function fetchCurrentUser(): Promise<User> {
  const response = await axios.get('/api/auth/sync')
  return response.data.user
}

async function checkUserPermissions(): Promise<UserWithPermissions> {
  const userResponse = await axios.get('/api/auth/sync')
  const user = userResponse.data.user

  // Check if user can edit orders
  const isAdmin = user?.role === 'ADMIN'
  const isOrderCreator = user?.role === 'ORDER_CREATOR'

  let isTeamLeader = false
  try {
    const teamResponse = await axios.get('/api/team-leader/my-teams')
    isTeamLeader = teamResponse.data.teams && teamResponse.data.teams.length > 0
  } catch {
    isTeamLeader = false
  }

  const canEdit = isAdmin || isOrderCreator || isTeamLeader

  return {
    ...user,
    canEdit,
    isTeamLeader,
  }
}

// ============================================
// HOOKS
// ============================================

/**
 * Hook for fetching current user
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: authKeys.user(),
    queryFn: fetchCurrentUser,
    staleTime: 5 * 60 * 1000, // 5 minutes - user data changes less frequently
  })
}

/**
 * Hook for fetching current user with permissions
 */
export function useUserPermissions() {
  return useQuery({
    queryKey: authKeys.permissions(),
    queryFn: checkUserPermissions,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
