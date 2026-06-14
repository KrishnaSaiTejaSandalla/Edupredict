import StudentShell from "@/components/student/StudentShell";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifications } from "@/lib/schema";
import { eq, desc, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("student");

  const unreadNotifs = await db
    .select({
      id: notifications.id,
      title: notifications.title,
      message: notifications.message,
      priority: notifications.priority,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, user.id),
        eq(notifications.isRead, false)
      )
    )
    .orderBy(desc(notifications.createdAt))
    .limit(5);

  const alerts = unreadNotifs.map((n) => ({
    id: n.id.toString(),
    title: n.title ?? "Notification",
    message: n.message ?? "",
    tone: (n.priority === "high"
      ? "danger"
      : n.priority === "medium"
      ? "warning"
      : "info") as "danger" | "warning" | "info",
    time: n.createdAt
      ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : "",
  }));

  const finalAlerts = alerts.length ? alerts : [{
    id: "empty",
    title: "No unread alerts",
    message: "All systems are stable.",
    tone: "info" as const,
    time: "",
  }];

  return (
    <StudentShell
      user={{
        name: user.name,
        email: user.email,
        profileImageUrl: user.profileImageUrl ?? null,
        school: user.school ?? null,
      }}
      alerts={finalAlerts}
    >
      {children}
    </StudentShell>
  );
}
