import { ApiResponse, fetchWithAuth } from './client';

export enum NotificationType {
    INFO = 'INFO',
    SUCCESS = 'SUCCESS',
    WARNING = 'WARNING',
    ERROR = 'ERROR'
}

export interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    workspaceId?: string;
    actorId?: string;
    link?: string;
    read: boolean;
    createdAt: string;
}

export const notificationApi = {
    /**
     * Get all notifications for current user
     */
    getAll: async (): Promise<ApiResponse<Notification[]>> => {
        return fetchWithAuth<ApiResponse<Notification[]>>('/api/notifications');
    },

    /**
     * Get unread notifications
     */
    getUnread: async (): Promise<ApiResponse<Notification[]>> => {
        return fetchWithAuth<ApiResponse<Notification[]>>('/api/notifications/unread');
    },

    /**
     * Mark notification as read
     */
    markAsRead: async (id: string): Promise<ApiResponse<void>> => {
        return fetchWithAuth<ApiResponse<void>>(`/api/notifications/${id}/read`, {
            method: 'PUT',
        });
    },

    /**
     * Mark all as read
     */
    markAllAsRead: async (): Promise<ApiResponse<void>> => {
        return fetchWithAuth<ApiResponse<void>>('/api/notifications/read-all', {
            method: 'PUT',
        });
    },

    /**
     * Delete notification
     */
    delete: async (id: string): Promise<ApiResponse<void>> => {
        return fetchWithAuth<ApiResponse<void>>(`/api/notifications/${id}`, {
            method: 'DELETE',
        });
    },
};
