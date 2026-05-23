/**
 * Shared types for the per-domain api modules. All runtime auth + fetch
 * helpers (tokenStorage, fetchWithAuth, tryRefreshToken) have been
 * removed — data fetching flows through server actions / route handlers
 * that read the HttpOnly cookie via `@/lib/server/api`.
 */

export { NetworkError, SessionExpiredError } from '../errors';

if (!process.env.NEXT_PUBLIC_API_URL && process.env.NODE_ENV === 'production') {
    throw new Error('NEXT_PUBLIC_API_URL must be set in production builds');
}

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
    timestamp?: string;
}

export interface ApiError {
    success: boolean;
    message: string;
    fieldErrors?: Record<string, string[]>;
}
