import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { UserRole } from '@/lib/generated/prisma'
import { getCurrentUser } from '@/lib/auth-utils';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    })

    if (!dbUser || (dbUser.role !== UserRole.REVISION_MANAGER && dbUser.role !== UserRole.ADMIN)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id: orderId } = await params
    const body = await request.json()
    const { taskName, memberId, notes, deadline } = body

    // Validate required fields
    if (!taskName || !memberId || !deadline) {
      return NextResponse.json({ error: 'Task name, member, and deadline are required' }, { status: 400 })
    }

    // Check if order exists and is a revision order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        isRevision: true,
        status: true,
        orderNumber: true,
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (!order.isRevision) {
      return NextResponse.json({ error: 'This is not a revision order' }, { status: 400 })
    }

    // Check if member exists
    const member = await prisma.user.findUnique({
      where: { id: memberId },
      select: { 
        id: true, 
        displayName: true,
        email: true,
        role: true,
        teamMemberships: true,
      },
    })

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    if (member.role !== UserRole.MEMBER) {
      return NextResponse.json({ error: 'Selected user is not a member' }, { status: 400 })
    }

    // Create revision task and assign directly to member
    const task = await prisma.task.create({
      data: {
        orderId: order.id,
        title: taskName,
        description: notes || null,
        notes: notes || null,
        deadline: new Date(deadline),
        status: 'ASSIGNED', // Directly assigned
        assignedTo: member.id, // Assign to member directly
        priority: 'HIGH',
        isMandatory: true,
        isRevisionTask: true,
        createdById: user.id,
        teamId: member.teamMemberships[0]?.teamId// Add required teamId field
      },
      include: {
        assignedUser: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
      },
    })

return NextResponse.json({
  message: 'Revision task created and assigned successfully',
  task,
})
  } catch (error) {
    console.error('Error creating revision task:', error)
    return NextResponse.json(
      { error: 'Failed to create revision task' },
      { status: 500 }
    )
  }
}
