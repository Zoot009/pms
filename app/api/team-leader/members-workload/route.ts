import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // Get teams where user is team leader
    const teams = await prisma.team.findMany({
      where: {
        leaderId: user.id,
      },
      include: {
        members: {
          where: {
            isActive: true,
          },
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                email: true,
              },
            },
          },
        },
      },
    })

    if (teams.length === 0) {
      return NextResponse.json(
        { message: 'You are not a team leader of any team' },
        { status: 403 }
      )
    }

    // Flatten all team members from all teams
    const allMembers = teams.flatMap((team: { members: any[] }) => team.members)

    // Remove duplicates (in case a user is in multiple teams)
    const uniqueMembers = Array.from(
      new Map(allMembers.map((member: { userId: string }) => [member.userId, member])).values()
    )

    // Get detailed workload for each member
    const membersWithWorkload = await Promise.all(
      uniqueMembers.map(async (member: any) => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)

        // Get task counts
        const [activeTasks, inProgressTasks, completedTodayTasks, overdueTasks, recentTasks] =
          await Promise.all([
            // Active tasks (ASSIGNED + IN_PROGRESS)
            prisma.task.count({
              where: {
                assignedTo: member.userId,
                status: {
                  in: ['ASSIGNED', 'IN_PROGRESS'],
                },
              },
            }),
            // In progress tasks only
            prisma.task.count({
              where: {
                assignedTo: member.userId,
                status: 'IN_PROGRESS',
              },
            }),
            // Completed today
            prisma.task.count({
              where: {
                assignedTo: member.userId,
                status: 'COMPLETED',
                completedAt: {
                  gte: today,
                  lt: tomorrow,
                },
              },
            }),
            // Overdue tasks
            prisma.task.count({
              where: {
                assignedTo: member.userId,
                status: {
                  in: ['ASSIGNED', 'IN_PROGRESS'],
                },
                deadline: {
                  lt: new Date(),
                },
              },
            }),
            // Recent tasks (for display)
            prisma.task.findMany({
              where: {
                assignedTo: member.userId,
                status: {
                  in: ['ASSIGNED', 'IN_PROGRESS'],
                },
              },
              take: 5,
              orderBy: [
                { priority: 'desc' },
                { deadline: 'asc' },
              ],
              select: {
                id: true,
                title: true,
                status: true,
                priority: true,
                service: {
                  select: {
                    name: true,
                  },
                },
              },
            }),
          ])

        // Calculate workload level
        let workloadLevel: 'Low' | 'Medium' | 'High'
        if (activeTasks <= 2) {
          workloadLevel = 'Low'
        } else if (activeTasks <= 5) {
          workloadLevel = 'Medium'
        } else {
          workloadLevel = 'High'
        }

        return {
          id: member.userId,
          displayName: member.user.displayName,
          email: member.user.email,
          activeTasksCount: activeTasks,
          inProgressCount: inProgressTasks,
          completedTodayCount: completedTodayTasks,
          overdueCount: overdueTasks,
          workloadLevel,
          recentTasks,
        }
      })
    )

    // Sort by workload level and active tasks count
    membersWithWorkload.sort((a, b) => {
      const workloadOrder = { Low: 1, Medium: 2, High: 3 }
      const aOrder = workloadOrder[a.workloadLevel]
      const bOrder = workloadOrder[b.workloadLevel]
      
      if (aOrder !== bOrder) {
        return aOrder - bOrder
      }
      
      return a.activeTasksCount - b.activeTasksCount
    })

    return NextResponse.json({ members: membersWithWorkload })
  } catch (error) {
    console.error('Error fetching member workload:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
