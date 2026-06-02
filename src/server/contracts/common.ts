/**
 * Cross-cutting contracts shared across every feature's data tier.
 *
 * - `ApiResponse<T>` — the envelope Spring wraps every payload in.
 * - `CursorPage<T>` — keyset pagination payload (carried as `data`).
 * - `ActionResult<T>` — the single canonical return type for `'use server'`
 *   actions. Previously duplicated verbatim in all ten action files.
 */

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
