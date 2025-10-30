import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ORDER_CREATOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get stats for orders created by this user
    const totalOrders = await prisma.order.count({
      where: { createdById: user.id },
    })

    const pendingOrders = await prisma.order.count({
      where: {
        createdById: user.id,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
    })

    const completedOrders = await prisma.order.count({
      where: {
        createdById: user.id,
        status: 'COMPLETED',
      },
    })

    const overdueOrders = await prisma.order.count({
      where: {
        createdById: user.id,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        deliveryDate: { lt: new Date() },
      },
    })

    // Get task stats for this user
    const myTasks = await prisma.task.count({
      where: {
        assignedTo: user.id,
        status: { not: 'COMPLETED' },
      },
    })

    const completedTasks = await prisma.task.count({
      where: {
        assignedTo: user.id,
        status: 'COMPLETED',
      },
    })

    return NextResponse.json({
      totalOrders,
      pendingOrders,
      completedOrders,
      overdueOrders,
      myTasks,
      completedTasks,
    })
  } catch (error) {
    console.error('Error fetching order creator dashboard:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}
