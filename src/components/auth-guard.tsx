'use client';

import { useRequireAuth } from '@/lib/auth';
import { FullScreenLoader } from '@/components/Spinner';

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

  if (isLoading) {
    return loadingComponent || <FullScreenLoader label="Loading..." />;
  }

  // If not authenticated, useRequireAuth will redirect to login
  // Only render children if authenticated
  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
