import StudentShell from "@/components/student/StudentShell";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifications, students, attendance, predictions, subjects } from "@/lib/schema";
import { eq, desc, and, sql } from "drizzle-orm";

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
    const [totalAttRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(attendance)
      .where(eq(attendance.studentId, studentRow.id));
    const [presentAttRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(attendance)
      .where(and(eq(attendance.studentId, studentRow.id), eq(attendance.status, 'present')));
    
    if (totalAttRow?.count && Number(totalAttRow.count) > 0) {
      const attendanceRate = Math.round((Number(presentAttRow.count) / Number(totalAttRow.count)) * 100);
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
