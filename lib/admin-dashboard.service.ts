import { and, asc, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  attendance,
  classes,
  exams,
  notifications,
  results,
  students,
  subjects,
  teachers,
  users,
} from "@/lib/schema";
import { calculateAttendancePercentage, formatDateKey } from "@/lib/attendance-utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DashboardAlert = {
  id: string;
  tone: "warning" | "danger" | "info";
  title: string;
  message: string;
};

export type RecentStudent = {
  id: number;
  name: string;
  className: string;
  admissionDate: string;
  attendancePercentage: number;
  latestPerformance: number | null;
  initials: string;
  riskLevel: "low" | "medium" | "high" | null;
};

export type UpcomingExam = {
  id: number;
  subjectName: string;
  className: string;
  examDate: string;
};

export type TrendDatum = {
  exam: string;
  examDate: string;
  percentage: number;
};

export type SubjectDatum = {
  subject: string;
  percentage: number;
};

export type DashboardPayload = {
  kpis: {
    totalStudents: number;
    totalTeachers: number;
    averageAttendance: number;
    passRate: number;
  };
  recentStudents: RecentStudent[];
  upcomingExams: UpcomingExam[];
  alerts: DashboardAlert[];
  classDistribution: { className: string; count: number }[];
  genderDistribution: { gender: string; count: number }[];
  trend: TrendDatum[];
  subjects: SubjectDatum[];
  attendanceTrend: { day: string; thisWeek: number | null; lastWeek: number | null }[];
  aiInsights: { id: string; message: string; severity: "high" | "medium" | "low" }[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initialsFromName(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "S"
  );
}

/**
 * Risk rules:
 *  HIGH   – attendance < 60%  OR  performance < 55%
 *  MEDIUM – attendance 60–74% OR  performance 55–69%
 *  LOW    – everything else
 *  null   – no data at all (new student, no records)
 */
function calculateRiskLevel(
  attendancePercentage: number,
  hasAttData: boolean,
  latestPerformance: number | null
): "low" | "medium" | "high" | null {
  const hasPerfData = latestPerformance !== null;
  if (!hasAttData && !hasPerfData) return null;

  // HIGH — most severe, evaluated first
  if (hasAttData && attendancePercentage < 60) return "high";
  if (hasPerfData && latestPerformance! < 55) return "high";

  // MEDIUM
  if (hasAttData && attendancePercentage < 75) return "medium";
  if (hasPerfData && latestPerformance! < 70) return "medium";

  return "low";
}

// ─── Main Query ───────────────────────────────────────────────────────────────

export async function getAdminDashboardData(): Promise<DashboardPayload> {
  const [
    studentCountRow,
    teacherCountRow,
    attendanceTotalsRow,
    passTotalsRow,
    recentStudentsRaw,
    upcomingExamsRaw,
    notificationsRaw,
    classDistributionRaw,
    examTrendRaw,
    subjectAvgsRaw,
    genderDistributionRaw,
  ] = await Promise.all([
    // 1. Total students
    db.select({ count: sql<number>`count(*)` }).from(students),

    // 2. Total teachers
    db.select({ count: sql<number>`count(*)` }).from(teachers),

    // 3. Overall attendance
    db
      .select({
        total: sql<number>`count(*)`,
        present: sql<number>`sum(case when ${attendance.status} = 'present' then 1 else 0 end)`,
      })
      .from(attendance),

    // 4. Pass rate (marks/maxMarks >= 0.4 = pass)
    db
      .select({
        total: sql<number>`count(*)`,
        passed: sql<number>`sum(case when (${results.marks} / nullif(${exams.maxMarks}, 0)) >= 0.4 then 1 else 0 end)`,
      })
      .from(results)
      .innerJoin(exams, eq(results.examId, exams.id)),

    // 5. Recent students (latest 5)
    db
      .select({
        id: students.id,
        name: users.name,
        className: classes.name,
        section: classes.section,
        admissionDate: students.admissionDate,
      })
      .from(students)
      .leftJoin(users, eq(users.id, students.userId))
      .leftJoin(classes, eq(classes.id, students.classId))
      .orderBy(desc(students.createdAt))
      .limit(5),

    // 6. Upcoming exams
    db
      .select({
        id: exams.id,
        subjectName: subjects.name,
        className: classes.name,
        examDate: exams.examDate,
      })
      .from(exams)
      .leftJoin(subjects, eq(subjects.id, exams.subjectId))
      .leftJoin(classes, eq(classes.id, exams.classId))
      .where(gte(exams.examDate, new Date()))
      .orderBy(asc(exams.examDate))
      .limit(5),

    // 7. Unread notifications → alerts
    db
      .select({
        id: notifications.id,
        title: notifications.title,
        message: notifications.message,
        priority: notifications.priority,
      })
      .from(notifications)
      .where(eq(notifications.isRead, false))
      .orderBy(desc(notifications.createdAt))
      .limit(5),

    // 8. Class distribution
    db
      .select({
        className: sql<string>`coalesce(${classes.name}, 'No Class')`,
        count: sql<number>`count(*)`,
      })
      .from(students)
      .leftJoin(classes, eq(classes.id, students.classId))
      .groupBy(classes.id, classes.name),

    // 9. Exam performance trend (last 8 exams, chronological)
    db
      .select({
        name: exams.name,
        maxMarks: exams.maxMarks,
        examDate: exams.examDate,
        avgMarks: sql<number>`avg(${results.marks})`,
      })
      .from(exams)
      .leftJoin(results, eq(results.examId, exams.id))
      .groupBy(exams.id, exams.name, exams.maxMarks, exams.examDate)
      .orderBy(asc(exams.examDate))
      .limit(8),

    // 10. Subject performance averages
    db
      .select({
        subjectName: subjects.name,
        maxMarks: exams.maxMarks,
        avgMarks: sql<number>`avg(${results.marks})`,
      })
      .from(results)
      .innerJoin(exams, eq(results.examId, exams.id))
      .innerJoin(subjects, eq(exams.subjectId, subjects.id))
      .groupBy(subjects.id, subjects.name, exams.maxMarks),
 
    // 11. Gender distribution
    db
      .select({
        gender: sql<string>`coalesce(${students.gender}, 'Unknown')`,
        count: sql<number>`count(*)`,
      })
      .from(students)
      .groupBy(students.gender),
  ]);

  // ─── KPIs ─────────────────────────────────────────────────────────────────
  const totalStudents = Number(studentCountRow[0]?.count ?? 0);
  const totalTeachers = Number(teacherCountRow[0]?.count ?? 0);
  const averageAttendance = calculateAttendancePercentage({
    present: Number(attendanceTotalsRow[0]?.present ?? 0),
    total: Number(attendanceTotalsRow[0]?.total ?? 0),
  });
  const passRate = calculateAttendancePercentage({
    present: Number(passTotalsRow[0]?.passed ?? 0),
    total: Number(passTotalsRow[0]?.total ?? 0),
  });

  // ─── Per-student attendance + performance (2nd-wave parallel) ─────────────
  const recentStudentIds = recentStudentsRaw.map((row) => row.id);

  const [recentStudentAttendanceRaw, recentStudentPerformanceRaw] =
    recentStudentIds.length > 0
      ? await Promise.all([
          db
            .select({
              studentId: attendance.studentId,
              total: sql<number>`count(*)`,
              present: sql<number>`sum(case when ${attendance.status} = 'present' then 1 else 0 end)`,
            })
            .from(attendance)
            .where(
              sql`${attendance.studentId} in (${sql.join(
                recentStudentIds.map((id) => sql`${id}`),
                sql`, `
              )})`
            )
            .groupBy(attendance.studentId),
          db
            .select({
              studentId: results.studentId,
              percentage: sql<number>`round(avg((${results.marks} / nullif(${exams.maxMarks}, 0)) * 100))`,
            })
            .from(results)
            .innerJoin(exams, eq(exams.id, results.examId))
            .where(
              sql`${results.studentId} in (${sql.join(
                recentStudentIds.map((id) => sql`${id}`),
                sql`, `
              )})`
            )
            .groupBy(results.studentId),
        ])
      : [[], []];

  const attendanceByStudent = Object.fromEntries(
    recentStudentAttendanceRaw.map((row) => [row.studentId, row])
  );
  const performanceByStudent = Object.fromEntries(
    recentStudentPerformanceRaw.map((row) => [row.studentId, row])
  );

  // ─── Recent Students (with riskLevel) ─────────────────────────────────────
  const recentStudents: RecentStudent[] = recentStudentsRaw.map((row) => {
    const attRecord = attendanceByStudent[row.id];
    const perfRecord = performanceByStudent[row.id];

    const hasAttData = !!attRecord && Number(attRecord.total) > 0;

    const attendancePercentage = hasAttData
      ? calculateAttendancePercentage({
          present: Number(attRecord.present ?? 0),
          total: Number(attRecord.total ?? 0),
        })
      : 0;

    const latestPerformance = perfRecord
      ? Number(perfRecord.percentage ?? 0)
      : null;

    const riskLevel = calculateRiskLevel(attendancePercentage, hasAttData, latestPerformance);

    return {
      id: row.id,
      name: row.name ?? "Student",
      className: row.section
        ? `${row.className ?? "Unknown"} • ${row.section}`
        : row.className ?? "Unknown",
      admissionDate: formatDateKey(row.admissionDate),
      attendancePercentage,
      latestPerformance,
      initials: initialsFromName(row.name ?? "Student"),
      riskLevel,
    };
  });

  // ─── Alerts ───────────────────────────────────────────────────────────────
  const alerts: DashboardAlert[] = notificationsRaw.length
    ? notificationsRaw.map((alert) => {
        const tone: DashboardAlert["tone"] =
          alert.priority === "high"
            ? "danger"
            : alert.priority === "medium"
            ? "warning"
            : "info";
        return {
          id: alert.id.toString(),
          tone,
          title: alert.title ?? "Notification",
          message: alert.message ?? "You have a system notification.",
        };
      })
    : [
        {
          id: "friendly-status",
          tone: "info",
          title: "No unread alerts",
          message: "All systems are stable. No pending notifications.",
        },
      ];

  // ─── Upcoming Exams ───────────────────────────────────────────────────────
  const upcomingExams: UpcomingExam[] = upcomingExamsRaw.map((exam) => ({
    id: exam.id,
    subjectName: exam.subjectName ?? "Unknown subject",
    className: exam.className ?? "Unknown class",
    examDate: formatDateKey(exam.examDate),
  }));

  // ─── Class Distribution ──────────────────────────────────────────────────
  const classDistribution = classDistributionRaw.map((row) => ({
    className: row.className || "No Class",
    count: Number(row.count ?? 0),
  }));
 
  // ─── Gender Distribution ──────────────────────────────────────────────────
  const genderDistribution = genderDistributionRaw.map((row) => ({
    gender: row.gender || "Unknown",
    count: Number(row.count ?? 0),
  }));

  // ─── Exam Performance Trend ───────────────────────────────────────────────
  const trend: TrendDatum[] = examTrendRaw.map((row) => {
    const maxM = Number(row.maxMarks) || 100;
    const avg = Number(row.avgMarks ?? 0);
    return {
      exam: row.name ?? "Exam",
      examDate: row.examDate
        ? new Date(row.examDate).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })
        : "—",
      percentage: maxM > 0 ? Math.round((avg / maxM) * 100) : 0,
    };
  });

  // ─── Subject Performance (aggregate across exams per subject) ─────────────
  const subjectAccum: Record<string, { sumPct: number; count: number }> = {};
  for (const row of subjectAvgsRaw) {
    const key = row.subjectName ?? "Unknown";
    const maxM = Number(row.maxMarks) || 100;
    const avg = Number(row.avgMarks ?? 0);
    const pct = maxM > 0 ? (avg / maxM) * 100 : 0;
    if (!subjectAccum[key]) subjectAccum[key] = { sumPct: 0, count: 0 };
    subjectAccum[key].sumPct += pct;
    subjectAccum[key].count += 1;
  }
  const subjectData: SubjectDatum[] = Object.entries(subjectAccum).map(
    ([subject, v]) => ({
      subject,
      percentage: Math.round(v.sumPct / v.count),
    })
  );

  // ─── Attendance Trend (This Week vs Last Week Mon-Sun) ───────────────────
  const today = new Date();
  const currentDay = today.getDay(); // 0 is Sunday, 1 is Monday...
  const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;

  const startOfThisWeek = new Date(today);
  startOfThisWeek.setDate(today.getDate() + distanceToMonday);
  startOfThisWeek.setHours(0, 0, 0, 0);

  const startOfLastWeek = new Date(startOfThisWeek);
  startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);

  const endOfThisWeek = new Date(startOfThisWeek);
  endOfThisWeek.setDate(startOfThisWeek.getDate() + 6);
  endOfThisWeek.setHours(23, 59, 59, 999);

  const endOfLastWeek = new Date(startOfLastWeek);
  endOfLastWeek.setDate(startOfLastWeek.getDate() + 6);
  endOfLastWeek.setHours(23, 59, 59, 999);

  const [thisWeekAttendanceRaw, lastWeekAttendanceRaw] = await Promise.all([
    db
      .select({
        date: attendance.attendanceDate,
        status: attendance.status,
      })
      .from(attendance)
      .where(
        and(
          sql`${attendance.attendanceDate} >= ${startOfThisWeek.toISOString().slice(0, 10)}`,
          sql`${attendance.attendanceDate} <= ${endOfThisWeek.toISOString().slice(0, 10)}`
        )
      ),
    db
      .select({
        date: attendance.attendanceDate,
        status: attendance.status,
      })
      .from(attendance)
      .where(
        and(
          sql`${attendance.attendanceDate} >= ${startOfLastWeek.toISOString().slice(0, 10)}`,
          sql`${attendance.attendanceDate} <= ${endOfLastWeek.toISOString().slice(0, 10)}`
        )
      )
  ]);

  const daysOfWeekNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const getDailyPercentages = (records: any[]) => {
    const dailyData: Record<number, { present: number; total: number }> = {};
    for (let i = 0; i < 7; i++) {
      dailyData[i] = { present: 0, total: 0 };
    }

    records.forEach((r) => {
      const d = new Date(r.date);
      let dayIndex = d.getDay() - 1;
      if (dayIndex === -1) dayIndex = 6; // Sunday

      if (dayIndex >= 0 && dayIndex < 7) {
        dailyData[dayIndex].total += 1;
        if (r.status === "present") {
          dailyData[dayIndex].present += 1;
        }
      }
    });

    return daysOfWeekNames.map((name, index) => {
      const dayData = dailyData[index];
      const percentage = dayData.total > 0 ? Math.round((dayData.present / dayData.total) * 100) : null;
      return percentage;
    });
  };

  const thisWeekPercentages = getDailyPercentages(thisWeekAttendanceRaw);
  const lastWeekPercentages = getDailyPercentages(lastWeekAttendanceRaw);

  const attendanceTrend = daysOfWeekNames.map((name, index) => ({
    day: name,
    thisWeek: thisWeekPercentages[index],
    lastWeek: lastWeekPercentages[index],
  }));

  // ─── AI Insights ──────────────────────────────────────────────────────────
  const aiInsights: { id: string; message: string; severity: "high" | "medium" | "low" }[] = [];
 
  return {
    kpis: { totalStudents, totalTeachers, averageAttendance, passRate },
    recentStudents,
    upcomingExams,
    alerts,
    classDistribution,
    genderDistribution,
    trend,
    subjects: subjectData,
    attendanceTrend,
    aiInsights,
  };
}
