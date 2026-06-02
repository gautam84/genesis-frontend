import { AuthProvider } from '@/features/auth/auth.provider';
import { NotificationProvider } from '@/features/notifications/notifications.provider';
import { getSessionAction } from '@/features/auth/auth.actions';

/**
 * Layout for the authenticated app. Resolves the session on the server and seeds
 * AuthProvider with it, so authenticated pages render their content immediately
 * (no client-side auth loader, no mount-time /me round-trip). Route protection
 * is handled server-side by middleware (redirects unauthenticated users to
 * /login), so no client AuthGuard is needed here. NotificationProvider
 * (STOMP/SockJS) is scoped to this group so no socket opens on auth pages.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionAction();
  const initialUser = session.ok ? session.data : null;

  return (
    <AuthProvider initialUser={initialUser}>
      <NotificationProvider>{children}</NotificationProvider>
    </AuthProvider>
  );
}
