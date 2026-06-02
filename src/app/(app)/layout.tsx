import { AuthGuard } from '@/features/auth/components/AuthGuard';
import { NotificationProvider } from '@/features/notifications/notifications.provider';

/**
 * Layout for the authenticated app. Scopes the AuthGuard (client-side auth gate,
 * defence-in-depth behind middleware) and the NotificationProvider (STOMP/SockJS)
 * to authenticated routes — neither runs on the `(auth)` pages.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <NotificationProvider>{children}</NotificationProvider>
    </AuthGuard>
  );
}
