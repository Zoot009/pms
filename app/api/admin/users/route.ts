import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import prisma from '@/lib/prisma'
import { getCurrentUser, createAuditLog } from '@/lib/auth-utils'
import { UserRole, AuditAction } from '@/lib/generated/prisma'

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser || currentUser.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { email, password, firstName, lastName, phone, employeeId, role } = body

    // Create user in Supabase Auth with service role
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`,
      },
    })

    if (authError) {
      console.log('Error creating user in Supabase:', authError)
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user in Supabase' },
        { status: 500 }
      )
    }

    // Create user in database
    const user = await prisma.user.create({
      data: {
        id: authData.user.id,
        email,
        firstName,
        lastName,
        displayName: `${firstName} ${lastName}`,
        phone: phone || null,
        employeeId: employeeId || null,
        role: role as UserRole,
        isActive: true,
      },
    })

    // Create audit log
    await createAuditLog({
      entityType: 'User',
      entityId: user.id,
      action: AuditAction.CREATE,
      performedBy: currentUser.id,
      newValue: user,
      description: `Created user ${user.email}`,
      request,
    })

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser || currentUser.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const users = await prisma.user.findMany({
      include: {
        _count: {
          select: {
            teamMemberships: true,
            leadingTeams: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
