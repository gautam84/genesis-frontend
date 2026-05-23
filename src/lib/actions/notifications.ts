'use server';

import type { Notification } from '@/lib/api';
import { SessionExpiredError } from '@/lib/errors';
import {
  deleteNotification,
  listNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '@/lib/server/notifications';

type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function toError(err: unknown, fallback: string): { ok: false; error: string } {
  if (err instanceof SessionExpiredError) {
    return { ok: false, error: 'Session expired. Please log in again.' };
  }
  return { ok: false, error: err instanceof Error ? err.message : fallback };
}

export async function listNotificationsAction(): Promise<ActionResult<Notification[]>> {
  try {
    const data = await listNotifications();
    return { ok: true, data };
  } catch (err) {
    return toError(err, 'Failed to load notifications.');
  }
}

export async function markNotificationAsReadAction(
  id: string,
): Promise<ActionResult<void>> {
  try {
    await markNotificationAsRead(id);
    return { ok: true, data: undefined };
  } catch (err) {
    return toError(err, 'Failed to mark notification as read.');
  }
}

export async function markAllNotificationsAsReadAction(): Promise<ActionResult<void>> {
  try {
    await markAllNotificationsAsRead();
    return { ok: true, data: undefined };
  } catch (err) {
    return toError(err, 'Failed to mark all as read.');
  }
}

export async function deleteNotificationAction(id: string): Promise<ActionResult<void>> {
  try {
    await deleteNotification(id);
    return { ok: true, data: undefined };
  } catch (err) {
    return toError(err, 'Failed to delete notification.');
  }
}
