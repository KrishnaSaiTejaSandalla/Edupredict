import { db } from "@/lib/db";
import { notifications } from "@/lib/schema";
import { desc, eq } from "drizzle-orm";
import NotificationsClient from "@/components/admin/NotificationsClient";
import { requireRole } from "@/lib/auth";

export default async function NotificationsPage() {
  const user = await requireRole("admin");

  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(50);

  const items = rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
  }));

  const unreadCount = rows.filter((r) => !r.isRead).length;

  return (
    <main className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <NotificationsClient
        initialItems={items}
        userId={user.id}
        initialUnreadCount={unreadCount}
      />
    </main>
  );
}
