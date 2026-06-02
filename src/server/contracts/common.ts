/**
 * Cross-cutting contracts shared across every feature's data tier.
 *
 * - `ApiResponse<T>` — the envelope Spring wraps every payload in.
 * - `CursorPage<T>` — keyset pagination payload (carried as `data`).
 * - `ActionResult<T>` — the single canonical return type for `'use server'`
 *   actions. Previously duplicated verbatim in all ten action files.
 */

import { SessionExpiredError } from '@/server/errors';

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
    timestamp?: string;
}

/**
 * Keyset (cursor) pagination payload, carried as the `data` of an
 * {@link ApiResponse} by high-volume list endpoints (mentions, clusters).
 * Fetch the next page by sending `nextCursor` back as the `cursor` query
 * param; `hasMore === false` (and `nextCursor === null`) ends the traversal.
 *
 * TODO(arch): the target blueprint names this `Page<T>`. Renaming touches ~8
 * sites for zero behavioral gain — deferred to a separate follow-up PR.
 */
export interface CursorPage<T> {
    items: T[];
    nextCursor: string | null;
    pageSize: number;
    hasMore: boolean;
}

export type ActionResult<T> =
    | { ok: true; data: T }
    | { ok: false; error: string };

/**
 * Maps a thrown error to the failed `ActionResult` branch. Special-cases
 * `SessionExpiredError` to a stable message; otherwise surfaces the error's
 * message, falling back to `fallback`. Shared by every feature's actions.
 */
export function toActionError(err: unknown, fallback: string): { ok: false; error: string } {
    if (err instanceof SessionExpiredError) {
        return { ok: false, error: 'Session expired. Please log in again.' };
    }
    return { ok: false, error: err instanceof Error ? err.message : fallback };
}
