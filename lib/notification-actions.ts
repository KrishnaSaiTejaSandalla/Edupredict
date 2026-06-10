'use server';

import { db } from './db';
import { notifications } from './schema';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function markNotificationRead(id: number) {
  await db
    .update(notifications)
    .set({
      isRead: true,
      readAt: new Date(),
    })
    .where(eq(notifications.id, id));

  revalidatePath('/admin/notifications');
  revalidatePath('/admin');
}

export async function markAllNotificationsRead(userId: number) {
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
}
