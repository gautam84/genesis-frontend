import { AuthProvider } from '@/features/auth/auth.provider';

/**
 * Layout for unauthenticated auth pages (login/signup). Mounts AuthProvider
 * seeded with `null` — these pages are only reachable without a session
 * (middleware redirects logged-in users away), so there's nothing to fetch and
 * `login()` refreshes the user itself. No NotificationProvider here.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider initialUser={null}>{children}</AuthProvider>;
}
