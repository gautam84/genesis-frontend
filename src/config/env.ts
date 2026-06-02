/**
 * Validated, Edge-safe environment access.
 *
 * Imported by `src/middleware.ts` (Edge runtime), `src/server/http.ts`, and
 * client code. It must therefore NOT import `server-only` or `next/headers`.
 * `NEXT_PUBLIC_*` vars are inlined at build time, so this resolves on the
 * server, the Edge, and the client alike.
 */

if (!process.env.NEXT_PUBLIC_API_URL && process.env.NODE_ENV === 'production') {
    throw new Error('NEXT_PUBLIC_API_URL must be set in production builds');
}

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
