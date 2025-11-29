import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { UserRole, TaskStatus } from '@/lib/generated/prisma'

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser || currentUser.role !== UserRole.ADMIN) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Build date filter
    const dateFilter: any = {}
    if (startDate) {
      dateFilter.gte = new Date(startDate)
    }
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      dateFilter.lte = end
    }

    // Fetch all tasks (exclude asking tasks, only service tasks)
    const tasks = await prisma.task.findMany({
      where: {
        ...(Object.keys(dateFilter).length > 0 && {
          createdAt: dateFilter,
        }),
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        assignedUser: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
        service: {
          select: {
            name: true,
            type: true,
          },
        },
      },
    })

    // Fetch asking tasks for individual member statistics
    const askingTasks = await prisma.askingTask.findMany({
      where: {
        ...(Object.keys(dateFilter).length > 0 && {
          createdAt: dateFilter,
        }),
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        assignedUser: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
        completedUser: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
      },
    })

    console.log('[Statistics] Total tasks:', tasks.length)
    console.log('[Statistics] Total asking tasks:', askingTasks.length)
    console.log('[Statistics] Completed asking tasks:', askingTasks.filter(at => at.completedAt).length)

    // Calculate team statistics
    const teamStatsMap = new Map<string, {
      teamId: string
      teamName: string
      totalTasks: number
      notAssigned: number
      assigned: number
      inProgress: number
      paused: number
      completed: number
      overdue: number
    }>()

    // Calculate individual member statistics
    const memberStatsMap = new Map<string, {
      userId: string
      userName: string
      userEmail: string
      teams: Set<string>
      totalTasks: number
      inProgress: number
      paused: number
      completed: number
      overdue: number
      completedThisWeek: number
      completedThisMonth: number
    }>()

    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    startOfWeek.setHours(0, 0, 0, 0)

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    tasks.forEach((task) => {
      // Team statistics
      if (task.team) {
        if (!teamStatsMap.has(task.team.id)) {
          teamStatsMap.set(task.team.id, {
            teamId: task.team.id,
            teamName: task.team.name,
            totalTasks: 0,
            notAssigned: 0,
            assigned: 0,
            inProgress: 0,
            paused: 0,
            completed: 0,
            overdue: 0,
          })
        }

        const teamStats = teamStatsMap.get(task.team.id)!
        teamStats.totalTasks++

        switch (task.status) {
          case TaskStatus.NOT_ASSIGNED:
            teamStats.notAssigned++
            break
          case TaskStatus.ASSIGNED:
            teamStats.assigned++
            break
          case TaskStatus.IN_PROGRESS:
            teamStats.inProgress++
            break
          case TaskStatus.PAUSED:
            teamStats.paused++
            break
          case TaskStatus.COMPLETED:
            teamStats.completed++
            break
          case TaskStatus.OVERDUE:
            teamStats.overdue++
            break
        }
      }

      // Member statistics
      if (task.assignedUser) {
        if (!memberStatsMap.has(task.assignedUser.id)) {
          memberStatsMap.set(task.assignedUser.id, {
            userId: task.assignedUser.id,
            userName: task.assignedUser.displayName || task.assignedUser.email,
            userEmail: task.assignedUser.email,
            teams: new Set<string>(),
            totalTasks: 0,
            inProgress: 0,
            paused: 0,
            completed: 0,
            overdue: 0,
            completedThisWeek: 0,
            completedThisMonth: 0,
          })
        }

        const memberStats = memberStatsMap.get(task.assignedUser.id)!
        memberStats.totalTasks++

        if (task.team) {
          memberStats.teams.add(task.team.name)
        }

        switch (task.status) {
          case TaskStatus.IN_PROGRESS:
            memberStats.inProgress++
            break
          case TaskStatus.PAUSED:
            memberStats.paused++
            break
          case TaskStatus.COMPLETED:
            memberStats.completed++
            if (task.completedAt && task.completedAt >= startOfWeek) {
              memberStats.completedThisWeek++
            }
            if (task.completedAt && task.completedAt >= startOfMonth) {
              memberStats.completedThisMonth++
            }
            break
          case TaskStatus.OVERDUE:
            memberStats.overdue++
            break
        }
      }
    })

    // Process asking tasks for both team and member statistics
    askingTasks.forEach((askingTask) => {
      // Team statistics for asking tasks
      if (askingTask.team) {
        if (!teamStatsMap.has(askingTask.team.id)) {
          teamStatsMap.set(askingTask.team.id, {
            teamId: askingTask.team.id,
            teamName: askingTask.team.name,
            totalTasks: 0,
            notAssigned: 0,
            assigned: 0,
            inProgress: 0,
            paused: 0,
            completed: 0,
            overdue: 0,
          })
        }

        const teamStats = teamStatsMap.get(askingTask.team.id)!
        teamStats.totalTasks++

        if (askingTask.completedAt) {
          teamStats.completed++
        } else {
          // Check if overdue first, as overdue takes precedence
          if (askingTask.deadline && new Date(askingTask.deadline) < now) {
            teamStats.overdue++
          } else if (askingTask.assignedUser) {
            // If assigned and not overdue, count as in progress
            teamStats.inProgress++
          } else {
            // Not assigned yet
            teamStats.notAssigned++
          }
        }
      }

      // Member statistics for asking tasks - count by completedBy for completed tasks
      // For completed tasks, credit goes to the person who completed it (completedBy)
      // For active tasks, count for the assignedUser
      const relevantUserId = askingTask.completedAt && askingTask.completedUser 
        ? askingTask.completedUser.id 
        : askingTask.assignedUser?.id

      if (relevantUserId) {
        const relevantUser = askingTask.completedAt && askingTask.completedUser
          ? askingTask.completedUser
          : askingTask.assignedUser

        if (!memberStatsMap.has(relevantUserId)) {
          memberStatsMap.set(relevantUserId, {
            userId: relevantUserId,
            userName: relevantUser!.displayName || relevantUser!.email,
            userEmail: relevantUser!.email,
            teams: new Set<string>(),
            totalTasks: 0,
            inProgress: 0,
            paused: 0,
            completed: 0,
            overdue: 0,
            completedThisWeek: 0,
            completedThisMonth: 0,
          })
        }

        const memberStats = memberStatsMap.get(relevantUserId)!
        memberStats.totalTasks++

        if (askingTask.team) {
          memberStats.teams.add(askingTask.team.name)
        }

        // Asking tasks don't have the same status enum, so we check completion differently
        if (askingTask.completedAt) {
          memberStats.completed++
          if (askingTask.completedAt >= startOfWeek) {
            memberStats.completedThisWeek++
          }
          if (askingTask.completedAt >= startOfMonth) {
            memberStats.completedThisMonth++
          }
        } else {
          // Active asking task counts as in progress
          memberStats.inProgress++
          
          // Check if overdue
          if (askingTask.deadline && new Date(askingTask.deadline) < now) {
            memberStats.overdue++
            memberStats.inProgress-- // Don't count as both in progress and overdue
          }
        }
      }
    })

    // Convert maps to arrays and calculate rates
    const teamStats = Array.from(teamStatsMap.values()).map((stats) => ({
      ...stats,
      completionRate: stats.totalTasks > 0
        ? Math.round((stats.completed / stats.totalTasks) * 100)
        : 0,
    }))

    const memberStats = Array.from(memberStatsMap.values()).map((stats) => ({
      ...stats,
      teams: Array.from(stats.teams).join(', '),
      completionRate: stats.totalTasks > 0
        ? Math.round((stats.completed / stats.totalTasks) * 100)
        : 0,
    }))

    return NextResponse.json({
      teamStats,
      memberStats,
      summary: {
        totalTasks: tasks.length,
        totalAskingTasks: askingTasks.length,
        totalTeams: teamStatsMap.size,
        totalMembers: memberStatsMap.size,
      },
    })
  } catch (error) {
    console.error('Error fetching task statistics:', error)
    return NextResponse.json(
      { message: 'Failed to fetch statistics' },
      { status: 500 }
    )
  }
}
