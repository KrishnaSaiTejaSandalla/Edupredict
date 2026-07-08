'use server';

import { db } from './db';
import { notifications, users } from './schema';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from './auth';
import { broadcastNotification } from './realtime';

export type NotificationPreferences = {
  attendance: boolean;
  assignments: boolean;
  messages: boolean;
  diary: boolean;
  feedback: boolean;
  leaves: boolean;
  announcements: boolean;
  transport: boolean;
  general: boolean;
};

const DEFAULT_PREFS: NotificationPreferences = {
  attendance: true,
  assignments: true,
  messages: true,
  diary: true,
  feedback: true,
  leaves: true,
  announcements: true,
  transport: true,
  general: true,
};

function getPrefKeyForType(type: string): string {
  const t = type.toLowerCase();
  if (t === "attendance") return "attendance";
  if (t === "assignment" || t === "assignments") return "assignments";
  if (t === "message" || t === "messages" || t === "chat" || t === "chatmessage") return "messages";
  if (t === "diary") return "diary";
  if (t === "feedback") return "feedback";
  if (t === "leave" || t === "leaves") return "leaves";
  if (t === "announcement" || t === "announcements") return "announcements";
  if (t === "transport" || t === "bus" || t === "buslocation") return "transport";
  return "general";
}

export async function createNotificationForUser(
  userId: number,
  title: string,
  message: string,
  type: string = 'info',
  priority: 'low' | 'medium' | 'high' = 'medium',
  actionUrl?: string | null
) {
  try {
    const prefs = await getUserNotificationPreferences(userId);
    const prefKey = getPrefKeyForType(type);

    if (prefs[prefKey as keyof NotificationPreferences] === false) {
      return;
    }

    const result = await db.insert(notifications).values({
      userId,
      title,
      message,
      type,
      priority,
      isRead: false,
      actionUrl: actionUrl || null,
    });

    const insertId = Number(result[0].insertId);

    // Broadcast in real-time with full info
    broadcastNotification(userId, {
      id: insertId,
      userId,
      title,
      message,
      type,
      priority,
      isRead: false,
      actionUrl: actionUrl || null,
      createdAt: new Date().toISOString(),
    });

    revalidatePath('/admin');
    revalidatePath('/admin/notifications');
    revalidatePath('/teacher');
    revalidatePath('/teacher/notifications');
    revalidatePath('/student');
    revalidatePath('/student/notifications');
    revalidatePath('/parent');
    revalidatePath('/parent/notifications');
  } catch (err) {
    console.error('Failed to create notification for user:', err);
  }
}

export async function createNotification(
  title: string,
  message: string,
  type: string = 'info',
  priority: 'low' | 'medium' | 'high' = 'medium',
  actionUrl?: string | null
) {
  const user = await getCurrentUser();
  if (!user) return;
  await createNotificationForUser(user.id, title, message, type, priority, actionUrl);
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
    revalidatePath('/teacher/notifications');
    revalidatePath('/teacher');
    revalidatePath('/student/notifications');
    revalidatePath('/student');
    revalidatePath('/parent/notifications');
    revalidatePath('/parent');
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
    revalidatePath('/teacher/notifications');
    revalidatePath('/teacher');
    revalidatePath('/student/notifications');
    revalidatePath('/student');
    revalidatePath('/parent/notifications');
    revalidatePath('/parent');
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
    revalidatePath('/admin');
    revalidatePath('/teacher/notifications');
    revalidatePath('/teacher');
    revalidatePath('/student/notifications');
    revalidatePath('/student');
    revalidatePath('/parent/notifications');
    revalidatePath('/parent');
  } catch (err) {
    console.error('Failed to save notification preferences:', err);
    throw new Error('Failed to save preferences');
  }
}

export async function deleteNotification(id: number) {
  try {
    await db.delete(notifications).where(eq(notifications.id, id));
    revalidatePath('/parent/notifications');
    revalidatePath('/parent');
    revalidatePath('/student/notifications');
    revalidatePath('/student');
    revalidatePath('/teacher/notifications');
    revalidatePath('/teacher');
    revalidatePath('/admin/notifications');
    revalidatePath('/admin');
  } catch (err) {
    console.error('Failed to delete notification:', err);
    throw new Error('Failed to delete notification');
  }
}

