'use server';

import { db } from './db';
import { notifications, users } from './schema';
import { eq, and, like, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { requireRole } from './auth';

export async function createAnnouncement(data: {
  title: string;
  message: string;
  priority: string;
  attachmentUrl?: string;
}) {
  await requireRole('admin');

  if (!data.title?.trim() || !data.message?.trim()) {
    throw new Error('Title and Message are required');
  }

  const announcementId = `ann_${Date.now()}`;
  const actionUrl = `/admin/announcements?announcementId=${announcementId}` + 
    (data.attachmentUrl ? `&attachmentUrl=${encodeURIComponent(data.attachmentUrl)}` : '');

  // Retrieve all active users to distribute notification
  const allUsers = await db.select({ id: users.id }).from(users);

  if (allUsers.length > 0) {
    const values = allUsers.map((u) => ({
      userId: u.id,
      title: data.title,
      message: data.message,
      type: 'announcement',
      priority: data.priority || 'medium',
      actionUrl,
      isRead: false,
      createdAt: new Date(),
    }));

    // Insert announcements in chunks of 500 to avoid packet size limits
    const chunkSize = 500;
    for (let i = 0; i < values.length; i += chunkSize) {
      await db.insert(notifications).values(values.slice(i, i + chunkSize));
    }
  }

  revalidatePath('/admin/announcements');
  revalidatePath('/teacher/dashboard');
  revalidatePath('/student');
  revalidatePath('/parent');

  return { success: true, announcementId };
}

export async function getAnnouncements() {
  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.type, 'announcement'))
    .orderBy(desc(notifications.createdAt));

  const seen = new Set<string>();
  const uniqueAnnouncements = [];

  for (const r of rows) {
    const match = r.actionUrl?.match(/announcementId=(ann_[0-9]+)/);
    const annId = match ? match[1] : r.actionUrl || `ann_fallback_${r.id}`;
    if (!seen.has(annId)) {
      seen.add(annId);
      const attachMatch = r.actionUrl?.match(/attachmentUrl=([^&]+)/);
      const attachmentUrl = attachMatch ? decodeURIComponent(attachMatch[1]) : undefined;
      uniqueAnnouncements.push({
        id: r.id,
        announcementId: annId,
        title: r.title,
        message: r.message,
        priority: r.priority,
        createdAt: r.createdAt,
        attachmentUrl,
      });
    }
  }

  return uniqueAnnouncements;
}

export async function deleteAnnouncement(announcementId: string) {
  await requireRole('admin');

  await db.delete(notifications).where(
    and(
      eq(notifications.type, 'announcement'),
      like(notifications.actionUrl, `%announcementId=${announcementId}%`)
    )
  );

  revalidatePath('/admin/announcements');
  revalidatePath('/teacher/dashboard');
  revalidatePath('/student');
  revalidatePath('/parent');

  return { success: true };
}
