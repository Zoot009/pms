import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import prisma from '@/lib/prisma'
import { getCurrentUser, createAuditLog } from '@/lib/auth-utils'
import { UserRole, AuditAction } from '@/lib/generated/prisma'

// Generate default password based on first name
function generateDefaultPassword(firstName: string): string {
  const lowerFirstName = firstName.toLowerCase().trim()
  return `${lowerFirstName}@123`
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser || currentUser.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { email, firstName, lastName, employeeId, role } = body

    // Generate default password based on first name
    const defaultPassword = generateDefaultPassword(firstName)

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
    console.log("Password:", defaultPassword)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: defaultPassword,
      email_confirm: true, // Auto-confirm the email
      user_metadata: {
        first_name: firstName,
        last_name: lastName || '',
        full_name: lastName ? `${firstName} ${lastName}` : firstName,
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
        lastName: lastName || null,
        displayName: lastName ? `${firstName} ${lastName}` : firstName,
        employeeId: employeeId || null,
        role: role as UserRole,
        isActive: true,
      },
    })

    // Send a welcome email notification using Supabase's invite functionality
    // This will send an email to the user with their login information
    try {
      const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
        email,
        {
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || request.headers.get('origin') || 'http://localhost:3000'}/auth/login`,
          data: {
            first_name: firstName,
            last_name: lastName || '',
            default_password: defaultPassword,
          }
        }
      )
      
      if (inviteError) {
        console.error('Error sending welcome email:', inviteError)
        // Don't fail - user is already created
      }
    } catch (inviteErr) {
      console.error('Error sending welcome email:', inviteErr)
      // Don't fail - user is already created
    }

    // Create audit log
    await createAuditLog({
      entityType: 'User',
      entityId: user.id,
      action: AuditAction.CREATE,
      performedBy: currentUser.id,
      newValue: user,
      description: `Created user ${user.email} with default password`,
      request,
    })

    return NextResponse.json({ 
      user,
      defaultPassword,
      message: `User created successfully. Welcome email sent. Default password is: ${defaultPassword}` 
    })
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
