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

// `API_BASE_URL` + its prod-required validation moved to `@/config/env`.
// Re-exported so the `@/lib/api` barrel surface is unchanged until Phase 8.
export { API_BASE_URL } from '@/config/env';

export interface ApiError {
    success: boolean;
    message: string;
    fieldErrors?: Record<string, string[]>;
}
