/**
 * Session cookie names and option builder for the hand-rolled auth layer.
 *
 * Edge-safe by contract: this module is imported by BOTH `src/middleware.ts`
 * (which runs on the Edge runtime) AND `src/server/http.ts`. It must therefore
 * NOT import `server-only` or `next/headers` — keep it to pure constants and
 * plain functions.
 */

export const ACCESS_COOKIE = 'genesis_access_token';
export const REFRESH_COOKIE = 'genesis_refresh_token';

/** Refresh token TTL — 30 days. Access TTL comes from Spring (`expiresIn`). */
export const REFRESH_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}
