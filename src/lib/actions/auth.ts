'use server';

import { cookies } from 'next/headers';
import type {
  ApiResponse,
  LoginRequest,
  SignupRequest,
  TokenResponse,
  UserResponse,
} from '@/lib/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// Same names as localStorage keys so the migration path is greppable.
// HttpOnly cookies are the new source of truth; the localStorage copy is
// kept in sync only because the existing client-side fetchWithAuth still
// reads Bearer tokens from there. Future PR rips out localStorage.
const ACCESS_COOKIE = 'genesis_access_token';
const REFRESH_COOKIE = 'genesis_refresh_token';

const REFRESH_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function baseCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
  };
}

async function setSessionCookies(tokens: TokenResponse) {
  const jar = await cookies();
  const opts = baseCookieOptions();
  jar.set(ACCESS_COOKIE, tokens.accessToken, { ...opts, maxAge: tokens.expiresIn });
  jar.set(REFRESH_COOKIE, tokens.refreshToken, { ...opts, maxAge: REFRESH_MAX_AGE_SECONDS });
}

async function clearSessionCookies() {
  const jar = await cookies();
  jar.delete(ACCESS_COOKIE);
  jar.delete(REFRESH_COOKIE);
}

export async function loginAction(
  request: LoginRequest,
): Promise<ActionResult<TokenResponse>> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
  } catch {
    return { ok: false, error: `Cannot reach server at ${API_BASE_URL}` };
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Login failed' }));
    return { ok: false, error: error.message || 'Invalid credentials' };
  }

  const result: ApiResponse<TokenResponse> = await response.json();
  await setSessionCookies(result.data);
  return { ok: true, data: result.data };
}

export async function signupAction(
  request: SignupRequest,
): Promise<ActionResult<UserResponse>> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
  } catch {
    return { ok: false, error: `Cannot reach server at ${API_BASE_URL}` };
  }

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: 'Signup failed' }));
    if (error.fieldErrors) {
      const fieldErrorMessages = Object.entries(error.fieldErrors)
        .map(([field, msgs]) => `${field}: ${(msgs as string[]).join(', ')}`)
        .join('; ');
      return {
        ok: false,
        error: `${error.message || 'Validation failed'}: ${fieldErrorMessages}`,
      };
    }
    return { ok: false, error: error.message || 'Signup failed' };
  }

  const result: ApiResponse<UserResponse> = await response.json();
  return { ok: true, data: result.data };
}

/**
 * Read the session from the HttpOnly access cookie. Source of truth for
 * "is the user logged in?" on the client — the cookie is, not localStorage.
 *
 * Returns `{ ok: true, data: null }` for "definitely logged out" so
 * AuthContext can clear stale localStorage in lock-step with the cookie
 * state. Returns `{ ok: false }` only on transient network failure so the
 * caller can keep the current session optimistically.
 */
export async function getSessionAction(): Promise<ActionResult<UserResponse | null>> {
  const jar = await cookies();
  const accessToken = jar.get(ACCESS_COOKIE)?.value;
  if (!accessToken) {
    return { ok: true, data: null };
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch {
    return { ok: false, error: `Cannot reach server at ${API_BASE_URL}` };
  }

  if (response.status === 401) {
    // Access expired; try refresh.
    const refreshToken = jar.get(REFRESH_COOKIE)?.value;
    if (!refreshToken) {
      await clearSessionCookies();
      return { ok: true, data: null };
    }
    let refreshResponse: Response;
    try {
      refreshResponse = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      return { ok: false, error: `Cannot reach server at ${API_BASE_URL}` };
    }
    if (!refreshResponse.ok) {
      await clearSessionCookies();
      return { ok: true, data: null };
    }
    const refreshed: ApiResponse<TokenResponse> = await refreshResponse.json();
    await setSessionCookies(refreshed.data);
    // Retry /me with the new access token
    try {
      response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${refreshed.data.accessToken}` },
      });
    } catch {
      return { ok: false, error: `Cannot reach server at ${API_BASE_URL}` };
    }
  }

  if (!response.ok) {
    await clearSessionCookies();
    return { ok: true, data: null };
  }

  const result: ApiResponse<UserResponse> = await response.json();
  return { ok: true, data: result.data };
}

export async function logoutAction(): Promise<{ ok: true }> {
  const jar = await cookies();
  const refreshToken = jar.get(REFRESH_COOKIE)?.value;

  if (refreshToken) {
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // Best-effort. The cookies are cleared regardless so the client is
      // logged out locally even if the backend revoke call fails.
    }
  }

  await clearSessionCookies();
  return { ok: true };
}
