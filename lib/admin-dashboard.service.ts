import { and, asc, desc, eq, gte, lte, sql, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
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
  buses,
  busStops,
  busLiveLocations,
  studentBoardingLogs,
  transportRoutes,
  classSubjects,
  assignments,
  assignmentSubmissions,
  leaveRequests,
  feedback,
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

export type DashboardAiInsight = {
  id: string;
  category: "Attendance" | "Transport" | "Workload" | "Academic" | "System";
  title: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  entity?: string;
  message: string;
  metric?: string;
  action?: string;
  confidence?: number;
};

export type AttendanceRiskStudent = {
  id: number;
  name: string;
  className: string;
  attendanceRate: number;
  consecutiveAbsences: number;
  trend: "declining" | "stable" | "critical";
  riskLevel: "high" | "medium" | "low";
  reason: string;
};

export type TransportDelayPrediction = {
  busId: number;
  busNumber: string;
  routeName: string;
  riskLevel: "high" | "medium" | "low";
  expectedIssue: string;
  reason: string;
  affectedStops?: string;
  lastKnownStatus?: string;
};

export type TeacherWorkloadItem = {
  teacherId: number;
  name: string;
  classLoad: number;
  subjectCount: number;
  studentCount: number;
  assignmentsCount: number;
  status: "High Workload" | "Moderate" | "Balanced" | "Underloaded";
  imbalanceReason?: string;
};

export type MonthlySchoolSummary = {
  monthName: string;
  topInsights: string[];
  whatImproved: string[];
  needsAttention: string[];
  potentialRisks: string[];
  recommendedActions: string[];
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
  aiInsights: DashboardAiInsight[];
  attendanceRisks: AttendanceRiskStudent[];
  transportDelays: TransportDelayPrediction[];
  teacherWorkloads: TeacherWorkloadItem[];
  monthlySummary: MonthlySchoolSummary;
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
  const user = await getCurrentUser();

  // Compute date ranges for attendance trend
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
    thisWeekAttendanceRaw,
    lastWeekAttendanceRaw,
    allStudentAttendanceRaw,
    transportStatusRaw,
    teacherWorkloadRaw,
    teacherAssignmentStatsRaw,
    studentsByClassRaw,
    pendingLeavesRaw,
  ] = await Promise.all([
    // 1. Total students
    db.select({ count: sql<number>`count(*)` }).from(students),

    // 2. Total teachers
    db.select({ count: sql<number>`count(*)` }).from(teachers),

    // 3. Overall attendance
    db
      .select({
        total: sql<number>`sum(case when ${attendance.status} != 'leave' then 1 else 0 end)`,
        present: sql<number>`sum(case when ${attendance.status} = 'present' then 1 when ${attendance.status} = 'half_day' then 0.5 else 0 end)`,
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
      .where(
        and(
          eq(notifications.userId, user?.id ?? 0),
          eq(notifications.isRead, false)
        )
      )
      .orderBy(desc(notifications.createdAt))
      .limit(50),

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

    // 12. This week attendance
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

    // 13. Last week attendance
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
      ),

    // 14. All student attendance history (last 45 days) for trend & consecutive absence analysis
    db
      .select({
        studentId: attendance.studentId,
        studentName: users.name,
        className: classes.name,
        section: classes.section,
        date: attendance.attendanceDate,
        status: attendance.status,
      })
      .from(attendance)
      .innerJoin(students, eq(students.id, attendance.studentId))
      .leftJoin(users, eq(users.id, students.userId))
      .leftJoin(classes, eq(classes.id, students.classId))
      .where(sql`${attendance.attendanceDate} >= DATE_SUB(CURDATE(), INTERVAL 45 DAY)`)
      .orderBy(desc(attendance.attendanceDate)),

    // 15. Transport status & buses
    db
      .select({
        busId: buses.id,
        busNumber: buses.registrationNumber,
        driverName: buses.driverName,
        routeName: buses.routeName,
        liveStatus: busLiveLocations.status,
        liveSpeed: busLiveLocations.speed,
        lastUpdated: busLiveLocations.lastUpdatedAt,
        currentStopId: busLiveLocations.currentStopId,
        nextStopId: busLiveLocations.nextStopId,
        remainingStops: busLiveLocations.remainingStops,
      })
      .from(buses)
      .leftJoin(busLiveLocations, eq(busLiveLocations.busId, buses.id)),

    // 16. Teacher assignments & class loads
    db
      .select({
        teacherId: teachers.id,
        teacherName: users.name,
        classSubjectId: classSubjects.id,
        classId: classSubjects.classId,
        subjectId: classSubjects.subjectId,
      })
      .from(teachers)
      .leftJoin(users, eq(users.id, teachers.userId))
      .leftJoin(classSubjects, eq(classSubjects.teacherId, teachers.id)),

    // 17. Assignment metrics by teacher
    db
      .select({
        teacherId: assignments.teacherId,
        count: sql<number>`count(*)`,
      })
      .from(assignments)
      .groupBy(assignments.teacherId),

    // 18. Student count per class for workload weighting
    db
      .select({
        classId: students.classId,
        count: sql<number>`count(*)`,
      })
      .from(students)
      .groupBy(students.classId),

    // 19. Pending leaves count
    db
      .select({ count: sql<number>`count(*)` })
      .from(leaveRequests)
      .where(eq(leaveRequests.status, "pending")),
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
            total: sql<number>`sum(case when ${attendance.status} != 'leave' then 1 else 0 end)`,
            present: sql<number>`sum(case when ${attendance.status} = 'present' then 1 when ${attendance.status} = 'half_day' then 0.5 else 0 end)`,
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
  const uniqueRawAlerts: typeof notificationsRaw = [];
  const seenAlertKeys = new Set<string>();
  for (const raw of notificationsRaw) {
    const key = `${raw.title?.trim()}|||${raw.message?.trim()}`;
    if (!seenAlertKeys.has(key)) {
      seenAlertKeys.add(key);
      uniqueRawAlerts.push(raw);
    }
  }

  const alerts: DashboardAlert[] = uniqueRawAlerts.length
    ? uniqueRawAlerts.slice(0, 5).map((alert) => {
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

  // ─── Subject Performance ──────────────────────────────────────────────────
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

  // ─── Attendance Trend (This Week vs Last Week) ───────────────────────────
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
        if (r.status !== "leave") {
          dailyData[dayIndex].total += 1;
          if (r.status === "present") {
            dailyData[dayIndex].present += 1;
          } else if (r.status === "half_day") {
            dailyData[dayIndex].present += 0.5;
          }
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

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. DATA-DRIVEN ATTENDANCE RISK PREDICTION ENGINE
  // ═══════════════════════════════════════════════════════════════════════════
  const studentAttHistoryMap = new Map<number, {
    studentId: number;
    name: string;
    className: string;
    records: { date: string; status: string }[];
  }>();

  for (const row of allStudentAttendanceRaw) {
    if (!studentAttHistoryMap.has(row.studentId)) {
      studentAttHistoryMap.set(row.studentId, {
        studentId: row.studentId,
        name: row.studentName || `Student #${row.studentId}`,
        className: row.section ? `${row.className || 'Class'} (${row.section})` : (row.className || 'General'),
        records: [],
      });
    }
    studentAttHistoryMap.get(row.studentId)!.records.push({
      date: row.date instanceof Date ? row.date.toISOString().slice(0, 10) : String(row.date),
      status: row.status,
    });
  }

  const attendanceRisks: AttendanceRiskStudent[] = [];
  const cutoffTwoWeeksAgo = new Date();
  cutoffTwoWeeksAgo.setDate(cutoffTwoWeeksAgo.getDate() - 14);
  const cutoffTwoWeeksStr = cutoffTwoWeeksAgo.toISOString().slice(0, 10);

  for (const studentData of studentAttHistoryMap.values()) {
    const recs = studentData.records;
    if (recs.length < 2) continue; // Not enough attendance records to deduce risk

    // 1. Calculate overall rate
    const workingDays = recs.filter((r) => r.status !== 'leave');
    if (workingDays.length === 0) continue;

    const presentPoints = workingDays.reduce((acc, r) => {
      if (r.status === 'present' || r.status === 'late') return acc + 1;
      if (r.status === 'half_day') return acc + 0.5;
      return acc;
    }, 0);

    const overallRate = Math.round((presentPoints / workingDays.length) * 100);

    // 2. Count consecutive absences starting from the latest record
    let consecutiveAbsences = 0;
    for (const r of recs) {
      if (r.status === 'absent') {
        consecutiveAbsences++;
      } else if (r.status !== 'leave') {
        break; // stop when hit a non-absent working day
      }
    }

    // 3. Trend analysis: recent 14 days vs prior period
    const recentRecs = workingDays.filter((r) => r.date >= cutoffTwoWeeksStr);
    const priorRecs = workingDays.filter((r) => r.date < cutoffTwoWeeksStr);

    let trend: "declining" | "stable" | "critical" = "stable";
    let trendDelta = 0;

    if (recentRecs.length > 0 && priorRecs.length > 0) {
      const recentPts = recentRecs.reduce((acc, r) => (r.status === 'present' || r.status === 'late' ? acc + 1 : r.status === 'half_day' ? acc + 0.5 : acc), 0);
      const recentRate = (recentPts / recentRecs.length) * 100;

      const priorPts = priorRecs.reduce((acc, r) => (r.status === 'present' || r.status === 'late' ? acc + 1 : r.status === 'half_day' ? acc + 0.5 : acc), 0);
      const priorRate = (priorPts / priorRecs.length) * 100;

      trendDelta = Math.round(priorRate - recentRate);
      if (trendDelta >= 15) trend = "declining";
    }

    // 4. Assign Risk Level & Reason
    let riskLevel: "high" | "medium" | "low" | null = null;
    let reason = "";

    if (consecutiveAbsences >= 3 || overallRate < 60 || (overallRate < 70 && trend === "declining")) {
      riskLevel = "high";
      trend = "critical";
      if (consecutiveAbsences >= 3) {
        reason = `Logged ${consecutiveAbsences} consecutive absences with ${overallRate}% 45-day attendance.`;
      } else if (trendDelta >= 15) {
        reason = `Attendance rate dropped by ${trendDelta}% in the last 2 weeks (currently ${overallRate}%).`;
      } else {
        reason = `Critical attendance deficit (${overallRate}%) requiring immediate parental notification.`;
      }
    } else if (consecutiveAbsences === 2 || (overallRate >= 60 && overallRate < 75) || trend === "declining") {
      riskLevel = "medium";
      if (consecutiveAbsences === 2) {
        reason = `2 consecutive absences detected with ${overallRate}% attendance.`;
      } else if (trend === "declining") {
        reason = `Attendance trending downward (${overallRate}%) compared to earlier term averages.`;
      } else {
        reason = `Sub-optimal attendance rate of ${overallRate}% falls below 75% school compliance.`;
      }
    }

    if (riskLevel) {
      attendanceRisks.push({
        id: studentData.studentId,
        name: studentData.name,
        className: studentData.className,
        attendanceRate: overallRate,
        consecutiveAbsences,
        trend,
        riskLevel,
        reason,
      });
    }
  }

  // Sort: High risk first, then lowest attendance rate
  attendanceRisks.sort((a, b) => {
    if (a.riskLevel === 'high' && b.riskLevel !== 'high') return -1;
    if (b.riskLevel === 'high' && a.riskLevel !== 'high') return 1;
    return a.attendanceRate - b.attendanceRate;
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. DATA-DRIVEN TRANSPORT DELAY PREDICTION ENGINE
  // ═══════════════════════════════════════════════════════════════════════════
  const transportDelays: TransportDelayPrediction[] = [];

  if (transportStatusRaw && transportStatusRaw.length > 0) {
    const seenBuses = new Set<number>();
    for (const t of transportStatusRaw) {
      if (seenBuses.has(t.busId)) continue;
      seenBuses.add(t.busId);

      const status = t.liveStatus || 'idle';
      const speed = Number(t.liveSpeed || 0);
      const lastUpdate = t.lastUpdated ? new Date(t.lastUpdated) : null;
      const minutesSinceUpdate = lastUpdate ? Math.round((Date.now() - lastUpdate.getTime()) / (1000 * 60)) : 999;

      let riskLevel: "high" | "medium" | "low" = "low";
      let expectedIssue = "Operating normally on schedule";
      let reason = `Bus ${t.busNumber} route monitoring is active with normal telemetry.`;

      if (status === 'delayed') {
        riskLevel = "high";
        expectedIssue = "Active Transit Delay Logged";
        reason = `Driver or telemetry marked trip as delayed. ${t.remainingStops ? `${t.remainingStops} stops remaining.` : ''}`;
      } else if (status === 'breakdown') {
        riskLevel = "high";
        expectedIssue = "Vehicle Breakdown / Emergency";
        reason = `Vehicle breakdown reported for Bus ${t.busNumber}. Immediate dispatch required.`;
      } else if (status === 'trip_started' && speed === 0 && minutesSinceUpdate > 15) {
        riskLevel = "medium";
        expectedIssue = "Traffic Stoppage / Signal Loss";
        reason = `Bus stationary for ${minutesSinceUpdate} mins during an ongoing trip.`;
      } else if (status === 'trip_started' && t.remainingStops && t.remainingStops > 5) {
        riskLevel = "medium";
        expectedIssue = "Heavy Route Volume";
        reason = `Trip in progress with ${t.remainingStops} stops remaining on ${t.routeName || 'designated route'}.`;
      }

      transportDelays.push({
        busId: t.busId,
        busNumber: t.busNumber,
        routeName: t.routeName || `Route #${t.busId}`,
        riskLevel,
        expectedIssue,
        reason,
        affectedStops: t.nextStopId ? `Stop #${t.nextStopId}` : undefined,
        lastKnownStatus: status,
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. DATA-DRIVEN TEACHER WORKLOAD ANALYSIS ENGINE
  // ═══════════════════════════════════════════════════════════════════════════
  const teacherWorkloadMap = new Map<number, {
    teacherId: number;
    name: string;
    classes: Set<number>;
    subjects: Set<number>;
  }>();

  for (const row of teacherWorkloadRaw) {
    if (!teacherWorkloadMap.has(row.teacherId)) {
      teacherWorkloadMap.set(row.teacherId, {
        teacherId: row.teacherId,
        name: row.teacherName || `Teacher #${row.teacherId}`,
        classes: new Set<number>(),
        subjects: new Set<number>(),
      });
    }
    if (row.classId) teacherWorkloadMap.get(row.teacherId)!.classes.add(row.classId);
    if (row.subjectId) teacherWorkloadMap.get(row.teacherId)!.subjects.add(row.subjectId);
  }

  const assignmentCountByTeacher = Object.fromEntries(
    teacherAssignmentStatsRaw.map((r) => [r.teacherId, Number(r.count || 0)])
  );
  const studentsCountByClass = Object.fromEntries(
    studentsByClassRaw.map((r) => [r.classId, Number(r.count || 0)])
  );

  const teacherWorkloads: TeacherWorkloadItem[] = [];

  for (const t of teacherWorkloadMap.values()) {
    const classCount = t.classes.size;
    const subjectCount = t.subjects.size;
    const assignmentsCount = assignmentCountByTeacher[t.teacherId] || 0;

    let totalStudents = 0;
    t.classes.forEach((cid) => {
      totalStudents += studentsCountByClass[cid] || 0;
    });

    let status: TeacherWorkloadItem["status"] = "Balanced";
    let imbalanceReason = undefined;

    if (classCount >= 4 || assignmentsCount >= 8 || totalStudents >= 100) {
      status = "High Workload";
      imbalanceReason = `Assigned to ${classCount} cohorts (${totalStudents} students) with ${assignmentsCount} active coursework tasks.`;
    } else if (classCount >= 3 || assignmentsCount >= 4) {
      status = "Moderate";
    } else if (classCount <= 1 && assignmentsCount <= 1) {
      status = "Underloaded";
      imbalanceReason = `Available capacity: Currently allocated to only ${classCount} section.`;
    }

    teacherWorkloads.push({
      teacherId: t.teacherId,
      name: t.name,
      classLoad: classCount,
      subjectCount,
      studentCount: totalStudents,
      assignmentsCount,
      status,
      imbalanceReason,
    });
  }

  // Sort by workload intensity
  teacherWorkloads.sort((a, b) => b.classLoad - a.classLoad || b.studentCount - a.studentCount);

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. DATA-DRIVEN MONTHLY SCHOOL SUMMARY GENERATOR
  // ═══════════════════════════════════════════════════════════════════════════
  const currentMonthName = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const pendingLeavesCount = Number(pendingLeavesRaw[0]?.count || 0);
  const highRiskAttCount = attendanceRisks.filter((s) => s.riskLevel === 'high').length;
  const highWorkloadTeachers = teacherWorkloads.filter((t) => t.status === 'High Workload').length;

  const monthlySummary: MonthlySchoolSummary = {
    monthName: currentMonthName,
    topInsights: [
      `Overall school attendance is currently operating at ${averageAttendance}%, with an average exam pass rate of ${passRate}%.`,
      `Managing ${totalStudents} active students across ${classDistribution.length} academic class cohorts.`,
      `Faculty team of ${totalTeachers} teachers active in curriculum execution.`,
    ],
    whatImproved: [
      subjectData.length > 0
        ? `Subject mastery in ${[...subjectData].sort((a, b) => b.percentage - a.percentage)[0]?.subject || 'core subjects'} is leading at ${[...subjectData].sort((a, b) => b.percentage - a.percentage)[0]?.percentage || 0}%.`
        : "Standard attendance reporting maintained across all cohorts.",
      upcomingExams.length > 0
        ? `${upcomingExams.length} upcoming academic assessment rounds successfully scheduled.`
        : "Curriculum schedule running on time without pending exam delays.",
    ],
    needsAttention: [
      highRiskAttCount > 0
        ? `${highRiskAttCount} students flagged with critical attendance decline patterns.`
        : "No critical attendance issues detected.",
      pendingLeavesCount > 0
        ? `${pendingLeavesCount} leave applications awaiting administrative verification.`
        : "No pending leave requests.",
    ],
    potentialRisks: [
      highWorkloadTeachers > 0
        ? `${highWorkloadTeachers} faculty members are operating at high class/assignment capacity.`
        : "Teacher workload is evenly balanced across departments.",
      transportDelays.some((t) => t.riskLevel === 'high')
        ? "Transport delays detected on active school transit routes."
        : "Transport routes and fleet telemetry report normal operating windows.",
    ],
    recommendedActions: [
      highRiskAttCount > 0
        ? `Generate automated guardian alert notifications for the ${highRiskAttCount} students at attendance risk.`
        : "Maintain weekly attendance audit tracking.",
      pendingLeavesCount > 0
        ? `Review and sign off on ${pendingLeavesCount} pending leave applications in the Leaves module.`
        : "No pending leave backlogs require action.",
      highWorkloadTeachers > 0
        ? "Evaluate timetable distribution to rebalance teaching assignments."
        : "Continue standard academic syllabus schedules.",
    ],
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. UNIFIED PRIORITIZED AI INSIGHTS ENGINE
  // ═══════════════════════════════════════════════════════════════════════════
  const aiInsights: DashboardAiInsight[] = [];

  // Attendance risk insights (Critical / High)
  for (const risk of attendanceRisks.slice(0, 3)) {
    aiInsights.push({
      id: `att-risk-${risk.id}`,
      category: "Attendance",
      title: `${risk.riskLevel === 'high' ? 'High Attendance Risk' : 'Attendance Warning'} — ${risk.name}`,
      severity: risk.riskLevel === 'high' ? 'critical' : 'high',
      entity: risk.name,
      message: risk.reason,
      metric: `${risk.attendanceRate}% Attendance`,
      action: "Send Guardian Notification",
      confidence: 96,
    });
  }

  // Transport insights
  for (const td of transportDelays.filter((t) => t.riskLevel !== 'low').slice(0, 2)) {
    aiInsights.push({
      id: `transport-${td.busId}`,
      category: "Transport",
      title: `Transport Alert — Bus ${td.busNumber}`,
      severity: td.riskLevel === 'high' ? 'critical' : 'medium',
      entity: `Bus ${td.busNumber}`,
      message: td.reason,
      metric: td.expectedIssue,
      action: "Contact Driver / Dispatch Backup",
      confidence: 92,
    });
  }

  // Teacher workload insights
  for (const tw of teacherWorkloads.filter((t) => t.status === 'High Workload').slice(0, 2)) {
    aiInsights.push({
      id: `workload-${tw.teacherId}`,
      category: "Workload",
      title: `High Workload — ${tw.name}`,
      severity: "medium",
      entity: tw.name,
      message: tw.imbalanceReason || `Assigned to ${tw.classLoad} classes with ${tw.assignmentsCount} assignments.`,
      metric: `${tw.classLoad} Sections`,
      action: "Rebalance Teaching Load",
      confidence: 90,
    });
  }

  // Academic insights
  if (subjectData.length > 0) {
    const lowestSubj = [...subjectData].sort((a, b) => a.percentage - b.percentage)[0];
    if (lowestSubj && lowestSubj.percentage < 65) {
      aiInsights.push({
        id: `academic-low-${lowestSubj.subject}`,
        category: "Academic",
        title: `Academic Focus Needed — ${lowestSubj.subject}`,
        severity: "medium",
        entity: lowestSubj.subject,
        message: `Average student scores in ${lowestSubj.subject} stand at ${lowestSubj.percentage}%, below the 70% threshold.`,
        metric: `${lowestSubj.percentage}% Avg Score`,
        action: "Schedule Remedial Sessions",
        confidence: 88,
      });
    }
  }

  // Sort insights by priority: critical -> high -> medium -> low -> info
  const priorityScore: Record<string, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
    info: 0,
  };
  aiInsights.sort((a, b) => (priorityScore[b.severity] || 0) - (priorityScore[a.severity] || 0));

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
    attendanceRisks,
    transportDelays,
    teacherWorkloads,
    monthlySummary,
  };
}
