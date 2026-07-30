import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/** Home is locked in this workspace; serve the clean onboarding route. */
export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === '/') {
    return NextResponse.rewrite(new URL('/start', request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: '/',
}
