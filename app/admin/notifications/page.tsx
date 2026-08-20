import { db } from "@/lib/db";
import { notifications } from "@/lib/schema";
import { desc, eq } from "drizzle-orm";
import NotificationsClient from "@/components/admin/NotificationsClient";
import { requireRole } from "@/lib/auth";
import { getUserNotificationPreferences } from "@/lib/notification-actions";
import { isNotificationAllowedByPrefs } from "@/lib/notification-utils";

export default async function NotificationsPage() {
  const user = await requireRole("admin");

  const [rows, prefs] = await Promise.all([
    db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(100),
    getUserNotificationPreferences(user.id)
  ]);

  const allowedRows = rows.filter((r) =>
    isNotificationAllowedByPrefs(
      { type: r.type, title: r.title, message: r.message },
      prefs
    )
  );

  const items = allowedRows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
  }));

  const unreadCount = allowedRows.filter((r) => !r.isRead).length;

  return (
    <main className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <NotificationsClient
        initialItems={items}
        userId={user.id}
        initialUnreadCount={unreadCount}
        initialPrefs={prefs}
      />
    </main>
  );
}
