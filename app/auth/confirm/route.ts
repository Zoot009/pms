import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { UserRole } from '@/lib/generated/prisma'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/'
  const redirectTo = new URL(request.url).origin

  console.log('=== Email Confirmation Started ===')
  console.log('Type:', type)
  console.log('Token hash present:', !!token_hash)
  console.log('Next URL:', next)

  if (token_hash && type) {
    const supabase = await createClient()

    const { data, error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })
    
    console.log('OTP Verification result:', { 
      success: !error, 
      error: error?.message,
      userId: data?.user?.id,
      userEmail: data?.user?.email
    })

    if (!error && data.session) {
      // For password recovery, redirect to update-password page
      if (type === 'recovery') {
        console.log('Password recovery confirmed, redirecting to update-password')
        return NextResponse.redirect(`${redirectTo}/auth/update-password`)
      }
      
      // For signup confirmation, sync user with database
      if (type === 'signup' || type === 'email') {
        console.log('Signup confirmation detected, attempting to sync user to database')
        
        try {
          const { data: { user } } = await supabase.auth.getUser()
          
          console.log('Fetched user from Supabase:', {
            id: user?.id,
            email: user?.email,
            confirmed_at: user?.confirmed_at,
            metadata: user?.user_metadata
          })
          
          if (user) {
            // Check if user already exists in database
            const existingUser = await prisma.user.findUnique({
              where: { id: user.id }
            })

            if (existingUser) {
              console.log('User already exists in database:', existingUser.email)
            } else {
              console.log('User not found in database, creating new record')
              
              // Extract user metadata
              const firstName = user.user_metadata?.first_name || user.email?.split('@')[0] || 'User'
              const lastName = user.user_metadata?.last_name || null
              const employeeId = user.user_metadata?.employee_id || null
              const displayName = lastName ? `${firstName} ${lastName}` : firstName

              console.log('Creating user with data:', {
                id: user.id,
                email: user.email,
                firstName,
                lastName,
                employeeId,
                displayName
              })

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
              
              console.log('✅ User created successfully in database:', newUser.id, newUser.email)
            }
          } else {
            console.error('❌ No user returned from Supabase after OTP verification')
          }
        } catch (syncError) {
          console.error('❌ Error syncing user with database:', syncError)
          console.error('Error details:', {
            name: syncError instanceof Error ? syncError.name : 'Unknown',
            message: syncError instanceof Error ? syncError.message : String(syncError),
            stack: syncError instanceof Error ? syncError.stack : undefined
          })
          // Don't fail the confirmation, just log the error
          // User can be synced later through the API
        }
      }
      
      console.log('Redirecting to:', next)
      // redirect user to specified redirect URL or root of app
      return NextResponse.redirect(`${redirectTo}${next}`)
    } else {
      console.error('❌ OTP verification failed:', error?.message || 'No session created')
    }
  } else {
    console.error('❌ Missing token_hash or type in confirmation URL')
  }

  // redirect the user to an error page with some instructions
  console.log('Redirecting to error page')
  return NextResponse.redirect(`${redirectTo}/auth/error?message=Invalid or expired confirmation link`)
}