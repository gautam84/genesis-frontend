import 'server-only';

import { cookies } from 'next/headers';
import { TokenResponse } from '@/lib/api';
import { NetworkError, SessionExpiredError } from '@/lib/errors';

/**
 * Server-only Spring API client. Reads the access token from HttpOnly
 * cookies and sends it as a Bearer header. Used by Server Actions and
 * Server Components — never imported by client code (the `server-only`
 * marker fails the build if a client file tries).
 *
 * Refresh-on-expiry happens in `src/middleware.ts` before RSC renders;
 * `serverFetch` itself is read-only because Next.js forbids cookie
 * mutation during Server Component render. On 401 mid-render (e.g.
 * token revoked between middleware and Spring), it throws
 * `SessionExpiredError` and the caller redirects to
 * `/api/auth/end-session`, which clears cookies and routes to /login.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export const ACCESS_COOKIE = 'genesis_access_token';
export const REFRESH_COOKIE = 'genesis_refresh_token';

const REFRESH_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function baseCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
  };
}

export async function setSessionCookies(tokens: TokenResponse) {
  const jar = await cookies();
  const opts = baseCookieOptions();
  jar.set(ACCESS_COOKIE, tokens.accessToken, { ...opts, maxAge: tokens.expiresIn });
  jar.set(REFRESH_COOKIE, tokens.refreshToken, { ...opts, maxAge: REFRESH_MAX_AGE_SECONDS });
}

export async function clearSessionCookies() {
  const jar = await cookies();
  jar.delete(ACCESS_COOKIE);
  jar.delete(REFRESH_COOKIE);
}

/**
 * Server-side authenticated fetch to Spring. Read-only with respect to
 * cookies — RSC render must not mutate them, and middleware has already
 * refreshed before this runs on protected routes.
 *
 * Throws:
 * - `SessionExpiredError` when the access cookie is missing (middleware
 *   either refreshed and forwarded, or redirected — reaching here with
 *   no cookie means we're in a non-protected route or middleware was
 *   bypassed) or when Spring responds 401 (token revoked since
 *   middleware ran).
 * - `NetworkError` when the request never reaches Spring (DNS/TCP).
 * - Plain `Error` carrying the server's message on other non-2xx.
 *
 * Callers should redirect to `/api/auth/end-session` on
 * `SessionExpiredError` — that route clears cookies (which middleware
 * cannot do once the cookies were considered valid at request entry)
 * and bounces to /login, avoiding the revoked-token loop where /login
 * would otherwise see the stale cookies and redirect back to /home.
 */
export async function serverFetch<T>(endpoint: string, init?: RequestInit): Promise<T> {
  const jar = await cookies();
  const accessToken = jar.get(ACCESS_COOKIE)?.value;
  if (!accessToken) {
    throw new SessionExpiredError();
  }

  const headers = new Headers(init?.headers);
  headers.set('Authorization', `Bearer ${accessToken}`);
  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, { ...init, headers });
  } catch (cause) {
    throw new NetworkError(`${API_BASE_URL}${endpoint}`, cause);
  }

  if (response.status === 401) {
    throw new SessionExpiredError();
  }

  if (response.status === 204) {
    return undefined as T;
  }

  if (!response.ok) {
    const err = await response
      .json()
      .catch(() => ({ message: `Request to ${endpoint} failed with status ${response.status}` }));
    throw new Error(err.message ?? `Request to ${endpoint} failed with status ${response.status}`);
  }

  return response.json();
}
