import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'

// GET - Fetch orders without folder links
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const orders = await prisma.order.findMany({
      where: {
        folderLink: null,
      },
      include: {
        orderType: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        orderDate: 'desc',
      },
    })

    return NextResponse.json({ orders })
  } catch (error) {
    console.error('Error fetching orders without folder links:', error)
    return NextResponse.json(
      { message: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}
