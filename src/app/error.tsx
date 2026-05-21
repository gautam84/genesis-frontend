'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

/**
 * Root-level error boundary. Catches uncaught errors in any route below
 * `app/` and surfaces a recovery action. Logs to console for now; once
 * P3.2 adds toast UI we can also notify there.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6">
      <div className="max-w-md w-full text-center space-y-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Something went wrong</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 break-words">
          {error.message || 'An unexpected error occurred.'}
        </p>
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
