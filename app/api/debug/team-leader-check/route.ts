import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'

/**
 * Debug endpoint to check if current user is a team leader
 * Useful for troubleshooting team access issues
 */
export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Get teams where user is leader
    const teamsAsLeader = await prisma.team.findMany({
      where: {
        leaderId: user.id,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        leaderId: true,
      },
    })

    // Get teams where user is a member
    const teamsAsMember = await prisma.teamMember.findMany({
      where: {
        userId: user.id,
        isActive: true,
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    })

    // Check all teams in database for debugging
    const allTeams = await prisma.team.findMany({
      select: {
        id: true,
        name: true,
        leaderId: true,
        leader: {
          select: {
            id: true,
            email: true,
            displayName: true,
            role: true,
          },
        },
        isActive: true,
      },
    })

    return NextResponse.json({
      currentUser: {
        id: user.id,
        email: user.email,
        role: user.role,
        displayName: user.displayName,
      },
      isTeamLeader: teamsAsLeader.length > 0,
      teamsAsLeader: teamsAsLeader,
      teamsAsMember: teamsAsMember.map(tm => tm.team),
      allTeamsInSystem: allTeams,
      debug: {
        message: teamsAsLeader.length > 0 
          ? `✅ User IS a team leader of ${teamsAsLeader.length} team(s)` 
          : '❌ User is NOT a team leader of any team',
      },
    })
  } catch (error) {
    console.error('Error in team leader check:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
