import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const session = await auth()
  const { pathname } = request.nextUrl

  const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password']
  const isPublic = publicPaths.some(p => pathname.startsWith(p))
    || pathname.startsWith('/api/auth')
    || pathname.startsWith('/api/register')
    || pathname.startsWith('/api/forgot-password')
    || pathname.startsWith('/api/reset-password')
    || pathname.startsWith('/api/push')
    || pathname.startsWith('/_next')
    || pathname === '/favicon.ico'
    || pathname === '/manifest.json'
    || pathname.startsWith('/icons')
    || pathname === '/sw.js'

  if (!session?.user && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (session?.user && (pathname === '/login' || pathname === '/register' || pathname === '/')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|sw.js).*)'],
}
