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
      select: {
        id: true,
      },
    })

    if (teams.length === 0) {
      return NextResponse.json(
        { message: 'You are not a team leader of any team' },
        { status: 403 }
      )
    }

    const teamIds = teams.map((t) => t.id)

    // Get all tasks assigned to team members in the leader's teams
    const tasks = await prisma.task.findMany({
      where: {
        teamId: {
          in: teamIds,
        },
        status: {
          not: 'NOT_ASSIGNED', // Only show assigned tasks
        },
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            customerName: true,
            orderDate: true,
            deliveryDate: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            type: true,
            timeLimit: true,
          },
        },
        assignedUser: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
      },
      orderBy: [
        { status: 'asc' },
        { priority: 'desc' },
        { deadline: 'asc' },
      ],
    })

    return NextResponse.json({ tasks })
  } catch (error) {
    console.error('Error fetching team tasks:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
