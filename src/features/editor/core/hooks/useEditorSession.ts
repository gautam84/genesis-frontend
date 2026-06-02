'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { WorkspaceEditorResponse } from '@/lib/api';
import { saveEditorSessionAction } from '@/features/editor/core/editor.actions';

interface UseEditorSessionParams {
  workspaceId: string;
  currentDocIndex: number;
  editorData: WorkspaceEditorResponse | null;
  loading: boolean;
}

/**
 * Owns the editor's session-save lifecycle:
 * - Persists last document index + scroll position to the backend.
 * - Fires on unmount and on a 1s scroll-stop debounce.
 *
 * The unmount save is read via a ref so `saveSession`'s identity changing
 * (its deps include state that updates frequently) doesn't refire the
 * cleanup on every render — see P0.1.
 *
 * The caller owns `editorData`, `loading`, and `currentDocIndex` because
 * those flow into editor-specific state and document loading logic.
 */
export function useEditorSession({
  workspaceId,
  currentDocIndex,
  editorData,
  loading,
}: UseEditorSessionParams) {
  const [isSaving, setIsSaving] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const lastScrollRef = useRef(0);

  const saveSession = useCallback(async () => {
    if (!workspaceId || isSaving || loading || !editorData) return;
    try {
      setIsSaving(true);
      const scrollPos = containerRef.current
        ? containerRef.current.scrollTop
        : lastScrollRef.current;
      if (containerRef.current) lastScrollRef.current = scrollPos;

      await saveEditorSessionAction({
        workspaceId,
        lastDocumentIndex: currentDocIndex,
        scrollPosition: scrollPos,
      });
    } catch {
      // Session save is best-effort — failures shouldn't break annotation flow.
    } finally {
      setIsSaving(false);
    }
  }, [workspaceId, currentDocIndex, isSaving, editorData, loading]);

  // Save on unmount only — read latest saveSession via ref so deps changes
  // don't fire the cleanup repeatedly.
  const saveSessionRef = useRef(saveSession);
  useEffect(() => {
    saveSessionRef.current = saveSession;
  });
  useEffect(() => {
    return () => {
      saveSessionRef.current();
    };
  }, []);

  // Debounced scroll save (fires 1s after scroll stops).
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      lastScrollRef.current = e.currentTarget.scrollTop;
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        saveSession();
      }, 1000);
    },
    [saveSession],
  );

  return {
    isSaving,
    saveSession,
    containerRef,
    lastScrollRef,
    handleScroll,
  };
}
