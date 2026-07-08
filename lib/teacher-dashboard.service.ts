import { db } from './db';
import {
  teachers,
  classes,
  students,
  attendance,
  assignments,
  assignmentSubmissions,
  timetables,
  subjects,
  results,
  exams,
  predictions,
  notifications,
  classSubjects,
} from './schema';
import { eq, and, gte, lte, lt, sql, desc, isNull, inArray } from 'drizzle-orm';

// ==================== TEACHER DASHBOARD SERVICE ====================
// All queries are scoped to the authenticated teacher only.
// NEVER returns school-wide data.

export type TeacherDashboardData = {
  kpis: {
    todaysClasses: number;
    pendingAttendance: number;
    pendingGrading: number;
    totalStudents: number;
  };
  todayTimetable: {
    id: number;
    startTime: string;
    endTime: string;
    className: string;
    subjectName: string;
    roomNumber: string;
  }[];
  classPerformance: {
    className: string;
    avgMarks: number;
    avgAttendance: number;
  }[];
  aiInsights: {
    id: string;
    message: string;
    severity: 'high' | 'medium' | 'low';
  }[];
  recentAnnouncements: {
    id: number;
    title: string;
    message: string;
    priority: string;
    createdAt: string;
  }[];
  currentPeriod: {
    className: string;
    subjectName: string;
    roomNumber: string;
    startTime: string;
    endTime: string;
  } | null;
};

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export async function getTeacherDashboardData(userId: number): Promise<TeacherDashboardData> {
  // 1. Get teacher record
  const [teacher] = await db
    .select()
    .from(teachers)
    .where(eq(teachers.userId, userId))
    .limit(1);

  if (!teacher) {
    return {
      kpis: { todaysClasses: 0, pendingAttendance: 0, pendingGrading: 0, totalStudents: 0 },
      todayTimetable: [],
      classPerformance: [],
      aiInsights: [],
      recentAnnouncements: [],
      currentPeriod: null,
    };
  }

  const today = new Date();
  const todayStr = DAYS[today.getDay()];
  const todayDate = today.toISOString().split('T')[0];
  const currentTime = today.toTimeString().slice(0, 5); // HH:MM

  // Get assigned classes and subjects for the teacher directly from classSubjects
  const classSubjRows = await db
    .select({ classId: classSubjects.classId, subjectId: classSubjects.subjectId })
    .from(classSubjects)
    .where(eq(classSubjects.teacherId, teacher.id));

  const assignedClassIds = Array.from(new Set(classSubjRows.map((r) => r.classId).filter(Boolean))) as number[];
  const assignedSubjectIds = Array.from(new Set(classSubjRows.map((r) => r.subjectId).filter(Boolean))) as number[];

  // 2. Today's timetable entries (filtered by assignments)
  let todayEntries: any[] = [];
  if (assignedClassIds.length > 0 && assignedSubjectIds.length > 0) {
    todayEntries = await db
      .select({
        id: timetables.id,
        startTime: timetables.startTime,
        endTime: timetables.endTime,
        roomNumber: timetables.roomNumber,
        classId: timetables.classId,
        subjectId: timetables.subjectId,
        className: classes.name,
        classSection: classes.section,
        subjectName: subjects.name,
      })
      .from(timetables)
      .leftJoin(classes, eq(timetables.classId, classes.id))
      .leftJoin(subjects, eq(timetables.subjectId, subjects.id))
      .where(
        and(
          eq(timetables.teacherId, teacher.id),
          eq(timetables.dayOfWeek, todayStr),
          inArray(timetables.classId, assignedClassIds),
          inArray(timetables.subjectId, assignedSubjectIds)
        )
      )
      .orderBy(timetables.startTime);
  }

  const todayTimetable = todayEntries.map((e) => ({
    id: e.id,
    startTime: e.startTime || '',
    endTime: e.endTime || '',
    className: e.className ? `${e.className}${e.classSection ? ` ${e.classSection}` : ''}` : 'N/A',
    subjectName: e.subjectName || 'N/A',
    roomNumber: e.roomNumber || '',
  }));

  // 3. Current period
  const currentPeriodEntry = todayEntries.find(
    (e) => e.startTime <= currentTime && e.endTime > currentTime
  );
  const currentPeriod = currentPeriodEntry
    ? {
        className: currentPeriodEntry.className
          ? `${currentPeriodEntry.className}${currentPeriodEntry.classSection ? ` ${currentPeriodEntry.classSection}` : ''}`
          : 'N/A',
        subjectName: currentPeriodEntry.subjectName || 'N/A',
        roomNumber: currentPeriodEntry.roomNumber || '',
        startTime: currentPeriodEntry.startTime || '',
        endTime: currentPeriodEntry.endTime || '',
      }
    : null;

  // 4. Classes the teacher teaches
  const classIds = assignedClassIds;

  // 5. Total students across all teacher's classes
  let totalStudents = 0;
  if (classIds.length > 0) {
    const studentCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(students)
      .where(inArray(students.classId, classIds));
    totalStudents = Number(studentCountResult[0]?.count || 0);
  }

  // 6. Pending attendance — classes where teacher hasn't marked attendance today
  let pendingAttendance = 0;
  if (classIds.length > 0 && todayEntries.length > 0) {
    const todayClassIds = [...new Set(todayEntries.map((e) => e.classId).filter(Boolean))] as number[];
    let markedToday = 0;
    if (todayClassIds.length > 0) {
      const todayDateObj = new Date(today.toISOString().split('T')[0] + 'T00:00:00');
      const markedRows = await db
        .select({ classId: attendance.classId })
        .from(attendance)
        .where(
          and(
            inArray(attendance.classId, todayClassIds),
            eq(attendance.attendanceDate, todayDateObj)
          )
        )
        .groupBy(attendance.classId);
      markedToday = markedRows.length;
    }
    pendingAttendance = todayClassIds.length - markedToday;
  }

  // 7. Pending grading — submissions without a grade for this teacher's assignments
  let pendingGrading = 0;
  if (teacher && assignedClassIds.length > 0 && assignedSubjectIds.length > 0) {
    const rows = await db
      .select({ count: sql<number>`count(*)` })
      .from(assignmentSubmissions)
      .innerJoin(assignments, eq(assignmentSubmissions.assignmentId, assignments.id))
      .where(
        and(
          eq(assignments.teacherId, teacher.id),
          isNull(assignmentSubmissions.grade)
        )
      );
    pendingGrading = Number(rows[0]?.count || 0);
  }

  // 8. Class performance
  const classPerformance: TeacherDashboardData['classPerformance'] = [];
  const activeClassIds = classIds.slice(0, 6);

  if (activeClassIds.length > 0) {
    const classRows = await db
      .select({ id: classes.id, name: classes.name, section: classes.section })
      .from(classes)
      .where(inArray(classes.id, activeClassIds));

    const avgMarksRows = await db
      .select({ classId: students.classId, avg: sql<number>`AVG(CAST(${results.marks} AS DECIMAL(5,2)))` })
      .from(results)
      .leftJoin(students, eq(results.studentId, students.id))
      .where(inArray(students.classId, activeClassIds))
      .groupBy(students.classId);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const attCounts = await db
      .select({
        classId: attendance.classId,
        status: attendance.status,
        count: sql<number>`count(*)`
      })
      .from(attendance)
      .where(
        and(
          inArray(attendance.classId, activeClassIds),
          gte(attendance.attendanceDate, thirtyDaysAgo)
        )
      )
      .groupBy(attendance.classId, attendance.status);

    const avgMarksMap = new Map(avgMarksRows.map(r => [r.classId, r.avg]));
    const attTotalMap = new Map<number, number>();
    const attPresentMap = new Map<number, number>();

    attCounts.forEach(c => {
      if (c.classId) {
        const total = attTotalMap.get(c.classId) || 0;
        attTotalMap.set(c.classId, total + c.count);

        if (c.status === 'present') {
          const present = attPresentMap.get(c.classId) || 0;
          attPresentMap.set(c.classId, present + c.count);
        } else if (c.status === 'half_day') {
          const present = attPresentMap.get(c.classId) || 0;
          attPresentMap.set(c.classId, present + c.count * 0.5);
        }
      }
    });

    const classesMap = new Map(classRows.map(c => [c.id, c]));

    activeClassIds.forEach(classId => {
      const classRow = classesMap.get(classId);
      if (!classRow) return;

      const totalAtt = attTotalMap.get(classId) || 0;
      const presentAtt = attPresentMap.get(classId) || 0;
      const avgAttendance = totalAtt > 0 ? Math.round((presentAtt / totalAtt) * 100) : 0;
      const avgMarks = avgMarksMap.get(classId) || 0;

      classPerformance.push({
        className: `${classRow.name}${classRow.section ? ` ${classRow.section}` : ''}`,
        avgMarks: Math.round(Number(avgMarks)),
        avgAttendance,
      });
    });
  }

  // 9. AI Insights from predictions
  const aiInsights: TeacherDashboardData['aiInsights'] = [];
  if (classIds.length > 0) {
    const predRows = await db
      .select({
        id: predictions.id,
        riskLevel: predictions.riskLevel,
        recommendations: predictions.recommendations,
        studentId: predictions.studentId,
      })
      .from(predictions)
      .leftJoin(students, eq(predictions.studentId, students.id))
      .where(inArray(students.classId, classIds))
      .orderBy(desc(predictions.predictionDate))
      .limit(5);

    for (const pred of predRows) {
      if (pred.recommendations) {
        aiInsights.push({
          id: pred.id.toString(),
          message: pred.recommendations,
          severity:
            pred.riskLevel === 'high'
              ? 'high'
              : pred.riskLevel === 'medium'
              ? 'medium'
              : 'low',
        });
      }
    }
  }

  // 10. Recent announcements (teacher-scoped notifications)
  const recentAnnouncementsRaw = await db
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
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      )
    )
    .orderBy(desc(notifications.createdAt))
    .limit(50);

  const uniqueAnnouncements: typeof recentAnnouncementsRaw = [];
  const seenAnnKeys = new Set<string>();
  for (const row of recentAnnouncementsRaw) {
    const key = `${row.title?.trim()}|||${row.message?.trim()}`;
    if (!seenAnnKeys.has(key)) {
      seenAnnKeys.add(key);
      uniqueAnnouncements.push(row);
    }
  }

  const recentAnnouncements = uniqueAnnouncements.slice(0, 5);

  return {
    kpis: {
      todaysClasses: todayEntries.length,
      pendingAttendance,
      pendingGrading,
      totalStudents,
    },
    todayTimetable,
    classPerformance,
    aiInsights,
    recentAnnouncements: recentAnnouncements.map((n) => ({
      id: n.id,
      title: n.title ?? 'Notification',
      message: n.message ?? '',
      priority: n.priority ?? 'medium',
      createdAt: n.createdAt ? new Date(n.createdAt).toISOString() : new Date().toISOString(),
    })),
    currentPeriod,
  };
}
