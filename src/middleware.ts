import { NextResponse, type NextRequest } from 'next/server';

const ACCESS_COOKIE = 'genesis_access_token';
const REFRESH_COOKIE = 'genesis_refresh_token';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
const REFRESH_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

// Routes that require an authenticated session. Anything not matching here
// (e.g. /signup verification flows) passes through; AuthGuard / page-level
// checks remain in place as a defence-in-depth layer.
const PROTECTED_PREFIXES = ['/home', '/workspace'];

// Routes that should redirect to /home when the user already has a session.
const GUEST_ONLY_PREFIXES = ['/login', '/signup'];

const matches = (path: string, prefixes: string[]) =>
  prefixes.some((p) => path === p || path.startsWith(`${p}/`));

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasAccess = request.cookies.has(ACCESS_COOKIE);
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  const isProtected = matches(pathname, PROTECTED_PREFIXES);
  const isGuestOnly = matches(pathname, GUEST_ONLY_PREFIXES);

  // Proactive refresh: access TTL is short, refresh TTL is 30 days. When the
  // access cookie has expired but refresh is still alive, swap tokens here
  // — middleware is the only pre-render place that can both call Spring and
  // mutate cookies.
  if (isProtected && !hasAccess && refreshToken) {
    let refreshResponse: Response | null = null;
    try {
      refreshResponse = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // Spring unreachable. Send to login; cookies stay so a retry can
      // refresh once the backend is back.
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }

    if (refreshResponse.ok) {
      const { data } = (await refreshResponse.json()) as {
        data: { accessToken: string; refreshToken: string; expiresIn: number };
      };

      // Make the new access cookie visible to downstream RSC in this same
      // request — request.cookies.set mutates the Cookie header, which we
      // forward via NextResponse.next({ request: { headers } }).
      request.cookies.set(ACCESS_COOKIE, data.accessToken);
      request.cookies.set(REFRESH_COOKIE, data.refreshToken);

      const response = NextResponse.next({
        request: { headers: request.headers },
      });
      response.cookies.set(ACCESS_COOKIE, data.accessToken, cookieOptions(data.expiresIn));
      response.cookies.set(
        REFRESH_COOKIE,
        data.refreshToken,
        cookieOptions(REFRESH_MAX_AGE_SECONDS),
      );
      return response;
    }

    // Refresh rejected — clear both cookies and route to /login.
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    const response = NextResponse.redirect(url);
    response.cookies.delete(ACCESS_COOKIE);
    response.cookies.delete(REFRESH_COOKIE);
    return response;
  }

  const hasSession = hasAccess || !!refreshToken;

  if (isProtected && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (isGuestOnly && hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = '/home';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.svg|.*\\.png).*)'],
};
