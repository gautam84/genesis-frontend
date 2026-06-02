'use client';

import type { ReactNode } from 'react';
import { Separator } from '@/components/ui/separator';

export interface HelpStep {
  /** Short badge shown in the leading circle, e.g. "1", "2", "ESC". */
  badge: string;
  body: ReactNode;
}

export interface HelpShortcut {
  /** Keys rendered as <kbd> chips, e.g. ['⌘/Ctrl', '↵']. */
  keys: string[];
  label: string;
}

interface EditorHelpPanelProps {
  steps: HelpStep[];
  shortcuts: HelpShortcut[];
  /** Accent color for the numbered step circles. */
  accent?: 'indigo' | 'blue';
}

const ACCENT_CLASSES: Record<NonNullable<EditorHelpPanelProps['accent']>, string> = {
  indigo: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600',
  blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600',
};

/**
 * Shared right-pane help for the annotation editors: a collapsible "How to
 * Annotate" step list (closed by default) followed by a data-driven keyboard
 * shortcuts table. Extracted from the near-identical markup in coref/ner/pos.
 */
export function EditorHelpPanel({ steps, shortcuts, accent = 'indigo' }: EditorHelpPanelProps) {
  const badgeClass = ACCENT_CLASSES[accent];

  return (
    <details className="border-b border-slate-200 dark:border-slate-800">
      <summary className="cursor-pointer select-none p-4 text-lg font-bold text-slate-900 dark:text-white">
        How to Annotate
      </summary>
      <div className="px-4 pb-4">
        <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
          {steps.map((step, idx) => (
            <div key={idx} className="flex gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${badgeClass}`}>
                <span className="text-xs font-bold">{step.badge}</span>
              </div>
              <p>{step.body}</p>
            </div>
          ))}
        </div>

        <Separator className="my-4" />

        <h3 className="font-bold text-slate-900 dark:text-white mb-3">Keyboard Shortcuts</h3>
        <div className="space-y-2 text-sm">
          {shortcuts.map((s) => (
            <div key={s.label} className="flex items-center justify-between gap-3">
              <span className="text-slate-600 dark:text-slate-400">{s.label}</span>
              <span className="flex items-center gap-1 flex-shrink-0">
                {s.keys.map((k) => (
                  <kbd
                    key={k}
                    className="rounded border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-xs font-mono text-slate-700 dark:text-slate-300"
                  >
                    {k}
                  </kbd>
                ))}
              </span>
            </div>
          ))}
        </div>
      </div>
    </details>
  );
}
