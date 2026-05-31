'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { DocumentContentResponse } from '@/lib/api';
import { getDocumentContentAction } from '@/lib/actions/editor';

/** Sentences/tokens fetched per page of document content across all editors. */
export const EDITOR_PAGE_SIZE = 50;

interface UsePaginatedDocumentArgs {
  workspaceId: string;
  documentContent: DocumentContentResponse | null;
  setDocumentContent: Dispatch<SetStateAction<DocumentContentResponse | null>>;
  /**
   * Scroll container used as the IntersectionObserver root. Pass the editor's
   * scroll ref (e.g. `useEditorSession().containerRef`); defaults to the viewport.
   */
  scrollRootRef?: Readonly<{ current: HTMLElement | null }>;
}

export interface PaginatedDocument {
  /** Ref callback for the sentinel element rendered at the end of the content. */
  setSentinelEl: (el: HTMLDivElement | null) => void;
  /** True while the next page is being fetched. */
  loadingMore: boolean;
  /** True when more pages remain to be loaded. */
  hasMore: boolean;
  /** Total number of pages in the current document. */
  totalPages: number;
}

/**
 * Infinite-scroll pagination for a document's content. Watches a sentinel element
 * and, as it scrolls into view, fetches the next page and appends its sentences
 * and tokens onto the current `documentContent`.
 *
 * The editor loads page 0 itself (passing `EDITOR_PAGE_SIZE`); this hook owns
 * loading every page after that. Extracted from the coref editor so pos/ner/wsd
 * share the exact same behaviour.
 */
export function usePaginatedDocument({
  workspaceId,
  documentContent,
  setDocumentContent,
  scrollRootRef,
}: UsePaginatedDocumentArgs): PaginatedDocument {
  // Sentinel kept in state (not a ref) so the observer effect re-runs when the
  // sentinel actually mounts — a ref-only dep wouldn't trigger the effect.
  const [sentinelEl, setSentinelEl] = useState<HTMLDivElement | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false); // Guards re-entry into loadNextPage

  const currentPage = documentContent?.currentPage ?? 0;
  const totalPages = documentContent?.totalPages ?? 1;
  const hasMore = currentPage + 1 < totalPages;

  const loadNextPage = useCallback(async () => {
    if (loadingMoreRef.current || !documentContent) return;
    const cur = documentContent.currentPage ?? 0;
    const total = documentContent.totalPages ?? 1;
    if (cur + 1 >= total) return; // No more pages

    loadingMoreRef.current = true;
    setLoadingMore(true);
    const nextResult = await getDocumentContentAction(
      workspaceId,
      documentContent.documentId,
      cur + 1,
      documentContent.pageSize ?? EDITOR_PAGE_SIZE,
    );
    if (nextResult.ok) {
      const nextData = nextResult.data;
      setDocumentContent(prev => {
        if (!prev) return nextData;
        if (prev.documentId !== nextData.documentId) return prev; // Doc switched mid-flight
        return {
          ...prev,
          sentences: [...prev.sentences, ...nextData.sentences],
          tokens: [...prev.tokens, ...nextData.tokens],
          currentPage: nextData.currentPage,
          totalPages: nextData.totalPages,
          pageSize: nextData.pageSize,
        };
      });
    } else {
      console.warn('Failed to load next page:', nextResult.error);
    }
    loadingMoreRef.current = false;
    setLoadingMore(false);
  }, [documentContent, workspaceId, setDocumentContent]);

  // Observe the sentinel; load the next page when it enters the viewport. Depends
  // on `hasMore`/`loadNextPage` (both change as content loads) so the observer is
  // rebuilt after each page and stops observing once the last page is reached.
  useEffect(() => {
    if (!sentinelEl || !hasMore) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting)) loadNextPage();
      },
      { root: scrollRootRef?.current ?? null, rootMargin: '200px', threshold: 0 },
    );
    observer.observe(sentinelEl);
    return () => observer.disconnect();
  }, [sentinelEl, hasMore, loadNextPage, scrollRootRef]);

  return { setSentinelEl, loadingMore, hasMore, totalPages };
}
