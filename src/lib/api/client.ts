/**
 * Shared infrastructure for the per-domain api modules.
 * Hosts the base URL, token storage, fetch wrapper, refresh logic,
 * and shared response types. Re-exports the error classes from
 * `@/lib/errors` so callers can keep importing them from `@/lib/api`.
 */

import { NetworkError, SessionExpiredError } from '../errors';
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

// Token storage keys
const ACCESS_TOKEN_KEY = 'genesis_access_token';
const REFRESH_TOKEN_KEY = 'genesis_refresh_token';

// Token management functions
export const tokenStorage = {
    getAccessToken: (): string | null => {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem(ACCESS_TOKEN_KEY);
    },

    getRefreshToken: (): string | null => {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem(REFRESH_TOKEN_KEY);
    },

    setTokens: (accessToken: string, refreshToken: string): void => {
        if (typeof window === 'undefined') return;
        localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    },

    clearTokens: (): void => {
        if (typeof window === 'undefined') return;
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
    },

    hasTokens: (): boolean => {
        return !!tokenStorage.getAccessToken();
    },
};

// Base fetch wrapper with auth headers
export async function fetchWithAuth<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const accessToken = tokenStorage.getAccessToken();

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (accessToken) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${accessToken}`;
    }

    const doFetch = async (h: HeadersInit) =>
        fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers: h });

    let response: Response;
    try {
        response = await doFetch(headers);
    } catch (networkError: unknown) {
        // fetch() rejected at network level — server unreachable, DNS, CORS
        // preflight, or backend mid-restart. NOT an auth failure.
        throw new NetworkError(`${API_BASE_URL}${endpoint}`, networkError);
    }

    // Handle 401 - try to refresh token
    if (response.status === 401 && tokenStorage.getRefreshToken()) {
        const refreshed = await tryRefreshToken();
        if (refreshed) {
            // Retry the original request with new token
            const newAccessToken = tokenStorage.getAccessToken();
            (headers as Record<string, string>)['Authorization'] = `Bearer ${newAccessToken}`;
            let retryResponse: Response;
            try {
                retryResponse = await doFetch(headers);
            } catch (networkError: unknown) {
                throw new NetworkError(`${API_BASE_URL}${endpoint}`, networkError);
            }
            if (!retryResponse.ok) {
                const error = await retryResponse.json();
                throw new Error(error.message || 'Request failed');
            }
            return retryResponse.json();
        } else {
            // Refresh failed — refresh token genuinely invalid. Clear and signal.
            tokenStorage.clearTokens();
            throw new SessionExpiredError();
        }
    }

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: `Request to ${endpoint} failed with status ${response.status}` }));

        if (error.fieldErrors) {
            const fieldErrorMessages = Object.entries(error.fieldErrors)
                .map(([field, msgs]) => `${field}: ${(msgs as string[]).join(', ')}`)
                .join('; ');
            throw new Error(`${error.message || 'Validation failed'}: ${fieldErrorMessages}`);
        }

        throw new Error(error.message || `Request to ${endpoint} failed with status ${response.status}`);
    }

    // Handle 204 No Content responses (e.g., DELETE operations)
    if (response.status === 204) {
        return undefined as T;
    }

    return response.json();
}

// Try to refresh the access token. Throws NetworkError if the refresh endpoint
// is unreachable, so callers don't mistake a backend blip for an invalid refresh
// token and prematurely clear the session.
async function tryRefreshToken(): Promise<boolean> {
    const refreshToken = tokenStorage.getRefreshToken();
    if (!refreshToken) return false;

    let response: Response;
    try {
        response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
        });
    } catch (networkError: unknown) {
        throw new NetworkError(`${API_BASE_URL}/api/auth/refresh`, networkError);
    }

    if (!response.ok) return false;

    const result: ApiResponse<{ accessToken: string; refreshToken: string; tokenType: string; expiresIn: number }> = await response.json();
    tokenStorage.setTokens(result.data.accessToken, result.data.refreshToken);
    return true;
}
