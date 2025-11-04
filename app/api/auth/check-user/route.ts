import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'

/**
 * Debug endpoint to check if user exists in both Supabase Auth and Database
 * Only use in development/testing
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get the current authenticated user from Supabase
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      return NextResponse.json({
        supabase: {
          authenticated: false,
          error: authError.message
        },
        database: null
      })
    }

    if (!authUser) {
      return NextResponse.json({
        supabase: {
          authenticated: false,
          error: 'No user session found'
        },
        database: null
      })
    }

    // Check database
    const dbUser = await prisma.user.findUnique({
      where: { id: authUser.id }
    })

    return NextResponse.json({
      supabase: {
        authenticated: true,
        id: authUser.id,
        email: authUser.email,
        confirmed_at: authUser.confirmed_at,
        created_at: authUser.created_at,
        user_metadata: authUser.user_metadata
      },
      database: dbUser ? {
        exists: true,
        id: dbUser.id,
        email: dbUser.email,
        role: dbUser.role,
        isActive: dbUser.isActive,
        firstName: dbUser.firstName,
        lastName: dbUser.lastName,
        employeeId: dbUser.employeeId,
        createdAt: dbUser.createdAt
      } : {
        exists: false,
        message: 'User not found in database'
      }
    })
  } catch (error) {
    console.error('Error checking user:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
