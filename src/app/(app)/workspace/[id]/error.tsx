'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

/**
 * Scoped error boundary for the workspace subtree. Catches render-time
 * failures in `/workspace/[id]/*` (including editors) without bringing
 * down the whole app.
 */
export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error('Workspace error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6">
      <div className="max-w-md w-full text-center space-y-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Workspace failed to load</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 break-words">
          {error.message || 'Something went wrong while loading this workspace.'}
        </p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={() => router.push('/home')}>Back to Home</Button>
          <Button onClick={reset}>Try again</Button>
        </div>
      </div>
    </div>
  );
}
