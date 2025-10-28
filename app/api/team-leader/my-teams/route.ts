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

    const teamIds = teams.map((t) => t.id)

    return NextResponse.json({ teamIds })
  } catch (error) {
    console.error('Error fetching team IDs:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
