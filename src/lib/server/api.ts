import 'server-only';

import { cookies } from 'next/headers';
import { ApiResponse, TokenResponse } from '@/lib/api';
import { NetworkError, SessionExpiredError } from '@/lib/errors';

/**
 * Server-only Spring API client. Reads the access token from HttpOnly
 * cookies, sends it as a Bearer header, and transparently refreshes on
 * 401 via the refresh cookie. Used by Server Actions and Server
 * Components — never imported by client code (the `server-only` marker
 * fails the build if a client file tries).
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
 * Server-side authenticated fetch to Spring.
 *
 * Behaviour:
 * - Throws `SessionExpiredError` when there's no access cookie, when the
 *   refresh cookie is missing/invalid, or when refresh itself returns
 *   non-2xx. Cookies are cleared in those terminal cases.
 * - Throws `NetworkError` when the request never reaches the server
 *   (DNS/TCP/CORS preflight). Cookies are kept — backend blip, not auth.
 * - Throws a plain `Error` carrying the server's message on 4xx/5xx.
 *
 * Callers are typically server components or actions that should
 * `redirect('/login')` on `SessionExpiredError`; middleware already
 * blocks unauthenticated navigation, so reaching this code with no
 * session means the tokens expired mid-request.
 */
export async function serverFetch<T>(endpoint: string, init?: RequestInit): Promise<T> {
  const jar = await cookies();
  let accessToken = jar.get(ACCESS_COOKIE)?.value;
  if (!accessToken) {
    throw new SessionExpiredError();
  }

  const doFetch = async (token: string): Promise<Response> => {
    const headers = new Headers(init?.headers);
    headers.set('Authorization', `Bearer ${token}`);
    if (init?.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    try {
      return await fetch(`${API_BASE_URL}${endpoint}`, { ...init, headers });
    } catch (cause) {
      throw new NetworkError(`${API_BASE_URL}${endpoint}`, cause);
    }
  };

  let response = await doFetch(accessToken);

  if (response.status === 401) {
    const refreshToken = jar.get(REFRESH_COOKIE)?.value;
    if (!refreshToken) {
      await clearSessionCookies();
      throw new SessionExpiredError();
    }

    let refreshResponse: Response;
    try {
      refreshResponse = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
    } catch (cause) {
      throw new NetworkError(`${API_BASE_URL}/api/auth/refresh`, cause);
    }

    if (!refreshResponse.ok) {
      await clearSessionCookies();
      throw new SessionExpiredError();
    }

    const refreshed: ApiResponse<TokenResponse> = await refreshResponse.json();
    await setSessionCookies(refreshed.data);
    accessToken = refreshed.data.accessToken;
    response = await doFetch(accessToken);
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
