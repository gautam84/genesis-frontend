'use client';

import { Toaster } from 'sonner';
import { AuthProvider } from '@/features/auth/auth.provider';
import { NotificationProvider } from '@/features/notifications/notifications.provider';

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <NotificationProvider>
                {children}
                <Toaster position="top-right" richColors closeButton />
            </NotificationProvider>
        </AuthProvider>
    );
}
