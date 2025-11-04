import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'
import { UserRole } from '@/lib/generated/prisma'

/**
 * API endpoint to sync Supabase auth users with the database
 * This is called during signup confirmation or can be triggered manually
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get the current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user already exists in database
    const existingUser = await prisma.user.findUnique({
      where: { id: user.id }
    })

    if (existingUser) {
      return NextResponse.json({ 
        message: 'User already synced',
        user: existingUser 
      })
    }

    // Extract user metadata
    const firstName = user.user_metadata?.first_name || user.email?.split('@')[0] || 'User'
    const lastName = user.user_metadata?.last_name || null
    const employeeId = user.user_metadata?.employee_id || null
    const displayName = lastName ? `${firstName} ${lastName}` : firstName

    // Create user in database with MEMBER role by default
    const newUser = await prisma.user.create({
      data: {
        id: user.id,
        email: user.email!,
        firstName,
        lastName,
        displayName,
        employeeId,
        role: UserRole.MEMBER, // Default role for self-registered users
        isActive: true,
      },
    })

    return NextResponse.json({ 
      message: 'User synced successfully',
      user: newUser 
    })
  } catch (error) {
    console.error('Error syncing user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
