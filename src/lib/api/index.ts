/**
 * Barrel for shared API types. After the cookie-auth migration the
 * per-domain files only export TypeScript shapes (request/response
 * interfaces, enums, label constants). Runtime data fetching lives in
 * `@/lib/server/*` and `@/lib/actions/*`.
 */

export * from './client';
export * from './auth';
export * from './workspace';
export * from './document';
export * from './tokenization';
export * from './editor';
export * from './coref';
export * from './pos';
export * from './wsd';
export * from './ner';
export * from './import-export';
export * from './recommendations';
export * from './notifications';
