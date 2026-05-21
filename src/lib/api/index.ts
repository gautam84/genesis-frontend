/**
 * API client for Genesis backend.
 * Re-export barrel — domains live in sibling files. Existing
 * `import { foo } from '@/lib/api'` keeps working unchanged because
 * Node module resolution finds this directory's index.
 */

import { authApi } from './auth';

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

export default authApi;
