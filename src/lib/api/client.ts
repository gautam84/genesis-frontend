/**
 * Shared types for the per-domain api modules. All runtime auth + fetch
 * helpers (tokenStorage, fetchWithAuth, tryRefreshToken) have been
 * removed — data fetching flows through server actions / route handlers
 * that read the HttpOnly cookie via `@/lib/server/api`.
 */

export { NetworkError, SessionExpiredError } from '@/server/errors';

// `ApiResponse<T>` / `CursorPage<T>` moved to `@/server/contracts/common`.
// Re-exported here so the `@/lib/api` barrel surface is unchanged until the
// Phase 8 cleanup sweep rewrites importers.
export type { ApiResponse, CursorPage } from '@/server/contracts/common';

if (!process.env.NEXT_PUBLIC_API_URL && process.env.NODE_ENV === 'production') {
    throw new Error('NEXT_PUBLIC_API_URL must be set in production builds');
}

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export interface ApiError {
    success: boolean;
    message: string;
    fieldErrors?: Record<string, string[]>;
}
