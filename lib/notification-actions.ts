'use server';

import { db } from './db';
import { notifications, users } from './schema';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from './auth';

export type NotificationPreferences = {
  academic: boolean;
  attendance: boolean;
  system: boolean;
  reports: boolean;
};

const DEFAULT_PREFS: NotificationPreferences = {
  academic: true,
  attendance: true,
  system: true,
  reports: true,
};

export async function createNotification(
  title: string,
  message: string,
  type: string = 'info',
  priority: 'low' | 'medium' | 'high' = 'medium'
) {
  try {
    const user = await getCurrentUser();
    if (!user) return;

    await db.insert(notifications).values({
      userId: user.id,
      title,
      message,
      type,
      priority,
      isRead: false,
    });

    revalidatePath('/admin');
    revalidatePath('/admin/notifications');
  } catch (err) {
    console.error('Failed to create notification:', err);
  }
}

export async function markNotificationRead(id: number) {
  try {
    await db
      .update(notifications)
      .set({
        isRead: true,
        readAt: new Date(),
      })
      .where(eq(notifications.id, id));

    revalidatePath('/admin/notifications');
    revalidatePath('/admin');
  } catch (err) {
    console.error('Failed to mark notification read:', err);
    throw new Error('Failed to mark notification as read');
  }
}

export async function markAllNotificationsRead(userId: number) {
  try {
    await db
      .update(notifications)
      .set({
        isRead: true,
        readAt: new Date(),
      })
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        )
      );

    revalidatePath('/admin/notifications');
    revalidatePath('/admin');
  } catch (err) {
    console.error('Failed to mark all notifications read:', err);
    throw new Error('Failed to mark all notifications as read');
  }
}

export async function getUserNotificationPreferences(
  userId: number
): Promise<NotificationPreferences> {
  try {
    const [row] = await db
      .select({ notificationPreferences: users.notificationPreferences })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!row?.notificationPreferences) return DEFAULT_PREFS;

    const parsed = JSON.parse(row.notificationPreferences);
    // Merge with defaults in case new keys were added
    return { ...DEFAULT_PREFS, ...parsed };
  } catch {
    return DEFAULT_PREFS;
  }
}

export async function saveNotificationPreferences(
  userId: number,
  prefs: NotificationPreferences
): Promise<void> {
  try {
    await db
      .update(users)
      .set({
        notificationPreferences: JSON.stringify(prefs),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    revalidatePath('/admin/notifications');
  } catch (err) {
    console.error('Failed to save notification preferences:', err);
    throw new Error('Failed to save preferences');
  }
}
