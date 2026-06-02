/**
 * Shared editor constants, centralized out of the individual editor files.
 * Editors consume these in Phase 5 of the architecture migration.
 */

/** Sentences/tokens fetched per page of document content across all editors. */
export const EDITOR_PAGE_SIZE = 50;

/** Color cycle for coreference clusters (indexed by cluster count). */
export const CLUSTER_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16',
];

/** Fallback palette for workspace-defined (custom) NER / POS tags. */
export const CUSTOM_TAG_PALETTE = [
  '#0ea5e9', '#22c55e', '#f97316', '#a855f7', '#eab308',
  '#ec4899', '#14b8a6', '#f43f5e', '#6366f1', '#84cc16',
];
