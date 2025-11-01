import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>
}) {
  const supabase = await createClient()
  const params = await searchParams

  if (params.code) {
    const { error } = await supabase.auth.exchangeCodeForSession(params.code)

    if (!error) {
      redirect('/')
    } else {
      redirect('/auth/error')
    }
  }

  redirect('/auth/login')
}