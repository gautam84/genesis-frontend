import 'server-only';

import { ApiResponse, Notification } from '@/lib/api';
import { serverFetch } from './api';

export async function listNotifications(): Promise<Notification[]> {
  const res = await serverFetch<ApiResponse<Notification[]>>('/api/notifications');
  return res.data;
}

export async function markNotificationAsRead(id: string): Promise<void> {
  await serverFetch<ApiResponse<void>>(`/api/notifications/${id}/read`, {
    method: 'PUT',
  });
}

export async function markAllNotificationsAsRead(): Promise<void> {
  await serverFetch<ApiResponse<void>>('/api/notifications/read-all', {
    method: 'PUT',
  });
}

export async function deleteNotification(id: string): Promise<void> {
  await serverFetch<ApiResponse<void>>(`/api/notifications/${id}`, {
    method: 'DELETE',
  });
}
