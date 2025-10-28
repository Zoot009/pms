import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { UserRole } from '@/lib/generated/prisma'

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser || currentUser.role !== UserRole.ADMIN) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 })
    }

    // Get all active users (any user can be a team leader)
    const leaders = await prisma.user.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
      },
      orderBy: {
        displayName: 'asc',
      },
    })

    return NextResponse.json({ leaders })
  } catch (error) {
    console.error('Error fetching leaders:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
