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
    const search = searchParams.get('search') || ''
    const teamFilter = searchParams.get('team') || 'all'
    const statusFilter = searchParams.get('status') || 'all' // all, active, inactive
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

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

    // Build user where condition
    const userWhereCondition: any = {
      role: {
        in: [UserRole.MEMBER, UserRole.ADMIN, UserRole.ORDER_CREATOR]
      }
    }

    if (statusFilter === 'active') {
      userWhereCondition.isActive = true
    } else if (statusFilter === 'inactive') {
      userWhereCondition.isActive = false
    }

    if (search) {
      userWhereCondition.OR = [
        { displayName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { employeeId: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (teamFilter !== 'all') {
      userWhereCondition.teamMemberships = {
        some: {
          teamId: teamFilter,
          isActive: true,
        },
      }
    }

    // Get total count
    const totalCount = await prisma.user.count({
      where: userWhereCondition,
    })

    // Fetch users with their team memberships
    const users = await prisma.user.findMany({
      where: userWhereCondition,
      include: {
        teamMemberships: {
          where: { isActive: true },
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
      orderBy: [
        { isActive: 'desc' },
        { displayName: 'asc' },
        { email: 'asc' },
      ],
      skip: (page - 1) * limit,
      take: limit,
    })

    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    startOfWeek.setHours(0, 0, 0, 0)

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Fetch tasks and asking tasks for these users
    const userIds = users.map(u => u.id)

    const taskWhereCondition: any = {
      assignedTo: { in: userIds },
    }

    if (Object.keys(dateFilter).length > 0) {
      taskWhereCondition.createdAt = dateFilter
    }

    const [tasks, askingTasks] = await Promise.all([
      prisma.task.findMany({
        where: taskWhereCondition,
        include: {
          team: {
            select: {
              id: true,
              name: true,
            },
          },
          service: {
            select: {
              id: true,
              name: true,
            },
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
            },
          },
        },
      }),
      // Fetch asking tasks assigned to OR completed by these users
      prisma.askingTask.findMany({
        where: {
          OR: [
            {
              assignedTo: { in: userIds },
              ...(Object.keys(dateFilter).length > 0 && {
                createdAt: dateFilter,
              }),
            },
            {
              completedBy: { in: userIds },
              ...(Object.keys(dateFilter).length > 0 && {
                completedAt: dateFilter,
              }),
            },
          ],
        },
        include: {
          team: {
            select: {
              id: true,
              name: true,
            },
          },
          service: {
            select: {
              id: true,
              name: true,
            },
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
            },
          },
        },
      }),
    ])

    // Build member statistics
    const memberStats = users.map((user) => {
      const userTasks = tasks.filter(t => t.assignedTo === user.id)
      // Count asking tasks assigned to OR completed by this user
      const userAskingTasks = askingTasks.filter(at => 
        at.assignedTo === user.id || at.completedBy === user.id
      )

      // Service Task Statistics
      const serviceTasks = {
        total: userTasks.length,
        notAssigned: userTasks.filter(t => t.status === TaskStatus.NOT_ASSIGNED).length,
        assigned: userTasks.filter(t => t.status === TaskStatus.ASSIGNED).length,
        inProgress: userTasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
        paused: userTasks.filter(t => t.status === TaskStatus.PAUSED).length,
        completed: userTasks.filter(t => t.status === TaskStatus.COMPLETED).length,
        overdue: userTasks.filter(t => t.status === TaskStatus.OVERDUE).length,
        completedThisWeek: userTasks.filter(
          t => t.status === TaskStatus.COMPLETED && t.completedAt && t.completedAt >= startOfWeek
        ).length,
        completedThisMonth: userTasks.filter(
          t => t.status === TaskStatus.COMPLETED && t.completedAt && t.completedAt >= startOfMonth
        ).length,
      }

      // Asking Task Statistics - count completed tasks by completedBy, not assignedTo
      const askingTaskStats = {
        total: userAskingTasks.length,
        active: userAskingTasks.filter(at => !at.completedAt).length,
        // Count as completed if user completed it (completedBy) OR if assigned and marked complete
        completed: userAskingTasks.filter(at => at.completedAt && at.completedBy === user.id).length,
        overdue: userAskingTasks.filter(
          at => !at.completedAt && at.deadline && new Date(at.deadline) < now
        ).length,
        completedThisWeek: userAskingTasks.filter(
          at => at.completedAt && at.completedBy === user.id && at.completedAt >= startOfWeek
        ).length,
        completedThisMonth: userAskingTasks.filter(
          at => at.completedAt && at.completedBy === user.id && at.completedAt >= startOfMonth
        ).length,
      }

      // Combined statistics
      const totalTasks = serviceTasks.total + askingTaskStats.total
      const totalCompleted = serviceTasks.completed + askingTaskStats.completed
      const totalActive = (serviceTasks.inProgress + serviceTasks.assigned + serviceTasks.notAssigned) + askingTaskStats.active
      const totalOverdue = serviceTasks.overdue + askingTaskStats.overdue
      const completionRate = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0

      return {
        userId: user.id,
        userName: user.displayName || user.email,
        email: user.email,
        employeeId: user.employeeId,
        role: user.role,
        isActive: user.isActive,
        teams: user.teamMemberships.map(tm => ({
          id: tm.team.id,
          name: tm.team.name,
        })),
        serviceTasks,
        askingTasks: askingTaskStats,
        combined: {
          totalTasks,
          totalCompleted,
          totalActive,
          totalOverdue,
          completionRate,
          completedThisWeek: serviceTasks.completedThisWeek + askingTaskStats.completedThisWeek,
          completedThisMonth: serviceTasks.completedThisMonth + askingTaskStats.completedThisMonth,
        },
      }
    })

    // Get all teams for filter dropdown
    const teams = await prisma.team.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({
      members: memberStats,
      teams,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: page * limit < totalCount,
      },
    })
  } catch (error) {
    console.error('Error fetching member statistics:', error)
    return NextResponse.json(
      { message: 'Failed to fetch member statistics' },
      { status: 500 }
    )
  }
}
