import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'

/**
 * Get current authenticated user's details from database
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get the current authenticated user from Supabase
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user details from database
    let user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        displayName: true,
        employeeId: true,
        role: true,
        isActive: true,
        avatar: true,
        createdAt: true,
        lastLoginAt: true,
      }
    })

    // If user doesn't exist in database, sync from Supabase Auth
    if (!user) {
      console.log(`User ${authUser.email} not found in database, syncing...`)
      
      try {
        const firstName = authUser.user_metadata?.first_name || authUser.email?.split('@')[0] || 'User'
        const lastName = authUser.user_metadata?.last_name || null
        const employeeId = authUser.user_metadata?.employee_id || null
        const displayName = lastName ? `${firstName} ${lastName}` : firstName

        // Create user in database with MEMBER role by default
        user = await prisma.user.create({
          data: {
            id: authUser.id,
            email: authUser.email!,
            firstName,
            lastName,
            displayName,
            employeeId,
            role: 'MEMBER', // Default role for self-registered users
            isActive: true,
          },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            displayName: true,
            employeeId: true,
            role: true,
            isActive: true,
            avatar: true,
            createdAt: true,
            lastLoginAt: true,
          }
        })
        
        console.log(`User ${authUser.email} synced successfully with role: ${user.role}`)
      } catch (syncError) {
        console.error('Error syncing user to database:', syncError)
        return NextResponse.json(
          { error: 'Failed to sync user to database' },
          { status: 500 }
        )
      }
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'User account is disabled' },
        { status: 403 }
      )
    }

    // Update last login timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    })

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error fetching current user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
