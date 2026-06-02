import { CUSTOM_TAG_PALETTE } from '@/lib/constants';
import type {
  EditorDocumentInfo,
  EditorSessionResponse,
  WorkspaceEditorResponse,
} from './editor.contracts';

/**
 * Assemble the `WorkspaceEditorResponse` view model every editor builds on mount
 * from the loaded documents + session. Identical across COREF/NER/POS/WSD apart
 * from `annotationType`.
 */
export function buildEditorData(
  workspaceId: string,
  workspaceName: string,
  annotationType: string,
  documents: EditorDocumentInfo[],
  session: EditorSessionResponse | null,
): WorkspaceEditorResponse {
  return {
    workspaceId,
    workspaceName,
    annotationType,
    documents,
    session,
    totalDocuments: documents.length,
    totalTokens: documents.reduce((sum, d) => sum + (d.tokenCount || 0), 0),
    totalSentences: documents.reduce((sum, d) => sum + (d.sentenceCount || 0), 0),
  };
}

/** Group a flat annotation list by `tokenId`. Shared by the POS and WSD editors. */
export function groupAnnotationsByToken<T extends { tokenId: string }>(
  annotations: T[],
): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const a of annotations) {
    if (!out[a.tokenId]) out[a.tokenId] = [];
    out[a.tokenId].push(a);
  }
  return out;
}

/** Minimal shape shared by the NER/POS tag tables (`NerTag` / `PosTag`). */
interface WorkspaceTag {
  tag: string;
  label: string;
  description: string;
  color: string;
  builtin?: boolean;
  definitionId?: string | null;
  scope?: 'GLOBAL' | 'WORKSPACE';
}

/** Minimal shape shared by backend tag definitions (`NerTagDefinition` / `PosTagDefinition`). */
interface WorkspaceTagDefinition {
  id: string | null;
  tag: string;
  description: string | null;
  scope: 'GLOBAL' | 'WORKSPACE';
  builtin: boolean;
}

/**
 * Merge the built-in (universal) tag table with workspace-defined custom tags
 * into one palette-colored list. Built-ins come first (flagged `builtin: true`);
 * custom definitions that don't shadow a built-in are appended with a cycling
 * palette color. Identical algorithm for NER and POS — only the tag shapes and
 * universal table differ, so it's generic over both.
 *
 * The two `as TTag` casts cover TypeScript's inability to prove a spread/literal
 * of the shared base is the concrete `TTag`; the produced objects carry exactly
 * the `WorkspaceTag` fields, which both `NerTag` and `PosTag` satisfy.
 */
export function mergeTagDefinitions<
  TTag extends WorkspaceTag,
  TDef extends WorkspaceTagDefinition,
>(universalTags: readonly TTag[], defs: TDef[]): TTag[] {
  const builtinByTag = new Map(universalTags.map(t => [t.tag, t]));
  const merged: TTag[] = universalTags.map(t => ({ ...t, builtin: true }) as TTag);
  let customIdx = 0;
  for (const d of defs) {
    if (d.builtin || builtinByTag.has(d.tag)) continue;
    merged.push({
      tag: d.tag,
      label: d.tag,
      description: d.description ?? '',
      color: CUSTOM_TAG_PALETTE[customIdx++ % CUSTOM_TAG_PALETTE.length],
      builtin: false,
      definitionId: d.id,
      scope: d.scope,
    } as TTag);
  }
  return merged;
}
