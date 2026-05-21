'use client';

import { Toaster } from 'sonner';
import { AuthProvider } from '@/lib/auth';
import { NotificationProvider } from '@/lib/notifications';

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
