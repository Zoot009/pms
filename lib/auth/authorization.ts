import { UserRole } from '@/lib/generated/prisma'
import prisma from '@/lib/prisma'

/**
 * Authorization helpers for API routes and server actions
 * Use these to verify user permissions before performing actions
 */

interface User {
  id: string
  role: UserRole
  email: string
}

/**
 * Check if user can access an order
 * Admins and order creators can access all orders
 * Members can only access orders they have tasks for
 */
export async function canAccessOrder(userId: string, orderId: string, userRole: UserRole): Promise<boolean> {
  // Admins and order creators can access all orders
  if (userRole === UserRole.ADMIN || userRole === UserRole.ORDER_CREATOR) {
    return true
  }

  // Members can only access orders they have tasks for
  const hasAccess = await prisma.order.findFirst({
    where: {
      id: orderId,
      OR: [
        // Has assigned tasks
        {
          tasks: {
            some: {
              assignedTo: userId,
            },
          },
        },
        // Has assigned asking tasks
        {
          askingTasks: {
            some: {
              assignedTo: userId,
            },
          },
        },
      ],
    },
    select: { id: true },
  })

  return !!hasAccess
}

/**
 * Check if user can modify an order
 * Only admins and order creators can modify orders
 */
export function canModifyOrder(userRole: UserRole): boolean {
  return userRole === UserRole.ADMIN || userRole === UserRole.ORDER_CREATOR
}

/**
 * Check if user can access a task
 */
export async function canAccessTask(userId: string, taskId: string, userRole: UserRole): Promise<boolean> {
  // Admins can access all tasks
  if (userRole === UserRole.ADMIN) {
    return true
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      assignedTo: true,
      team: {
        select: {
          leaderId: true,
          members: {
            where: { userId, isActive: true },
            select: { userId: true },
          },
        },
      },
    },
  })

  if (!task) {
    return false
  }

  // User is assigned to the task
  if (task.assignedTo === userId) {
    return true
  }

  // User is team leader
  if (task.team.leaderId === userId) {
    return true
  }

  // User is team member
  return task.team.members.length > 0
}

/**
 * Check if user can modify a task
 */
export async function canModifyTask(userId: string, taskId: string, userRole: UserRole): Promise<boolean> {
  // Admins can modify all tasks
  if (userRole === UserRole.ADMIN) {
    return true
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      assignedTo: true,
      team: {
        select: { leaderId: true },
      },
    },
  })

  if (!task) {
    return false
  }

  // Assigned user can modify their own task
  if (task.assignedTo === userId) {
    return true
  }

  // Team leader can modify team tasks
  return task.team.leaderId === userId
}

/**
 * Check if user can access team data
 */
export async function canAccessTeam(userId: string, teamId: string, userRole: UserRole): Promise<boolean> {
  // Admins can access all teams
  if (userRole === UserRole.ADMIN) {
    return true
  }

  const team = await prisma.team.findFirst({
    where: {
      id: teamId,
      OR: [
        { leaderId: userId },
        {
          members: {
            some: {
              userId,
              isActive: true,
            },
          },
        },
      ],
    },
    select: { id: true },
  })

  return !!team
}

/**
 * Check if user is team leader
 */
export async function isTeamLeader(userId: string, teamId: string): Promise<boolean> {
  const team = await prisma.team.findFirst({
    where: {
      id: teamId,
      leaderId: userId,
    },
    select: { id: true },
  })

  return !!team
}

/**
 * Check if user has admin role
 */
export function isAdmin(userRole: UserRole): boolean {
  return userRole === UserRole.ADMIN
}

/**
 * Check if user has order creator role
 */
export function isOrderCreator(userRole: UserRole): boolean {
  return userRole === UserRole.ORDER_CREATOR || userRole === UserRole.ADMIN
}

/**
 * Verify user has required role(s)
 */
export function hasRole(userRole: UserRole, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(userRole)
}

/**
 * Authorization error response helper
 */
export function unauthorizedResponse(message: string = 'Unauthorized access') {
  return new Response(JSON.stringify({ error: message }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Not found response helper
 */
export function notFoundResponse(message: string = 'Resource not found') {
  return new Response(JSON.stringify({ error: message }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  })
}
