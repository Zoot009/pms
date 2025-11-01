import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Protected routes
  if (
    !user &&
    !pathname.startsWith('/login') &&
    !pathname.startsWith('/auth')
  ) {
    // No user, potentially respond by redirecting the user to the login page
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Role-based access control
  if (user && !pathname.startsWith('/auth') && !pathname.startsWith('/login')) {
    try {
      // Get user role from database
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { role: true, id: true },
      })

      if (dbUser) {
        const userRole = dbUser.role

        // Check admin routes
        if (pathname.startsWith('/admin')) {
          if (userRole !== 'ADMIN') {
            const url = request.nextUrl.clone()
            url.pathname = '/auth/unauthorized'
            return NextResponse.redirect(url)
          }
        }

        // Check order creator routes
        if (pathname.startsWith('/order-creator')) {
          if (userRole !== 'ORDER_CREATOR' && userRole !== 'ADMIN') {
            const url = request.nextUrl.clone()
            url.pathname = '/auth/unauthorized'
            return NextResponse.redirect(url)
          }
        }

        // Check team leader routes
        if (pathname.startsWith('/member/team')) {
          if (userRole !== 'MEMBER') {
            const url = request.nextUrl.clone()
            url.pathname = '/auth/unauthorized'
            return NextResponse.redirect(url)
          }
          
          // Additional check: verify user is actually a team leader
          const isTeamLeader = await prisma.team.findFirst({
            where: { leaderId: dbUser.id },
            select: { id: true },
          })

          if (!isTeamLeader) {
            const url = request.nextUrl.clone()
            url.pathname = '/auth/unauthorized'
            return NextResponse.redirect(url)
          }
        }

        // Check member routes (excluding team leader routes which are checked above)
        if (pathname.startsWith('/member') && !pathname.startsWith('/member/team')) {
          if (userRole !== 'MEMBER') {
            const url = request.nextUrl.clone()
            url.pathname = '/auth/unauthorized'
            return NextResponse.redirect(url)
          }
        }
      }
    } catch (error) {
      console.error('Error checking user role:', error)
      // Don't block on error, let the page handle it
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse
}

