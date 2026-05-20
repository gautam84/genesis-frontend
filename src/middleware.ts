import { NextResponse, type NextRequest } from 'next/server';

const ACCESS_COOKIE = 'genesis_access_token';

// Routes that require an authenticated session. Anything not matching here
// (e.g. /signup verification flows) passes through; AuthGuard / page-level
// checks remain in place as a defence-in-depth layer.
const PROTECTED_PREFIXES = ['/home', '/workspace'];

// Routes that should redirect to /home when the user already has a session.
const GUEST_ONLY_PREFIXES = ['/login', '/signup'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(ACCESS_COOKIE);

  if (PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`)) && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (GUEST_ONLY_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`)) && hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = '/home';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.svg|.*\\.png).*)'],
};
