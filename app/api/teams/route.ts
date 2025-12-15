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

    // Allow ADMIN, ORDER_CREATOR, and REVISION_MANAGER to fetch teams
    if (
      currentUser.role !== UserRole.ADMIN && 
      currentUser.role !== UserRole.ORDER_CREATOR &&
      currentUser.role !== UserRole.REVISION_MANAGER
    ) {
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
