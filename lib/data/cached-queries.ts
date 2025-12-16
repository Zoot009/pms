import { cache } from 'react'
import prisma from '@/lib/prisma'

/**
 * Cached data fetching functions for server components
 * These functions use React's cache() to deduplicate requests within a single render
 */

/**
 * Get active order types with services (cached)
 * Use this in server components for dropdown/selection lists
 */
export const getActiveOrderTypes = cache(async () => {
  return await prisma.orderType.findMany({
    where: { isActive: true },
    include: {
      services: {
        include: {
          service: {
            include: {
              team: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: { name: 'asc' },
  })
})

/**
 * Get active teams (cached)
 */
export const getActiveTeams = cache(async () => {
  return await prisma.team.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      leaderId: true,
      leader: {
        select: {
          displayName: true,
          email: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  })
})

/**
 * Get active services by team (cached)
 */
export const getServicesByTeam = cache(async (teamId: string) => {
  return await prisma.service.findMany({
    where: {
      teamId,
      isActive: true,
    },
    include: {
      team: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  })
})

/**
 * Get order with minimal data (cached)
 * Use this for lists and overviews
 */
export const getOrderSummary = cache(async (orderId: string) => {
  return await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      deliveryDate: true,
      customerName: true,
      amount: true,
      orderType: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          tasks: {
            where: {
              status: { notIn: ['COMPLETED'] },
            },
          },
          askingTasks: {
            where: {
              completedAt: null,
            },
          },
        },
      },
    },
  })
})

/**
 * Get user with team memberships (cached)
 */
export const getUserWithTeams = cache(async (userId: string) => {
  return await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      displayName: true,
      firstName: true,
      lastName: true,
      role: true,
      teamMemberships: {
        where: { isActive: true },
        include: {
          team: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      },
      leadingTeams: {
        where: { isActive: true },
        select: {
          id: true,
          name: true,
        },
      },
    },
  })
})
