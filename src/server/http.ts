import 'server-only';

import { cookies } from 'next/headers';
import { TokenResponse } from '@/features/auth/auth.contracts';
import { NetworkError, SessionExpiredError } from '@/server/errors';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  REFRESH_MAX_AGE_SECONDS,
  cookieOptions,
} from '@/server/cookies';
import { SERVER_API_BASE_URL } from '@/config/env';

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

// Re-exported so callers (e.g. the export/end-session route handlers) can read
// cookie names without a separate import from `@/server/cookies`.
export { ACCESS_COOKIE, REFRESH_COOKIE };

export async function setSessionCookies(tokens: TokenResponse) {
  const jar = await cookies();
  jar.set(ACCESS_COOKIE, tokens.accessToken, cookieOptions(tokens.expiresIn));
  jar.set(REFRESH_COOKIE, tokens.refreshToken, cookieOptions(REFRESH_MAX_AGE_SECONDS));
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
  // Default JSON only for string bodies — FormData / Blob / ReadableStream
  // need fetch to set Content-Type itself (multipart boundary, etc).
  if (typeof init?.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(`${SERVER_API_BASE_URL}${endpoint}`, { ...init, headers });
  } catch (cause) {
    throw new NetworkError(`${SERVER_API_BASE_URL}${endpoint}`, cause);
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
