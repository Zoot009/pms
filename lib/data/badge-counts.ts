import { cache } from 'react'
import prisma from '@/lib/prisma'

/**
 * Get revision task count for a user (cached per request)
 * This prevents N+1 queries in layouts and components
 */
export const getRevisionTaskCount = cache(async (userId: string) => {
  return await prisma.task.count({
    where: {
      assignedTo: userId,
      isRevisionTask: true,
      status: { in: ['ASSIGNED', 'IN_PROGRESS'] },
    },
  })
})
