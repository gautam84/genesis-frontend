'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { UserResponse } from './api';
import { getSessionAction, loginAction, logoutAction } from './actions/auth';

interface AuthContextType {
    user: UserResponse | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (usernameOrEmail: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<UserResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    const refreshUser = useCallback(async () => {
        // Cookie is the source of truth. The action reads the HttpOnly access
        // cookie server-side, refreshes if needed, and returns the user — or
        // null when there's no valid session.
        const result = await getSessionAction();

        if (!result.ok) {
            // Transient network failure. Keep whatever we had — don't clobber
            // a live session because the backend blinked.
            console.warn('Auth check failed: backend unreachable. Keeping session.');
            setIsLoading(false);
            return;
        }

        setUser(result.data ?? null);
        setIsLoading(false);
    }, []);

    // Check authentication status on mount
    useEffect(() => {
        refreshUser();
    }, [refreshUser]);

    const login = async (usernameOrEmail: string, password: string) => {
        setIsLoading(true);
        try {
            const result = await loginAction({ usernameOrEmail, password });
            if (!result.ok) {
                setIsLoading(false);
                throw new Error(result.error);
            }
            // HttpOnly cookies are set by the action. No client-side token
            // storage to mirror.
            await refreshUser();
        } catch (error) {
            setIsLoading(false);
            throw error;
        }
    };

    const logout = async () => {
        await logoutAction();
        setUser(null);
        router.push('/login');
    };

    const value: AuthContextType = {
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshUser,
    };

    return <AuthContext.Provider value={ value }> { children } </AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

/**
 * Hook to require authentication - redirects to login if not authenticated
 */
export function useRequireAuth() {
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [isAuthenticated, isLoading, router]);

    return { isAuthenticated, isLoading };
}
