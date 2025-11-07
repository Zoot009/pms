import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'

// GET - Fetch all orders for folder link management (for order creator)
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'ORDER_CREATOR') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // Fetch all orders (ORDER_CREATOR can see all orders)
    const orders = await prisma.order.findMany({
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
    console.error('Error fetching orders:', error)
    return NextResponse.json(
      { message: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}
