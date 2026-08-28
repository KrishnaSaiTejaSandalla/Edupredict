import StudentShell from "@/components/student/StudentShell";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifications, students, attendance, predictions, subjects } from "@/lib/schema";
import { eq, desc, and, sql } from "drizzle-orm";

import { getUserNotificationPreferences } from "@/lib/notification-actions";
import { isNotificationAllowedByPrefs } from "@/lib/notification-utils";

export const dynamic = "force-dynamic";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("student");

  const [unreadNotifs, prefs] = await Promise.all([
    db
      .select({
        id: notifications.id,
        title: notifications.title,
        message: notifications.message,
        type: notifications.type,
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
      .limit(20),
    getUserNotificationPreferences(user.id)
  ]);

  const allowedUnread = unreadNotifs.filter((n) =>
    isNotificationAllowedByPrefs(
      { type: n.type, title: n.title, message: n.message },
      prefs
    )
  ).slice(0, 5);

  const alerts = allowedUnread.map((n) => ({
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

  const [studentRow] = await db
    .select({ id: students.id })
    .from(students)
    .where(eq(students.userId, user.id))
    .limit(1);

  let customPhrases = [
    'track your assignments. 📝',
    'explore learning resources. 📚',
    'view your academic progress. 📈',
  ];

  if (studentRow) {
    const [attRow] = await db
      .select({
        total: sql<number>`sum(case when ${attendance.status} != 'leave' then 1 else 0 end)`,
        present: sql<number>`sum(case when ${attendance.status} = 'present' then 1 when ${attendance.status} = 'half_day' then 0.5 else 0 end)`,
      })
      .from(attendance)
      .where(eq(attendance.studentId, studentRow.id));
    
    const totalDays = Number(attRow?.total || 0);
    const presentDays = Number(attRow?.present || 0);
    if (totalDays > 0) {
      const attendanceRate = Math.round((presentDays / totalDays) * 100);
      customPhrases.push(`maintain your ${attendanceRate}% attendance. 📈`);
    }

    const studentPredictions = await db
      .select({
        subjectName: subjects.name,
        predictedScore: predictions.predictedScore,
      })
      .from(predictions)
      .leftJoin(subjects, eq(subjects.id, predictions.subjectId))
      .where(eq(predictions.studentId, studentRow.id))
      .limit(1);

    if (studentPredictions.length > 0 && studentPredictions[0].subjectName && studentPredictions[0].predictedScore) {
      customPhrases.push(`conquer ${studentPredictions[0].subjectName} (AI predicts ${Math.round(Number(studentPredictions[0].predictedScore))}%). 🔮`);
    }
  }

  return (
    <StudentShell
      user={{
        name: user.name,
        email: user.email,
        profileImageUrl: user.profileImageUrl ?? null,
        school: user.school ?? null,
      }}
      alerts={finalAlerts}
      phrases={customPhrases}
    >
      {children}
    </StudentShell>
  );
}
