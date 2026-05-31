import type { PaginatedDocument } from '@/hooks/usePaginatedDocument';

type EditorLoadMoreProps = Pick<
  PaginatedDocument,
  'hasMore' | 'loadingMore' | 'totalPages' | 'setSentinelEl'
>;

/**
 * Footer for the infinite-scroll editors: a sentinel that triggers loading the
 * next page while pages remain, and an "End of document" marker once they don't.
 * Designed to be spread directly from `usePaginatedDocument`: `<EditorLoadMore {...pagination} />`.
 */
export function EditorLoadMore({
  hasMore,
  loadingMore,
  totalPages,
  setSentinelEl,
}: EditorLoadMoreProps) {
  if (hasMore) {
    return (
      <div
        ref={setSentinelEl}
        className="h-12 flex items-center justify-center text-xs text-slate-400"
      >
        {loadingMore ? 'Loading more...' : 'Scroll to load more'}
      </div>
    );
  }
  if (totalPages > 1) {
    return (
      <div className="h-8 flex items-center justify-center text-xs text-slate-400">
        End of document
      </div>
    );
  }
  return null;
}
