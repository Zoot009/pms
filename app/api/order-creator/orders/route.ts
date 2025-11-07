import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      console.error('No user found in session')
      return NextResponse.json({ error: 'Unauthorized - Please log in' }, { status: 401 })
    }

    if (user.role !== 'ORDER_CREATOR') {
      console.error(`User ${user.email} has role ${user.role}, expected ORDER_CREATOR`)
      return NextResponse.json({ 
        error: 'Unauthorized - You do not have permission to access this resource',
        requiredRole: 'ORDER_CREATOR',
        currentRole: user.role
      }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'ALL'
    const search = searchParams.get('search') || ''

    // Build where condition
    const whereCondition: any = {}

    // Status filter
    if (status !== 'ALL') {
      whereCondition.status = status
    }
    // If status is 'ALL', show all orders (no additional filter needed)

    // Search filter
    if (search) {
      whereCondition.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerEmail: { contains: search, mode: 'insensitive' } },
      ]
    }

    const orders = await prisma.order.findMany({
      where: whereCondition,
      include: {
        orderType: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { orderDate: 'desc' },
      ],
    })

    return NextResponse.json({ orders })
  } catch (error) {
    console.error('Error fetching order creator orders:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch orders',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
