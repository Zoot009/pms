import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { UserRole } from '@/lib/generated/prisma'

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // Allow ADMIN and ORDER_CREATOR to fetch teams
    if (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.ORDER_CREATOR) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    const teams = await prisma.team.findMany({
      where: {
        isActive: true,
      },
      include: {
        leader: {
          select: {
            id: true,
            displayName: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json({ teams })
  } catch (error) {
    console.error('Error fetching teams:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
