import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifications } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import SharedNotificationsClient from "@/components/shared/NotificationsClient";
import { getUserNotificationPreferences } from "@/lib/notification-actions";

import { isNotificationAllowedByPrefs } from "@/lib/notification-utils";

export const dynamic = "force-dynamic";

export default async function TeacherNotificationsPage() {
  const user = await requireRole("teacher");

  const [allNotifs, prefs] = await Promise.all([
    db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(100),
    getUserNotificationPreferences(user.id)
  ]);

  const items = allNotifs.map((n) => ({
    id: n.id,
    userId: n.userId,
    title: n.title ?? "Notification",
    message: n.message ?? "",
    type: n.type ?? "general",
    priority: n.priority ?? "medium",
    isRead: n.isRead,
    createdAt: n.createdAt ? new Date(n.createdAt).toISOString() : new Date().toISOString(),
  }));

  const allowedItems = items.filter((i) => isNotificationAllowedByPrefs(i, prefs));
  const unreadCount = allowedItems.filter((i) => !i.isRead).length;

  return (
    <main className="min-h-screen bg-base p-4 sm:p-6 lg:p-8 text-primary transition-colors duration-200">
      <SharedNotificationsClient
        initialItems={items}
        userId={user.id}
        initialUnreadCount={unreadCount}
        initialPrefs={prefs}
      />
    </main>
  );
}
