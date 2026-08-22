import { db } from './db';
import { broadcastNotification } from './realtime';
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
  // Normalize to YYYY-MM-DD string
  const dateStr = /^\d{4}-\d{2}-\d{2}$/.test(date.trim())
    ? date.trim()
    : new Date(date).toISOString().split('T')[0];
  return db
    .select()
    .from(attendance)
    .where(
      and(
        eq(attendance.classId, classId),
        eq(attendance.attendanceDate, dateStr as any)
      )
    );
}

export type AttendanceRecord = {
  studentId: number;
  status: 'present' | 'absent' | 'half_day' | 'leave';
  remarks?: string;
};

export async function markBulkAttendance(
  classId: number,
  subjectId: number | null,
  topicTaught: string,
  date: string,
  records: AttendanceRecord[],
  markedBy: number
) {
  if (records.length === 0) return;

  // Normalize date to YYYY-MM-DD string (avoid JS Date locale serialization issues with MySQL)
  const normalizeDate = (d: string): string => {
    // Strip time zone artifacts if any — ensure we get a clean YYYY-MM-DD
    const raw = d.trim();
    // If already YYYY-MM-DD, return as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    // Otherwise parse and reformat
    const parsed = new Date(raw);
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const dateStr = normalizeDate(date);

  await db
    .delete(attendance)
    .where(
      and(
        eq(attendance.classId, classId),
        eq(attendance.attendanceDate, dateStr as any)
      )
    );

  await db.insert(attendance).values(
    records.map((r) => ({
      studentId: r.studentId,
      classId,
      subjectId: subjectId || null,
      topicTaught,
      attendanceDate: dateStr as any,
      status: r.status,
      remarks: r.remarks || null,
      markedBy,
      updatedAt: new Date(),
    }))
  );

  // Generate isolated notifications for parents and students
  try {
    const { inArray } = await import('drizzle-orm');
    const { students, studentParents, parents, notifications, users } = await import('./schema');

    const studentIds = records.map((r) => r.studentId);
    if (studentIds.length > 0) {
      const studentUsers = await db
        .select({ id: students.id, userId: students.userId, name: users.name })
        .from(students)
        .leftJoin(users, eq(students.userId, users.id))
        .where(inArray(students.id, studentIds));

      const parentUsers = await db
        .select({ studentId: studentParents.studentId, parentUserId: parents.userId })
        .from(studentParents)
        .leftJoin(parents, eq(studentParents.parentId, parents.id))
        .where(inArray(studentParents.studentId, studentIds));

      const studentUserMap: Record<number, { userId: number; name: string }> = {};
      studentUsers.forEach((su) => {
        if (su.userId) {
          studentUserMap[su.id] = { userId: su.userId, name: su.name ?? "Student" };
        }
      });

      const parentUserMap: Record<number, number[]> = {};
      parentUsers.forEach((pu) => {
        if (pu.parentUserId && pu.studentId) {
          if (!parentUserMap[pu.studentId]) parentUserMap[pu.studentId] = [];
          parentUserMap[pu.studentId].push(pu.parentUserId);
        }
      });

      // Get preferences of all these users to respect user configuration
      const allUserIds = [
        ...studentUsers.map((su) => su.userId).filter((id): id is number => id !== null),
        ...parentUsers.map((pu) => pu.parentUserId).filter((id): id is number => id !== null),
      ];

      const userPrefsMap: Record<number, any> = {};
      if (allUserIds.length > 0) {
        const userPrefsRows = await db
          .select({ id: users.id, notificationPreferences: users.notificationPreferences })
          .from(users)
          .where(inArray(users.id, allUserIds));

        userPrefsRows.forEach((row) => {
          try {
            userPrefsMap[row.id] = row.notificationPreferences ? JSON.parse(row.notificationPreferences) : {};
          } catch {
            userPrefsMap[row.id] = {};
          }
        });
      }

      const notifValues: any[] = [];

      records.forEach((r) => {
        const studentInfo = studentUserMap[r.studentId];
        const statusStr = r.status === "present"
          ? "Present"
          : r.status === "half_day"
          ? "Half Day"
          : r.status === "leave"
          ? "on Leave"
          : "Absent";

        if (studentInfo) {
          // Check student preferences
          const studentPrefs = userPrefsMap[studentInfo.userId] ?? {};
          if (studentPrefs.attendance !== false) {
            // Student Notification
            notifValues.push({
              userId: studentInfo.userId,
              title: "Attendance Marked",
              message: `You have been marked ${statusStr} on ${dateStr}.`,
              type: "attendance",
              priority: (r.status === "absent" || r.status === "leave") ? "high" : "low",
              isRead: false,
            });
          }

          // Parent Notification
          const parentsList = parentUserMap[r.studentId] || [];
          parentsList.forEach((parentUserId) => {
            const parentPrefs = userPrefsMap[parentUserId] ?? {};
            if (parentPrefs.attendance !== false) {
              notifValues.push({
                userId: parentUserId,
                title: "Attendance Marked",
                message: `Your child ${studentInfo.name} has been marked ${statusStr} on ${dateStr}.`,
                type: "attendance",
                priority: r.status === "absent" ? "high" : "low",
                isRead: false,
              });
            }
          });
        }
      });

      if (notifValues.length > 0) {
        const chunkSize = 200;
        for (let i = 0; i < notifValues.length; i += chunkSize) {
          await db.insert(notifications).values(notifValues.slice(i, i + chunkSize));
        }
        // Broadcast in real-time
        for (const val of notifValues) {
          broadcastNotification(val.userId, {
            title: val.title,
            message: val.message,
            type: val.type,
            priority: val.priority,
          });
        }
      }
    }
  } catch (err) {
    console.error("Failed to generate attendance notifications:", err);
  }
}

export async function getAttendanceHistory(
  teacherId: number,
  classId?: number | number[],
  startDate?: string,
  endDate?: string
) {
  const classRows = await getTeacherClasses(teacherId);
  const teacherClassIds = classRows.map((c) => c.classId);

  if (teacherClassIds.length === 0) return [];

  const conditions: any[] = [inArray(attendance.classId, teacherClassIds)];

  if (classId) {
    if (Array.isArray(classId)) {
      if (classId.length > 0) {
        conditions.push(inArray(attendance.classId, classId));
      } else {
        return [];
      }
    } else {
      conditions.push(eq(attendance.classId, classId));
    }
  }
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