import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'

/**
 * Debug endpoint to check team leader assignment in database
 * Returns raw database query results
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

    // Direct database queries
    const userRecord = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        role: true,
        displayName: true,
        isActive: true,
      },
    })

    const teamsQuery1 = await prisma.team.findMany({
      where: {
        leaderId: user.id,
      },
    })

    const teamsQuery2 = await prisma.$queryRaw`
      SELECT * FROM teams WHERE leader_id = ${user.id}
    `

    const allTeamsWithLeaders = await prisma.$queryRaw`
      SELECT 
        t.id,
        t.name,
        t.leader_id,
        u.email as leader_email,
        u.role as leader_role,
        t.is_active
      FROM teams t
      LEFT JOIN users u ON t.leader_id = u.id
      ORDER BY t.created_at DESC
    `

    return NextResponse.json({
      message: 'Raw database check results',
      currentUser: {
        fromAuth: user,
        fromDatabase: userRecord,
      },
      teamLeaderCheck: {
        prismaQuery: {
          count: teamsQuery1.length,
          teams: teamsQuery1,
        },
        rawSqlQuery: {
          count: Array.isArray(teamsQuery2) ? teamsQuery2.length : 0,
          teams: teamsQuery2,
        },
      },
      allTeamsInDatabase: allTeamsWithLeaders,
      diagnosis: {
        isTeamLeader: teamsQuery1.length > 0,
        message: teamsQuery1.length > 0
          ? `✅ User IS a team leader of ${teamsQuery1.length} team(s)`
          : '❌ User is NOT assigned as a team leader in any team',
        action: teamsQuery1.length === 0
          ? 'Go to Admin > Teams and assign this user as a team leader, or create a new team with this user as leader'
          : 'User should have access to team management pages',
      },
    })
  } catch (error) {
    console.error('Error in database check:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}
