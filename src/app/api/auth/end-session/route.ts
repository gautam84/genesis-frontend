import { NextResponse } from 'next/server';
import { clearSessionCookies } from '@/server/http';

/**
 * Logout endpoint reachable from server components — they cannot mutate
 * cookies during render, so RSC pages that catch SessionExpiredError
 * redirect here. We clear the (now-stale) cookies and bounce to /login,
 * which prevents the revoked-token loop where middleware would see the
 * still-present access cookie on /login and redirect back to /home.
 */
export async function GET(request: Request) {
  await clearSessionCookies();
  const url = new URL('/login', request.url);
  return NextResponse.redirect(url);
}
