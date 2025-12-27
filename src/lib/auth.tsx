'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, tokenStorage, UserResponse } from './api';

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

        try {
            const response = await authApi.getMe();
            setUser(response.data);
        } catch {
            // Token invalid/expired, clear it
            tokenStorage.clearTokens();
            setUser(null);
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
