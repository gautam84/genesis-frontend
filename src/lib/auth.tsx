'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, tokenStorage, UserResponse, NetworkError, SessionExpiredError } from './api';

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
        if (!tokenStorage.hasTokens()) {
            setUser(null);
            setIsLoading(false);
            return;
        }

        // One quick retry on transient network errors so we ride through a
        // brief backend restart / deploy without clobbering the session.
        const attempt = async () => {
            try {
                return await authApi.getMe();
            } catch (err) {
                if (err instanceof NetworkError) {
                    await new Promise((r) => setTimeout(r, 800));
                    return await authApi.getMe();
                }
                throw err;
            }
        };

        try {
            const response = await attempt();
            setUser(response.data);
        } catch (err) {
            if (err instanceof SessionExpiredError) {
                // Refresh token genuinely invalid; tokens already cleared by fetchWithAuth.
                setUser(null);
            } else if (err instanceof NetworkError) {
                // Server unreachable even after retry. Keep tokens — user is still
                // logged in once the backend comes back. Surface as logged-out for
                // this render so AuthGuard can show a connection state.
                console.warn('Auth check failed: backend unreachable. Keeping session.');
                setUser(null);
            } else {
                // Real auth failure (403/etc) or unexpected — clear and start over.
                tokenStorage.clearTokens();
                setUser(null);
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Check authentication status on mount
    useEffect(() => {
        refreshUser();
    }, [refreshUser]);

    const login = async (usernameOrEmail: string, password: string) => {
        setIsLoading(true);
        try {
            await authApi.login({ usernameOrEmail, password });
            await refreshUser();
        } catch (error) {
            setIsLoading(false);
            throw error;
        }
    };

    const logout = async () => {
        await authApi.logout();
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
