import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { syncUserToDatabase } from '@/lib/auth-utils'

export async function GET() {
  try {
    const supabase = await createClient()
    
    const {
      data: { user: authUser },
      error,
    } = await supabase.auth.getUser()

    if (error || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Sync to database
    const user = await syncUserToDatabase(authUser)

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error syncing user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST() {
  try {
    const supabase = await createClient()
    
    const {
      data: { user: authUser },
      error,
    } = await supabase.auth.getUser()

    if (error || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Sync to database
    const user = await syncUserToDatabase(authUser)

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error syncing user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
