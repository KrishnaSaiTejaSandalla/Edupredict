import { requireRole } from "@/lib/auth";
import { getParentChildren } from "@/lib/parent-actions";
import { db } from "@/lib/db";
import { students, results, exams, subjects, attendance, notifications, assignments, assignmentSubmissions, buses, predictions, timetables, studentDiaries } from "@/lib/schema";
import { eq, desc, and, gte, inArray, sql } from "drizzle-orm";
import ParentDashboardClient from "@/components/parent/ParentDashboardClient";

export const dynamic = "force-dynamic";

export default async function ParentPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const user = await requireRole("parent");
  const childrenList = await getParentChildren(user.id);

  if (childrenList.length === 0) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 text-center text-muted">
        <div className="max-w-md mx-auto rounded-2xl border border-theme bg-surface p-8 space-y-4">
          <h2 className="text-lg font-bold text-primary">No Linked Profiles</h2>
          <p className="text-xs text-secondary leading-relaxed">
            No student profiles are currently linked to your parent account. Please contact the school administration to map your children.
          </p>
        </div>
      </div>
    );
  }

  const params = await searchParams;
  const studentIdParam = params?.studentId;
  const selectedStudent = studentIdParam
    ? childrenList.find((c) => c.studentId === Number(studentIdParam)) || childrenList[0]
    : childrenList[0];

  const studentId = selectedStudent.studentId;
  const classId = selectedStudent.classId;

  // 1. Attendance Metrics
  const totalAttRows = await db
    .select({ status: attendance.status })
    .from(attendance)
    .where(eq(attendance.studentId, studentId));
  const totalDays = totalAttRows.length;
  const leaveCount = totalAttRows.filter((r) => r.status === "leave").length;
  const halfDayCount = totalAttRows.filter((r) => r.status === "half_day").length;
  const workingDays = totalDays - leaveCount;
  const presentCount = totalAttRows.filter((r) => r.status === "present").length;
  const absentCount = totalAttRows.filter((r) => r.status === "absent").length;
  const lateCount = totalAttRows.filter((r) => r.status === "late").length;
  const presentWeight = presentCount + halfDayCount * 0.5;
  const attendancePercent = workingDays > 0 ? Math.round((presentWeight / workingDays) * 100) : 0;

  // 2. Today's Attendance
  const today = new Date();
  const todayDateObj = new Date(today.toISOString().split("T")[0] + "T00:00:00");
  const [todayAttRow] = await db
    .select({ status: attendance.status, remarks: attendance.remarks })
    .from(attendance)
    .where(
      and(
        eq(attendance.studentId, studentId),
        eq(attendance.attendanceDate, todayDateObj)
      )
    )
    .limit(1);
  const todayAttendance = todayAttRow
    ? { status: todayAttRow.status, remarks: todayAttRow.remarks }
    : null;

  // 3. Classmates & Class Rank
  const classmates = await db
    .select({ id: students.id })
    .from(students)
    .where(eq(students.classId, classId));

  const classmatesScores = await Promise.all(
    classmates.map(async (cm) => {
      const resultsRows = await db
        .select({ marks: results.marks, maxMarks: exams.maxMarks })
        .from(results)
        .leftJoin(exams, eq(results.examId, exams.id))
        .where(eq(results.studentId, cm.id));

      let sumObtained = 0;
      let sumMax = 0;
      resultsRows.forEach((r) => {
        if (r.marks !== null) {
          sumObtained += Number(r.marks);
          sumMax += Number(r.maxMarks || 100);
        }
      });

      const avgPercent = sumMax > 0 ? (sumObtained / sumMax) * 100 : 0;
      return { id: cm.id, avgPercent };
    })
  );

  classmatesScores.sort((a, b) => b.avgPercent - a.avgPercent);
  const rankIndex = classmatesScores.findIndex((s) => s.id === studentId);
  const classRank = rankIndex !== -1 ? rankIndex + 1 : 1;
  const classSize = classmatesScores.length;

  const studentScoresRow = classmatesScores.find((s) => s.id === studentId);
  const overallAvg = studentScoresRow ? studentScoresRow.avgPercent : 0;
  const gpa = Math.round((overallAvg / 25) * 100) / 100;

  // 4. Recent Results
  const list = await db
    .select({
      id: results.id,
      marks: results.marks,
      recordedDate: results.recordedDate,
      examName: exams.name,
      maxMarks: exams.maxMarks,
      subjectId: results.subjectId,
      subjectName: subjects.name,
    })
    .from(results)
    .leftJoin(exams, eq(exams.id, results.examId))
    .leftJoin(subjects, eq(subjects.id, results.subjectId))
    .where(eq(results.studentId, studentId))
    .orderBy(desc(results.recordedDate));

  const recentResults = list.slice(0, 5).map((r) => ({
    ...r,
    maxMarks: Number(r.maxMarks || 100),
    recordedDate: r.recordedDate instanceof Date ? r.recordedDate.toISOString().split("T")[0] : String(r.recordedDate),
    examName: r.examName ?? "Assessment",
    subjectName: r.subjectName ?? "Unknown Subject",
  }));

  // 5. Subject Performance
  const classStudentIds = classmates.map((c) => c.id);
  const classResults = classStudentIds.length > 0
    ? await db
        .select({
          subjectId: results.subjectId,
          marks: results.marks,
          maxMarks: exams.maxMarks,
        })
        .from(results)
        .leftJoin(exams, eq(results.examId, exams.id))
        .where(inArray(results.studentId, classStudentIds))
    : [];

  const subjectAverages: Record<
    string,
    {
      subjectName: string;
      studentAvg: number;
      classAvg: number;
      riskLevel: string;
      predictedScore: number;
    }
  > = {};

  list.forEach((r) => {
    if (r.subjectId && r.subjectName) {
      const key = String(r.subjectId);
      if (!subjectAverages[key]) {
        subjectAverages[key] = {
          subjectName: r.subjectName,
          studentAvg: 0,
          classAvg: 0,
          riskLevel: "low",
          predictedScore: 0,
        };
      }
    }
  });

  const predictionRows = await db
    .select({
      subjectId: predictions.subjectId,
      predictedScore: predictions.predictedScore,
      riskLevel: predictions.riskLevel,
    })
    .from(predictions)
    .where(eq(predictions.studentId, studentId));

  Object.keys(subjectAverages).forEach((subjIdStr) => {
    const subjId = Number(subjIdStr);

    const studentSubjRows = list.filter((r) => r.subjectId === subjId);
    let studObtained = 0,
      studMax = 0;
    studentSubjRows.forEach((r) => {
      if (r.marks !== null) {
        studObtained += Number(r.marks);
        studMax += Number(r.maxMarks || 100);
      }
    });
    const studentAvg = studMax > 0 ? Math.round((studObtained / studMax) * 100) : 0;

    const classSubjRows = classResults.filter((r) => r.subjectId === subjId);
    let classObtained = 0,
      classMax = 0;
    classSubjRows.forEach((r) => {
      if (r.marks !== null) {
        classObtained += Number(r.marks);
        classMax += Number(r.maxMarks || 100);
      }
    });
    const classAvg = classMax > 0 ? Math.round((classObtained / classMax) * 100) : 0;

    const pred = predictionRows.find((p) => p.subjectId === subjId);
    const predictedScore = pred ? Number(pred.predictedScore) : studentAvg;
    const riskLevel = pred
      ? pred.riskLevel
      : studentAvg < 50
      ? "high"
      : studentAvg < 70
      ? "medium"
      : "low";

    subjectAverages[subjIdStr] = {
      subjectName: subjectAverages[subjIdStr].subjectName,
      studentAvg,
      classAvg,
      riskLevel,
      predictedScore,
    };
  });

  const subjectPerformance = Object.values(subjectAverages);

  // 6. Upcoming Exams
  const examRows = await db
    .select({
      id: exams.id,
      name: exams.name,
      examDate: exams.examDate,
      startTime: sql<string>`'09:00'`,
      endTime: sql<string>`'10:30'`,
      subjectName: subjects.name,
    })
    .from(exams)
    .leftJoin(subjects, eq(subjects.id, exams.subjectId))
    .where(and(eq(exams.classId, classId), gte(exams.examDate, todayDateObj)))
    .orderBy(exams.examDate)
    .limit(5);

  const upcomingExams = examRows.map((r) => ({
    id: r.id,
    name: r.name,
    examDate: r.examDate instanceof Date ? r.examDate.toISOString().split("T")[0] : String(r.examDate),
    startTime: r.startTime,
    endTime: r.endTime,
    subjectName: r.subjectName ?? "Unknown Subject",
  }));

  // 7. Recent Unread Announcements (notifications for parent, type='announcement', isRead=false)
  const annRows = await db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, user.id),
        eq(notifications.type, "announcement"),
        eq(notifications.isRead, false)
      )
    )
    .orderBy(desc(notifications.createdAt))
    .limit(5);

  const unreadAnnouncements = annRows.map((r) => {
    const attachMatch = r.actionUrl?.match(/attachmentUrl=([^&]+)/);
    const attachmentUrl = attachMatch ? decodeURIComponent(attachMatch[1]) : undefined;
    return {
      id: r.id,
      title: r.title ?? "Announcement",
      message: r.message ?? "",
      priority: r.priority ?? "medium",
      createdAt: r.createdAt.toISOString(),
      attachmentUrl,
    };
  });

  // 8. Assignments (Pending & Submitted)
  const allClassAssignments = await db
    .select({
      id: assignments.id,
      title: assignments.title,
      subjectId: assignments.subjectId,
      dueDate: assignments.dueDate,
    })
    .from(assignments)
    .where(eq(assignments.classId, classId));

  const allSubmissions = await db
    .select({
      assignmentId: assignmentSubmissions.assignmentId,
      submittedAt: assignmentSubmissions.submittedAt,
    })
    .from(assignmentSubmissions)
    .where(eq(assignmentSubmissions.studentId, studentId));

  const submittedMap = new Map(allSubmissions.map((s) => [s.assignmentId, s.submittedAt]));

  const pendingAssignmentsList: any[] = [];
  const submittedAssignmentsList: any[] = [];

  for (const asg of allClassAssignments) {
    const [subj] = await db
      .select({ name: subjects.name })
      .from(subjects)
      .where(eq(subjects.id, asg.subjectId))
      .limit(1);
    const subjectName = subj?.name || "Unknown";
    const subAt = submittedMap.get(asg.id);

    if (subAt) {
      submittedAssignmentsList.push({
        id: asg.id,
        title: asg.title,
        subjectName,
        submittedAt: subAt instanceof Date ? subAt.toISOString() : String(subAt),
      });
    } else {
      pendingAssignmentsList.push({
        id: asg.id,
        title: asg.title,
        subjectName,
        dueDate: asg.dueDate instanceof Date ? asg.dueDate.toISOString() : String(asg.dueDate),
      });
    }
  }

  const pendingAssignmentsCount = pendingAssignmentsList.filter(
    (a) => new Date(a.dueDate) >= todayDateObj
  ).length;

  // 9. Performance Trend
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const trendRows = await db
    .select({
      month: sql<string>`DATE_FORMAT(${results.recordedDate}, '%Y-%m')`,
      avg: sql<number>`AVG(CAST(${results.marks} AS DECIMAL(5,2)))`,
    })
    .from(results)
    .where(and(eq(results.studentId, studentId), gte(results.recordedDate, sixMonthsAgo)))
    .groupBy(sql`DATE_FORMAT(${results.recordedDate}, '%Y-%m')`)
    .orderBy(sql`DATE_FORMAT(${results.recordedDate}, '%Y-%m')`);

  const performanceTrend = trendRows.map((r) => {
    const [year, month] = (r.month || "").split("-");
    const monthName = new Date(Number(year), Number(month) - 1, 1).toLocaleString("default", {
      month: "short",
    });
    return { month: `${monthName}`, score: Math.round(Number(r.avg || 0)) };
  });

  // 10. Active Bus
  const activeBus = await db
    .select({
      registrationNumber: buses.registrationNumber,
      routeName: buses.routeName,
      driverName: buses.driverName,
      driverPhone: buses.driverPhone,
    })
    .from(buses)
    .where(eq(buses.isActive, true))
    .limit(1);

  const busTracking = activeBus[0]
    ? {
        registrationNumber: activeBus[0].registrationNumber,
        routeName: activeBus[0].routeName,
        driverName: activeBus[0].driverName,
        driverPhone: activeBus[0].driverPhone,
        currentStop: "Main Gate",
        eta: "10 mins",
      }
    : null;

  // 11. AI study tips
  const aiInsights = [
    overallAvg >= 85
      ? `${selectedStudent.name} is performing excellently in class. Encourage them to keep up the momentum.`
      : overallAvg >= 70
      ? `${selectedStudent.name} is on track. Working on weak subjects can push scores higher.`
      : `${selectedStudent.name} needs help in some areas. Reviewing assignments daily will build confidence.`,
    attendancePercent < 75
      ? "Attendance is below 75%. Regular class attendance is vital for academic progress."
      : "Attendance is solid. Keep attending classes regularly.",
  ];

  // 12. Today's Classes from Timetable
  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const todayDayName = daysOfWeek[new Date().getDay()];
  const todayTimetableRows = await db
    .select({
      id: timetables.id,
      startTime: timetables.startTime,
      endTime: timetables.endTime,
      roomNumber: timetables.roomNumber,
      subjectName: subjects.name,
    })
    .from(timetables)
    .leftJoin(subjects, eq(subjects.id, timetables.subjectId))
    .where(
      and(
        eq(timetables.classId, classId),
        eq(timetables.dayOfWeek, todayDayName)
      )
    )
    .orderBy(timetables.startTime);

  const todayClasses = todayTimetableRows.map((r) => ({
    id: r.id,
    startTime: r.startTime,
    endTime: r.endTime,
    roomNumber: r.roomNumber || "N/A",
    subjectName: r.subjectName || "Subject",
  }));

  // 13. Recent Activity Aggregation
  // A. Results (Marks)
  const studentResultsList = await db
    .select({
      id: results.id,
      recordedDate: results.recordedDate,
      subjectName: subjects.name,
      marks: results.marks,
    })
    .from(results)
    .leftJoin(subjects, eq(subjects.id, results.subjectId))
    .where(eq(results.studentId, studentId))
    .orderBy(desc(results.recordedDate))
    .limit(8);

  // B. Diaries
  const studentDiariesList = await db
    .select({
      id: studentDiaries.id,
      date: studentDiaries.date,
      subjectName: subjects.name,
      createdAt: studentDiaries.createdAt,
    })
    .from(studentDiaries)
    .leftJoin(subjects, eq(subjects.id, studentDiaries.subjectId))
    .where(eq(studentDiaries.classId, classId))
    .orderBy(desc(studentDiaries.createdAt))
    .limit(8);

  // C. Assignments
  const studentAssignmentsList = await db
    .select({
      id: assignments.id,
      title: assignments.title,
      dueDate: assignments.dueDate,
      createdAt: assignments.createdAt,
      subjectName: subjects.name,
    })
    .from(assignments)
    .leftJoin(subjects, eq(subjects.id, assignments.subjectId))
    .where(eq(assignments.classId, classId))
    .orderBy(desc(assignments.createdAt))
    .limit(8);

  // D. Announcements/Notifications
  const parentNotifications = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(8);

  // E. Attendance
  const studentAttendanceList = await db
    .select({
      id: attendance.id,
      attendanceDate: attendance.attendanceDate,
      status: attendance.status,
    })
    .from(attendance)
    .where(eq(attendance.studentId, studentId))
    .orderBy(desc(attendance.attendanceDate))
    .limit(8);

  // Helper function for time ago inside server page
  function timeAgo(dateVal: Date | string) {
    const diff = Date.now() - new Date(dateVal).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "Just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
  }

  const activities: { type: string; title: string; desc: string; time: Date }[] = [];

  studentAssignmentsList.forEach((asg) => {
    activities.push({
      type: "assignment",
      title: "New assignment in " + (asg.subjectName || "Subject"),
      desc: asg.title,
      time: asg.createdAt ? new Date(asg.createdAt) : new Date(),
    });
  });

  studentResultsList.forEach((res) => {
    activities.push({
      type: "marks",
      title: "Marks published for " + (res.subjectName || "Subject"),
      desc: `Score: ${res.marks} obtained.`,
      time: res.recordedDate ? new Date(res.recordedDate) : new Date(),
    });
  });

  studentDiariesList.forEach((dry) => {
    activities.push({
      type: "diary",
      title: "Diary updated for " + (dry.subjectName || "Subject"),
      desc: "Homework/topic details posted.",
      time: dry.createdAt ? new Date(dry.createdAt) : new Date(),
    });
  });

  parentNotifications.forEach((notif) => {
    activities.push({
      type: "announcement",
      title: notif.title || "Announcement",
      desc: notif.message || "",
      time: notif.createdAt ? new Date(notif.createdAt) : new Date(),
    });
  });

  studentAttendanceList.forEach((att) => {
    if (att.status === "absent" || att.status === "late") {
      activities.push({
        type: "attendance",
        title: `Marked ${att.status}`,
        desc: `Student was marked ${att.status} on ${att.attendanceDate instanceof Date ? att.attendanceDate.toLocaleDateString() : String(att.attendanceDate)}`,
        time: att.attendanceDate instanceof Date ? new Date(att.attendanceDate) : new Date(),
      });
    }
  });

  activities.sort((a, b) => b.time.getTime() - a.time.getTime());
  const recentActivities = activities.slice(0, 10).map((act) => ({
    type: act.type,
    title: act.title,
    description: act.desc,
    timeAgo: timeAgo(act.time),
  }));

  const dashboardData = {
    gpa,
    classRank,
    classSize,
    overallAvg,
    attendancePercent,
    presentCount,
    absentCount,
    lateCount,
    totalDays,
    pendingAssignmentsCount,
    upcomingExamsCount: examRows.length,
    recentResults,
    upcomingExams,
    unreadAnnouncements,
    todayAttendance,
    assignments: {
      pending: pendingAssignmentsList,
      submitted: submittedAssignmentsList,
    },
    subjectPerformance,
    performanceTrend,
    aiInsights,
    busTracking,
    todayClasses,
    recentActivities,
  };

  return (
    <ParentDashboardClient
      childrenList={childrenList}
      selectedStudent={selectedStudent}
      data={dashboardData}
    />
  );
}
