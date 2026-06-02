'use server';

import { type ActionResult, toActionError } from '@/server/contracts/common';
import type { Notification } from './notifications.contracts';
import {
  deleteNotification,
  listNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from './notifications.gateway';

export async function listNotificationsAction(): Promise<ActionResult<Notification[]>> {
  try {
    const data = await listNotifications();
    return { ok: true, data };
  } catch (err) {
    return toActionError(err, 'Failed to load notifications.');
  }
}

export async function markNotificationAsReadAction(
  id: string,
): Promise<ActionResult<void>> {
  try {
    await markNotificationAsRead(id);
    return { ok: true, data: undefined };
  } catch (err) {
    return toActionError(err, 'Failed to mark notification as read.');
  }
}

export async function markAllNotificationsAsReadAction(): Promise<ActionResult<void>> {
  try {
    await markAllNotificationsAsRead();
    return { ok: true, data: undefined };
  } catch (err) {
    return toActionError(err, 'Failed to mark all as read.');
  }
}

export async function deleteNotificationAction(id: string): Promise<ActionResult<void>> {
  try {
    await deleteNotification(id);
    return { ok: true, data: undefined };
  } catch (err) {
    return toActionError(err, 'Failed to delete notification.');
  }
}
