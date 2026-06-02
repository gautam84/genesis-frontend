/**
 * Barrel for shared API types. After the cookie-auth migration the
 * per-domain files only export TypeScript shapes (request/response
 * interfaces, enums, label constants). Runtime data fetching lives in
 * `@/lib/server/*` and `@/lib/actions/*`.
 */

export * from './client';
export * from '@/features/auth/auth.contracts';
export * from '@/features/workspace/workspace.contracts';
export * from '@/features/document/document.contracts';
export * from '@/features/editor/core/tokenization.contracts';
export * from '@/features/editor/core/editor.contracts';
export * from '@/features/editor/coref/coref.contracts';
export * from '@/features/editor/pos/pos.contracts';
export * from '@/features/editor/wsd/wsd.contracts';
export * from '@/features/editor/ner/ner.contracts';
export * from '@/features/workspace/export.contracts';
export * from '@/features/recommendations/recommendations.contracts';
export * from '@/features/notifications/notifications.contracts';
