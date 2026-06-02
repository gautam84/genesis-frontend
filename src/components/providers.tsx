'use client';

import { Toaster } from 'sonner';
import { AuthProvider } from '@/features/auth/auth.provider';

/**
 * Root providers — available on every route (auth + app). AuthProvider lives
 * here because unauthenticated pages (login/signup/verify-email) call useAuth.
 * The NotificationProvider is intentionally NOT here: it's scoped to the
 * authenticated `(app)` route group so no STOMP socket opens on auth pages.
 */
export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            {children}
            <Toaster position="top-right" richColors closeButton />
        </AuthProvider>
    );
}
