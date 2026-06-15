'use server';

import { db } from './db';
import { timetables, classes, subjects, teachers, users } from './schema';
import { eq, and, or, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { createNotification } from './notification-actions';
import { parseDbError } from './db-errors';
import { logAudit } from './audit-utils';
import { getCurrentUser } from './auth';

// ==================== TIMETABLE ACTIONS ====================

/**
 * Checks for scheduling conflicts: teacher, class, or room overlaps
 * in the same day/time slot within the same school.
 */
async function checkTimetableConflicts(
  schoolId: number,
  dayOfWeek: string,
  startTime: string,
  endTime: string,
  classId: number,
  teacherId: number,
  roomNumber: string,
  excludeId?: number
) {
  const conflicts: string[] = [];

  // Build base condition: same school, same day, overlapping time
  // Time overlap: existing.start < new.end AND existing.end > new.start
  const baseConditions = [
    eq(timetables.schoolId, schoolId),
    eq(timetables.dayOfWeek, dayOfWeek),
    sql`${timetables.startTime} < ${endTime}`,
    sql`${timetables.endTime} > ${startTime}`,
  ];

  if (excludeId) {
    baseConditions.push(sql`${timetables.id} != ${excludeId}`);
  }

  // Check teacher conflict
  const teacherConflict = await db
    .select({ id: timetables.id })
    .from(timetables)
    .where(and(...baseConditions, eq(timetables.teacherId, teacherId)))
    .limit(1);

  if (teacherConflict.length > 0) {
    conflicts.push('This teacher is already assigned to another class at this time.');
  }

  // Check class conflict
  const classConflict = await db
    .select({ id: timetables.id })
    .from(timetables)
    .where(and(...baseConditions, eq(timetables.classId, classId)))
    .limit(1);

  if (classConflict.length > 0) {
    conflicts.push('This class already has a session scheduled at this time.');
  }

  // Check room conflict
  const roomConflict = await db
    .select({ id: timetables.id })
    .from(timetables)
    .where(and(...baseConditions, eq(timetables.roomNumber, roomNumber)))
    .limit(1);

  if (roomConflict.length > 0) {
    conflicts.push('This room is already booked at this time.');
  }

  return conflicts;
}

export async function createTimetableEntry(data: {
  classId: number;
  subjectId: number;
  teacherId: number;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  roomNumber: string;
}) {
  if (!data.classId) throw new Error('Please select a class.');
  if (!data.subjectId) throw new Error('Please select a subject.');
  if (!data.teacherId) throw new Error('Please select a teacher.');
  if (!data.dayOfWeek) throw new Error('Please select a day.');
  if (!data.startTime || !data.endTime) throw new Error('Please specify start and end times.');
  if (data.startTime >= data.endTime) throw new Error('End time must be after start time.');
  if (!data.roomNumber) throw new Error('Please enter a room number.');

  const user = await getCurrentUser();
  const schoolId = user?.school?.id ?? 1;

  // Validate teacher department matches subject name
  const [teacherRow] = await db.select().from(teachers).where(eq(teachers.id, data.teacherId)).limit(1);
  const [subjectRow] = await db.select().from(subjects).where(eq(subjects.id, data.subjectId)).limit(1);
  if (!teacherRow || !subjectRow || !teacherRow.department || !subjectRow.name || teacherRow.department.trim().toLowerCase() !== subjectRow.name.trim().toLowerCase()) {
    throw new Error("Teacher not assigned to subject");
  }

  // Check for scheduling conflicts
  const conflicts = await checkTimetableConflicts(
    schoolId,
    data.dayOfWeek,
    data.startTime,
    data.endTime,
    data.classId,
    data.teacherId,
    data.roomNumber
  );

  if (conflicts.length > 0) {
    throw new Error("Timetable conflict detected for selected period");
  }

  let insertedId: number;
  try {
    const result = await db.insert(timetables).values({
      schoolId,
      classId: data.classId,
      subjectId: data.subjectId,
      teacherId: data.teacherId,
      dayOfWeek: data.dayOfWeek,
      startTime: data.startTime,
      endTime: data.endTime,
      roomNumber: data.roomNumber,
      updatedAt: new Date(),
    });
    insertedId = Number(result[0].insertId);
  } catch (err) {
    throw new Error(parseDbError(err));
  }

  await createNotification(
    'Timetable Updated',
    `A new timetable entry has been added for ${data.dayOfWeek} (${data.startTime} - ${data.endTime}).`,
    'info',
    'medium'
  );

  await logAudit('CREATE_TIMETABLE', 'timetable', insertedId, `Created timetable entry: ${data.dayOfWeek} ${data.startTime}-${data.endTime}, Room ${data.roomNumber}`, schoolId);

  revalidatePath('/admin/timetable');
  revalidatePath('/admin');
}

export async function updateTimetableEntry(
  id: number,
  data: {
    classId: number;
    subjectId: number;
    teacherId: number;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    roomNumber: string;
  }
) {
  if (!data.classId) throw new Error('Please select a class.');
  if (!data.subjectId) throw new Error('Please select a subject.');
  if (!data.teacherId) throw new Error('Please select a teacher.');
  if (!data.dayOfWeek) throw new Error('Please select a day.');
  if (!data.startTime || !data.endTime) throw new Error('Please specify start and end times.');
  if (data.startTime >= data.endTime) throw new Error('End time must be after start time.');
  if (!data.roomNumber) throw new Error('Please enter a room number.');

  const user = await getCurrentUser();
  const schoolId = user?.school?.id ?? 1;

  // Validate teacher department matches subject name
  const [teacherRow] = await db.select().from(teachers).where(eq(teachers.id, data.teacherId)).limit(1);
  const [subjectRow] = await db.select().from(subjects).where(eq(subjects.id, data.subjectId)).limit(1);
  if (!teacherRow || !subjectRow || !teacherRow.department || !subjectRow.name || teacherRow.department.trim().toLowerCase() !== subjectRow.name.trim().toLowerCase()) {
    throw new Error("Teacher not assigned to subject");
  }

  // Check for scheduling conflicts, excluding current entry
  const conflicts = await checkTimetableConflicts(
    schoolId,
    data.dayOfWeek,
    data.startTime,
    data.endTime,
    data.classId,
    data.teacherId,
    data.roomNumber,
    id
  );

  if (conflicts.length > 0) {
    throw new Error("Timetable conflict detected for selected period");
  }

  try {
    await db
      .update(timetables)
      .set({
        classId: data.classId,
        subjectId: data.subjectId,
        teacherId: data.teacherId,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
        roomNumber: data.roomNumber,
        updatedAt: new Date(),
      })
      .where(eq(timetables.id, id));
  } catch (err) {
    throw new Error(parseDbError(err));
  }

  await createNotification(
    'Timetable Updated',
    `Timetable entry updated for ${data.dayOfWeek} (${data.startTime} - ${data.endTime}).`,
    'info',
    'medium'
  );

  await logAudit('UPDATE_TIMETABLE', 'timetable', id, `Updated timetable entry: ${data.dayOfWeek} ${data.startTime}-${data.endTime}, Room ${data.roomNumber}`, schoolId);

  revalidatePath('/admin/timetable');
  revalidatePath('/admin');
}

export async function deleteTimetableEntry(id: number) {
  const [entry] = await db.select().from(timetables).where(eq(timetables.id, id)).limit(1);

  try {
    await db.delete(timetables).where(eq(timetables.id, id));
  } catch (err) {
    throw new Error(parseDbError(err));
  }

  const desc = entry
    ? `${entry.dayOfWeek} ${entry.startTime}-${entry.endTime} Room ${entry.roomNumber}`
    : 'Unknown';

  await createNotification('Timetable Entry Deleted', `Timetable entry (${desc}) has been removed.`, 'info', 'medium');
  await logAudit('DELETE_TIMETABLE', 'timetable', id, `Deleted timetable entry: ${desc}`);

  revalidatePath('/admin/timetable');
  revalidatePath('/admin');
}

export async function getAllTimetableEntries() {
  const rows = await db
    .select({
      entry: timetables,
      className: classes.name,
      classSection: classes.section,
      subjectName: subjects.name,
      teacherUserId: teachers.userId,
    })
    .from(timetables)
    .leftJoin(classes, eq(timetables.classId, classes.id))
    .leftJoin(subjects, eq(timetables.subjectId, subjects.id))
    .leftJoin(teachers, eq(timetables.teacherId, teachers.id));

  // Get teacher names from users table
  const teacherUserIds = rows
    .map((r) => r.teacherUserId)
    .filter((id): id is number => id !== null);

  let teacherNameMap: Record<number, string> = {};
  if (teacherUserIds.length > 0) {
    const uniqueIds = [...new Set(teacherUserIds)];
    const userRows = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(
        sql`${users.id} in (${sql.join(
          uniqueIds.map((id) => sql`${id}`),
          sql`, `
        )})`
      );
    userRows.forEach((u) => {
      teacherNameMap[u.id] = u.name;
    });
  }

  return rows.map((r: any) => ({
    ...r.entry,
    className: r.className ? `${r.className}${r.classSection ? ` ${r.classSection}` : ''}` : 'N/A',
    subjectName: r.subjectName || 'N/A',
    teacherName: r.teacherUserId ? (teacherNameMap[r.teacherUserId] || 'N/A') : 'N/A',
  }));
}

export async function getTimetableByClass(classId: number) {
  const rows = await db
    .select({
      entry: timetables,
      subjectName: subjects.name,
      teacherUserId: teachers.userId,
    })
    .from(timetables)
    .leftJoin(subjects, eq(timetables.subjectId, subjects.id))
    .leftJoin(teachers, eq(timetables.teacherId, teachers.id))
    .where(eq(timetables.classId, classId));

  const teacherUserIds = rows
    .map((r) => r.teacherUserId)
    .filter((id): id is number => id !== null);

  let teacherNameMap: Record<number, string> = {};
  if (teacherUserIds.length > 0) {
    const uniqueIds = [...new Set(teacherUserIds)];
    const userRows = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(
        sql`${users.id} in (${sql.join(
          uniqueIds.map((id) => sql`${id}`),
          sql`, `
        )})`
      );
    userRows.forEach((u) => {
      teacherNameMap[u.id] = u.name;
    });
  }

  return rows.map((r: any) => ({
    ...r.entry,
    subjectName: r.subjectName || 'N/A',
    teacherName: r.teacherUserId ? (teacherNameMap[r.teacherUserId] || 'N/A') : 'N/A',
  }));
}

export async function getTimetableByTeacher(teacherId: number) {
  const rows = await db
    .select({
      entry: timetables,
      className: classes.name,
      classSection: classes.section,
      subjectName: subjects.name,
    })
    .from(timetables)
    .leftJoin(classes, eq(timetables.classId, classes.id))
    .leftJoin(subjects, eq(timetables.subjectId, subjects.id))
    .where(eq(timetables.teacherId, teacherId));

  return rows.map((r: any) => ({
    ...r.entry,
    className: r.className ? `${r.className}${r.classSection ? ` ${r.classSection}` : ''}` : 'N/A',
    subjectName: r.subjectName || 'N/A',
  }));
}

export async function getAllTeachers() {
  const rows = await db
    .select({
      id: teachers.id,
      name: users.name,
      employeeId: teachers.employeeId,
    })
    .from(teachers)
    .innerJoin(users, eq(users.id, teachers.userId));
  return rows;
}

/**
 * Get teachers whose department matches the selected subject's name.
 * e.g. Subject "Mathematics" → teachers with department "Mathematics".
 * Returns empty array if no matching teachers found (does NOT fall back).
 */
export async function getTeachersBySubject(subjectId: number) {
  if (!subjectId) return [];

  // First, get the subject name
  const [subject] = await db
    .select({ name: subjects.name })
    .from(subjects)
    .where(eq(subjects.id, subjectId))
    .limit(1);

  if (!subject) return [];

  // Find teachers whose department matches the subject name
  const rows = await db
    .select({
      id: teachers.id,
      name: users.name,
      employeeId: teachers.employeeId,
    })
    .from(teachers)
    .innerJoin(users, eq(users.id, teachers.userId))
    .where(eq(teachers.department, subject.name));

  return rows;
}
