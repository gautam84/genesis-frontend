'use client';

import { useRequireAuth } from '@/lib/auth';

interface AuthGuardProps {
  children: React.ReactNode;
  loadingComponent?: React.ReactNode;
}

/**
 * AuthGuard component that protects routes by requiring authentication
 * Shows a loading state while checking auth, redirects to login if not authenticated
 */
export function AuthGuard({ children, loadingComponent }: AuthGuardProps) {
  const { isLoading, isAuthenticated } = useRequireAuth();

  // Show loading while checking authentication
  if (isLoading) {
    return (
      loadingComponent || (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
          <div className="flex items-center gap-3">
            <svg
              className="animate-spin h-8 w-8 text-[var(--primary)]"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span className="text-lg text-slate-600 dark:text-slate-400">Loading...</span>
          </div>
        </div>
      )
    );
  }

  // If not authenticated, useRequireAuth will redirect to login
  // Only render children if authenticated
  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
