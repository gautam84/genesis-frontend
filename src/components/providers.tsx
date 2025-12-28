'use client';

import { AuthProvider } from '@/lib/auth';
import { NotificationProvider } from '@/lib/notifications';

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <NotificationProvider>
                {children}
            </NotificationProvider>
        </AuthProvider>
    );
}
