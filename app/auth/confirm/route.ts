import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const code = searchParams.get('code')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/'
  const redirectTo = new URL(request.url).origin

  console.log('=== Email Confirmation Started ===')
  console.log('Type:', type)
  console.log('Token hash present:', !!token_hash)
  console.log('Code present:', !!code)
  console.log('Next URL:', next)

  // Handle both old token_hash format and new code format
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
          
          if (user) {
            // Check if user already exists in database
            const existingUser = await prisma.user.findUnique({
              where: { id: user.id }
            })

            if (!existingUser) {
              // Extract user metadata
              const firstName = user.user_metadata?.first_name || user.email?.split('@')[0] || 'User'
              const lastName = user.user_metadata?.last_name || null
              const displayName = lastName ? `${firstName} ${lastName}` : firstName

              // Create user in database
              const newUser = await prisma.user.create({
                data: {
                  id: user.id,
                  email: user.email!,
                  firstName,
                  lastName,
                  displayName,
                },
              })
              
              console.log('✅ User created successfully in database:', newUser.id, newUser.email)
            }
          }
        } catch (syncError) {
          console.error('❌ Error syncing user with database:', syncError)
        }
      }
      
      console.log('✅ OTP verification successful, redirecting to projects')
      return NextResponse.redirect(`${redirectTo}/projects`)
    } else {
      console.error('❌ OTP verification failed:', error?.message || 'No session created')
      // Redirect to login page with error message
      return NextResponse.redirect(`${redirectTo}/auth/login?message=Email confirmation failed. Please try again or log in manually.`)
    }
  } else if (code) {
    // Handle the newer code-based confirmation
    const supabase = await createClient()

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    console.log('Code exchange result:', { 
      success: !error, 
      error: error?.message,
      userId: data?.user?.id,
      userEmail: data?.user?.email
    })

    if (!error && data.session) {
      // For code-based confirmation, we assume it's signup confirmation
      // since password recovery typically uses different flow
      console.log('Code confirmation detected, attempting to sync user to database')
        
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
              const displayName = lastName ? `${firstName} ${lastName}` : firstName

              console.log('Creating user with data:', {
                id: user.id,
                email: user.email,
                firstName,
                lastName,
                displayName
              })

              // Create user in database
              const newUser = await prisma.user.create({
                data: {
                  id: user.id,
                  email: user.email!,
                  firstName,
                  lastName,
                  displayName,
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
      
      console.log('✅ Confirmation successful, redirecting to projects')
      // redirect user to projects page after successful confirmation
      return NextResponse.redirect(`${redirectTo}/projects`)
    } else {
      console.error('❌ Code exchange failed:', error?.message || 'No session created')
      // Redirect to login page with success message for manual login
      return NextResponse.redirect(`${redirectTo}/auth/login?message=Email confirmed! Please log in to continue.`)
    }
  } else {
    console.error('❌ Missing token_hash/code or type in confirmation URL')
    // Redirect to login page instead of error page
    return NextResponse.redirect(`${redirectTo}/auth/login?message=Please check your email and click the confirmation link, then log in.`)
  }

  // This should never be reached, but just in case
  console.log('Redirecting to login as fallback')
  return NextResponse.redirect(`${redirectTo}/auth/login`)
}