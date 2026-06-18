import TeacherShell from "@/components/teacher/TeacherShell";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifications, teachers, classes, classTeacherAssignments } from "@/lib/schema";
import { eq, desc, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("teacher");

  // Fetch teacher record
  const [teacher] = await db
    .select({ id: teachers.id })
    .from(teachers)
    .where(eq(teachers.userId, user.id))
    .limit(1);

  // Detect class teacher role — check class_teacher_assignments table
  let isClassTeacher = false;
  if (teacher) {
    const [classTeacherRow] = await db
      .select({ id: classTeacherAssignments.id })
      .from(classTeacherAssignments)
      .where(eq(classTeacherAssignments.teacherId, teacher.id))
      .limit(1);
    isClassTeacher = !!classTeacherRow;
  }

  // Fetch unread notifications (teacher-scoped)
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
      ? new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : "",
  }));

  const finalAlerts = alerts.length
    ? alerts
    : [
        {
          id: "empty",
          title: "No unread alerts",
          message: "You're all caught up.",
          tone: "info" as const,
          time: "",
        },
      ];

  return (
    <TeacherShell
      user={{
        name: user.name,
        email: user.email,
        profileImageUrl: user.profileImageUrl ?? null,
        school: user.school ?? null,
      }}
      isClassTeacher={isClassTeacher}
      alerts={finalAlerts}
    >
      {children}
    </TeacherShell>
  );
}
