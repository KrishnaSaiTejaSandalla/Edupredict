import { db } from './db';
import {
  teachers,
  students,
  attendance,
  classes,
  classSubjects,
} from './schema';
import { eq, and, gte, lte, desc, sql, inArray } from 'drizzle-orm';
import { users } from './schema';

// ==================== TEACHER ATTENDANCE SERVICE ====================

export async function getTeacherClasses(teacherId: number) {
  const rows = await db
    .select({
      classId: classSubjects.classId,
      className: classes.name,
      classSection: classes.section,
    })
    .from(classSubjects)
    .leftJoin(classes, eq(classSubjects.classId, classes.id))
    .where(eq(classSubjects.teacherId, teacherId))
    .groupBy(classSubjects.classId, classes.name, classes.section);

  return rows
    .map((r) => ({
      classId: r.classId,
      className: r.className
        ? `${r.className}${r.classSection ? ` ${r.classSection}` : ''}`
        : 'N/A',
    }))
    .sort((a, b) => {
      const gradeA = parseInt(a.className) || 0;
      const gradeB = parseInt(b.className) || 0;
      if (gradeA !== gradeB) return gradeA - gradeB;
      return a.className.localeCompare(b.className);
    });
}

export async function getStudentsByClass(classId: number) {
  const rows = await db
    .select({
      id: students.id,
      userId: students.userId,
      rollNumber: students.rollNumber,
      gender: students.gender,
      name: users.name,
      profileImageUrl: users.profileImageUrl,
    })
    .from(students)
    .leftJoin(users, eq(students.userId, users.id))
    .where(eq(students.classId, classId))
    .orderBy(students.rollNumber);

  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    name: r.name ?? 'Unknown',
    rollNumber: r.rollNumber ?? '',
    gender: r.gender ?? '',
    profileImageUrl: r.profileImageUrl ?? null,
  }));
}

export async function getAttendanceForDate(classId: number, date: string) {
  const dateObj = new Date(date + 'T00:00:00');
  return db
    .select()
    .from(attendance)
    .where(
      and(
        eq(attendance.classId, classId),
        eq(attendance.attendanceDate, dateObj)
      )
    );
}

export type AttendanceRecord = {
  studentId: number;
  status: 'present' | 'absent' | 'leave';
  remarks?: string;
};

export async function markBulkAttendance(
  classId: number,
  subjectId: number,
  topicTaught: string,
  date: string,
  records: AttendanceRecord[],
  markedBy: number
) {
  if (records.length === 0) return;

  const dateObj = new Date(date + 'T00:00:00');

  await db
    .delete(attendance)
    .where(
      and(
        eq(attendance.classId, classId),
        eq(attendance.attendanceDate, dateObj)
      )
    );

  await db.insert(attendance).values(
    records.map((r) => ({
      studentId: r.studentId,
      classId,
      subjectId,
      topicTaught,
      attendanceDate: dateObj,
      status: r.status,
      remarks: r.remarks || null,
      markedBy,
      updatedAt: new Date(),
    }))
  );
}

export async function getAttendanceHistory(
  teacherId: number,
  classId?: number,
  startDate?: string,
  endDate?: string
) {
  const classRows = await getTeacherClasses(teacherId);
  const teacherClassIds = classRows.map((c) => c.classId);

  if (teacherClassIds.length === 0) return [];

  const conditions: any[] = [inArray(attendance.classId, teacherClassIds)];

  if (classId) conditions.push(eq(attendance.classId, classId));
  if (startDate) {
    const startObj = new Date(startDate + 'T00:00:00');
    conditions.push(gte(attendance.attendanceDate, startObj));
  }
  if (endDate) {
    const endObj = new Date(endDate + 'T23:59:59');
    conditions.push(lte(attendance.attendanceDate, endObj));
  }

  const rows = await db
    .select({
      id: attendance.id,
      studentId: attendance.studentId,
      classId: attendance.classId,
      attendanceDate: attendance.attendanceDate,
      status: attendance.status,
      remarks: attendance.remarks,
      studentName: users.name,
      rollNumber: students.rollNumber,
      className: classes.name,
      classSection: classes.section,
    })
    .from(attendance)
    .leftJoin(students, eq(attendance.studentId, students.id))
    .leftJoin(users, eq(students.userId, users.id))
    .leftJoin(classes, eq(attendance.classId, classes.id))
    .where(and(...conditions))
    .orderBy(desc(attendance.attendanceDate))
    .limit(200);

  return rows.map((r) => ({
    id: r.id,
    studentName: r.studentName ?? 'Unknown',
    rollNumber: r.rollNumber ?? '',
    className: `${r.className ?? ''}${r.classSection ? ` ${r.classSection}` : ''}`,
    date: r.attendanceDate
      ? (typeof r.attendanceDate === 'string'
          ? r.attendanceDate
          : new Date(r.attendanceDate).toISOString().split('T')[0])
      : '',
    status: r.status,
    remarks: r.remarks,
  }));
}

export async function getAttendanceKPIs(teacherId: number) {
  const classRows = await getTeacherClasses(teacherId);
  const classIds = classRows.map((c) => c.classId);

  if (classIds.length === 0) {
    return { presentPct: 0, absentPct: 0, leavePct: 0, atRiskPct: 0, totalStudents: 0 };
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [totalRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(attendance)
    .where(
      and(
        inArray(attendance.classId, classIds),
        gte(attendance.attendanceDate, thirtyDaysAgo)
      )
    );

  const [presentRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(attendance)
    .where(
      and(
        inArray(attendance.classId, classIds),
        gte(attendance.attendanceDate, thirtyDaysAgo),
        eq(attendance.status, 'present')
      )
    );

  const [absentRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(attendance)
    .where(
      and(
        inArray(attendance.classId, classIds),
        gte(attendance.attendanceDate, thirtyDaysAgo),
        eq(attendance.status, 'absent')
      )
    );

  const [leaveRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(attendance)
    .where(
      and(
        inArray(attendance.classId, classIds),
        gte(attendance.attendanceDate, thirtyDaysAgo),
        eq(attendance.status, 'leave')
      )
    );

  const [totalStudentsRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(students)
    .where(inArray(students.classId, classIds));

  const total = Number(totalRow?.count || 0);
  const present = Number(presentRow?.count || 0);
  const absent = Number(absentRow?.count || 0);
  const leaveCount = Number(leaveRow?.count || 0);
  const totalStudents = Number(totalStudentsRow?.count || 0);

  // At-risk: students with <75% attendance (excluding leave)
  let atRiskCount = 0;
  if (total > 0) {
    const studentAttRows = await db
      .select({
        studentId: attendance.studentId,
        total: sql<number>`count(*)`,
        present: sql<number>`SUM(CASE WHEN ${attendance.status} = 'present' THEN 1 ELSE 0 END)`,
      })
      .from(attendance)
      .where(
        and(
          inArray(attendance.classId, classIds),
          gte(attendance.attendanceDate, thirtyDaysAgo)
        )
      )
      .groupBy(attendance.studentId);

    atRiskCount = studentAttRows.filter((r) => {
      const pct = Number(r.total) > 0 
        ? Number(r.present) / Number(r.total) * 100 
        : 0;
      return pct < 75;
    }).length;
  }

  return {
    presentPct: total > 0 ? Math.round((present / total) * 100) : 0,
    absentPct: total > 0 ? Math.round((absent / total) * 100) : 0,
    leavePct: total > 0 ? Math.round((leaveCount / total) * 100) : 0,
    atRiskPct: totalStudents > 0 ? Math.round((atRiskCount / totalStudents) * 100) : 0,
    totalStudents,
  };
}