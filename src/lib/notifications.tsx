'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Notification, notificationApi, tokenStorage } from './api';
import { useAuth } from './auth';

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    showNotification: boolean;
    toggleNotifications: () => void;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    deleteNotification: (id: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const { user, isAuthenticated } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [stompClient, setStompClient] = useState<Client | null>(null);
    const [showNotification, setShowNotification] = useState(false);

    // Fetch initial notifications
    const refreshNotifications = useCallback(async () => {
        if (!isAuthenticated) return;
        try {
            const response = await notificationApi.getAll();
            const data = response?.data || [];
            setNotifications(data);
            setUnreadCount(data.filter(n => !n.read).length);
        } catch (error) {
            console.error('Failed to fetch notifications', error);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        refreshNotifications();
    }, [refreshNotifications]);

    // WebSocket Connection
    useEffect(() => {
        if (!isAuthenticated || !user) {
            if (stompClient) {
                stompClient.deactivate();
                setStompClient(null);
            }
            return;
        }

        const accessToken = tokenStorage.getAccessToken();
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003';
        const socketUrl = `${apiUrl}/ws`;

        // Create client with auto-reconnect and authentication headers
        const client = new Client({
            webSocketFactory: () => new SockJS(socketUrl),
            connectHeaders: {
                Authorization: `Bearer ${accessToken}`,
            },
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,

            onConnect: () => {
                console.log('Connected to Notification WebSocket');

                // Subscribe to user-specific channel
                client.subscribe(`/user/queue/notifications`, (message: IMessage) => {
                    try {
                        const notification: Notification = JSON.parse(message.body);
                        setNotifications(prev => [notification, ...prev]);
                        setUnreadCount(prev => prev + 1);
                        // Show toast or sound could be triggered here
                    } catch (e) {
                        console.error('Failed to parse notification', e);
                    }
                });
            },

            onStompError: (frame) => {
                console.error('Broker reported error: ' + frame.headers['message']);
                console.error('Additional details: ' + frame.body);
            },
        });

        client.activate();
        setStompClient(client);

        return () => {
            client.deactivate();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated, user]);

    const markAsRead = async (id: string) => {
        await notificationApi.markAsRead(id);
        setNotifications(prev => {
            const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
            setUnreadCount(updated.filter(n => !n.read).length);
            return updated;
        });
    };

    const markAllAsRead = async () => {
        await notificationApi.markAllAsRead();
        setNotifications(prev => {
            const updated = prev.map(n => ({ ...n, read: true }));
            setUnreadCount(0);
            return updated;
        });
    };

    const deleteNotification = async (id: string) => {
        await notificationApi.delete(id);
        setNotifications(prev => {
            const updated = prev.filter(n => n.id !== id);
            setUnreadCount(updated.filter(n => !n.read).length);
            return updated;
        });
    };

    const toggleNotifications = () => {
        setShowNotification(prev => !prev);
    };

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            showNotification,
            toggleNotifications,
            markAsRead,
            markAllAsRead,
            deleteNotification
        }}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    const context = useContext(NotificationContext);
    if (!context) throw new Error('useNotifications must be used within NotificationProvider');
    return context;
}
