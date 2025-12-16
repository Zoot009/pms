import { createClient } from '@supabase/supabase-js'

/**
 * Creates a Supabase admin client with service role privileges
 * This client bypasses Row Level Security (RLS) and should only be used
 * for admin operations on the server side
 * 
 * SECURITY WARNING: This function MUST NEVER be imported in client components
 */
export function createAdminClient() {
  // Prevent usage on client side
  if (typeof window !== 'undefined') {
    throw new Error('Admin client cannot be used on client side - this is a critical security violation')
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing Supabase admin credentials - check environment variables')
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

