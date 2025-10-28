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

    // Get active tasks count for each member
    const membersWithWorkload = await Promise.all(
      uniqueMembers.map(async (member: any) => {
        const activeTasksCount = await prisma.task.count({
          where: {
            assignedTo: member.userId,
            status: {
              in: ['ASSIGNED', 'IN_PROGRESS'],
            },
          },
        })

        let workloadLevel: 'Low' | 'Medium' | 'High'
        if (activeTasksCount <= 2) {
          workloadLevel = 'Low'
        } else if (activeTasksCount <= 5) {
          workloadLevel = 'Medium'
        } else {
          workloadLevel = 'High'
        }

        return {
          id: member.userId,
          displayName: member.user.displayName,
          email: member.user.email,
          activeTasksCount,
          workloadLevel,
        }
      })
    )

    // Sort by workload level (Low first) for easier assignment
    membersWithWorkload.sort((a, b) => a.activeTasksCount - b.activeTasksCount)

    return NextResponse.json({ members: membersWithWorkload })
  } catch (error) {
    console.error('Error fetching team members:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
