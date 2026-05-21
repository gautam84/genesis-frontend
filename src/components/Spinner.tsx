import { cn } from '@/lib/utils';

/**
 * Inline spinning SVG. Sized 8×8 by default; pass className to override
 * (e.g. `className="h-5 w-5"` inside a button).
 */
export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn('animate-spin h-8 w-8 text-[var(--primary)]', className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

/**
 * Full-viewport centred loader on the standard app gradient.
 * Used by route-level `loading.tsx` files and by long-running client-side
 * loads that take over the page.
 */
export function FullScreenLoader({ label }: { label?: string }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <Spinner />
        {label && (
          <span className="text-lg text-slate-600 dark:text-slate-400">{label}</span>
        )}
      </div>
    </div>
  );
}
