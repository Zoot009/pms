import { cache } from 'react'
import prisma from '@/lib/prisma'

/**
 * Check if user is a team leader (cached per request)
 * This prevents N+1 queries in layouts and components
 */
export const checkIsTeamLeader = cache(async (userId: string) => {
  const team = await prisma.team.findFirst({
    where: {
      leaderId: userId,
    },
    select: {
      id: true,
    },
  })
  
  return !!team
})

/**
 * Get user teams (cached per request)
 * Returns all teams where the user is a leader
 */
export const getUserTeams = cache(async (userId: string) => {
  return await prisma.team.findMany({
    where: {
      leaderId: userId,
    },
    select: {
      id: true,
      name: true,
      isActive: true,
    },
  })
})

/**
 * Get user with role (cached per request)
 * This prevents redundant user lookups when we already have user from auth
 */
export const getUserWithRole = cache(async (userId: string) => {
  return await prisma.user.findUnique({
    where: { id: userId },
    select: { 
      id: true,
      role: true,
      email: true,
      displayName: true,
    },
  })
})
