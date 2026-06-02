'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import type { EditorDocumentInfo } from '@/features/editor/core/editor.contracts';

interface DocumentSwitcherProps {
  documents: EditorDocumentInfo[];
  currentDocIndex: number;
  onSelect: (index: number) => void;
}

/**
 * Shared document navigator for the annotation editors: a scrollable strip of
 * document buttons (each with a status dot — green once COMPLETE), prev/next
 * arrows when there is more than one document, and a "Doc X/Y · N complete"
 * counter. The active document is kept scrolled into view.
 *
 * Extracted from the byte-identical blocks previously inlined in coref/ner/pos.
 */
export function DocumentSwitcher({ documents, currentDocIndex, onSelect }: DocumentSwitcherProps) {
  // Keep the active document button visible in the scrollable strip.
  useEffect(() => {
    document
      .querySelector('[data-doc-active="true"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [currentDocIndex]);

  if (documents.length === 0) return null;

  const completeCount = documents.filter(d => d.status === 'COMPLETE').length;
  const multiple = documents.length > 1;

  return (
    <div className="flex items-center gap-2 mb-4">
      {multiple && (
        <Button
          variant="outline"
          size="sm"
          className="px-2 flex-shrink-0"
          disabled={currentDocIndex <= 0}
          onClick={() => onSelect(currentDocIndex - 1)}
          title="Previous document ( [ )"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Button>
      )}

      <div className="flex gap-2 overflow-x-auto py-1 flex-1">
        {documents.map((doc, idx) => {
          const isComplete = doc.status === 'COMPLETE';
          const isActive = currentDocIndex === idx;
          return (
            <Button
              key={doc.id}
              data-doc-active={isActive}
              variant={isActive ? 'default' : 'outline'}
              size="sm"
              className="flex-shrink-0 gap-1.5"
              onClick={() => onSelect(idx)}
              title={isComplete ? `${doc.name} — complete` : doc.name}
            >
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  isComplete
                    ? 'bg-green-500'
                    : isActive
                      ? 'bg-white/70'
                      : 'bg-slate-300 dark:bg-slate-600'
                }`}
              />
              {doc.name}
            </Button>
          );
        })}
      </div>

      {multiple && (
        <Button
          variant="outline"
          size="sm"
          className="px-2 flex-shrink-0"
          disabled={currentDocIndex >= documents.length - 1}
          onClick={() => onSelect(currentDocIndex + 1)}
          title="Next document ( ] )"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Button>
      )}

      <span className="text-xs text-slate-500 dark:text-slate-400 flex-shrink-0 whitespace-nowrap ml-1">
        Doc {currentDocIndex + 1}/{documents.length}
        {' · '}
        {completeCount} complete
      </span>
    </div>
  );
}
