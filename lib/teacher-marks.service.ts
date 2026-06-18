import { db } from './db';
import {
  teachers,
  students,
  exams,
  results,
  subjects,
  classes,
  teacherClassAssignments,
  teacherSubjectAssignments,
} from './schema';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { users } from './schema';

// ==================== TEACHER MARKS SERVICE ====================

export async function getTeacherExams(teacherId: number) {
  // Get assigned classes for the teacher
  const classRows = await db
    .select({ classId: teacherClassAssignments.classId })
    .from(teacherClassAssignments)
    .where(eq(teacherClassAssignments.teacherId, teacherId));
  const assignedClassIds = classRows.map((r) => r.classId);

  // Get assigned subjects for the teacher
  const subjectRows = await db
    .select({ subjectId: teacherSubjectAssignments.subjectId })
    .from(teacherSubjectAssignments)
    .where(eq(teacherSubjectAssignments.teacherId, teacherId));
  const assignedSubjectIds = subjectRows.map((r) => r.subjectId);

  if (assignedClassIds.length === 0 || assignedSubjectIds.length === 0) return [];

  const examRows = await db
    .select({
      id: exams.id,
      name: exams.name,
      examDate: exams.examDate,
      maxMarks: exams.maxMarks,
      type: exams.type,
      classId: exams.classId,
      subjectId: exams.subjectId,
      className: classes.name,
      classSection: classes.section,
      subjectName: subjects.name,
    })
    .from(exams)
    .leftJoin(classes, eq(exams.classId, classes.id))
    .leftJoin(subjects, eq(exams.subjectId, subjects.id))
    .where(
      and(
        inArray(exams.classId, assignedClassIds),
        inArray(exams.subjectId, assignedSubjectIds),
        eq(exams.isArchived, false)
      )
    );

  return examRows.map((r) => ({
    id: r.id,
    name: r.name,
    // examDate is a Date object from drizzle — convert to string
    examDate: r.examDate ? (r.examDate instanceof Date ? r.examDate.toISOString().split('T')[0] : String(r.examDate)) : null,
    maxMarks: Number(r.maxMarks),
    type: r.type ?? 'exam',
    classId: r.classId,
    subjectId: r.subjectId,
    className: `${r.className ?? ''}${r.classSection ? ` ${r.classSection}` : ''}`,
    subjectName: r.subjectName ?? 'N/A',
  }));
}

export async function getStudentsForExam(examId: number) {
  const [exam] = await db.select().from(exams).where(eq(exams.id, examId)).limit(1);
  if (!exam) return [];

  const studentRows = await db
    .select({
      id: students.id,
      rollNumber: students.rollNumber,
      name: users.name,
    })
    .from(students)
    .leftJoin(users, eq(students.userId, users.id))
    .where(eq(students.classId, exam.classId))
    .orderBy(students.rollNumber);

  // Fetch existing results for this exam
  const existingResults = await db
    .select()
    .from(results)
    .where(eq(results.examId, examId));

  return studentRows.map((s) => {
    const existing = existingResults.find((r) => r.studentId === s.id);
    return {
      id: s.id,
      name: s.name ?? 'Unknown',
      rollNumber: s.rollNumber ?? '',
      existingMarks: existing ? Number(existing.marks) : null,
      resultId: existing?.id ?? null,
      remarks: existing?.remarks ?? '',
    };
  });
}

export async function enterMarks(
  examId: number,
  subjectId: number,
  marksData: { studentId: number; marks: number; remarks?: string }[]
) {
  const today = new Date().toISOString().split('T')[0];

  for (const entry of marksData) {
    const existing = await db
      .select({ id: results.id })
      .from(results)
      .where(and(eq(results.studentId, entry.studentId), eq(results.examId, examId)))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(results)
        .set({
          marks: entry.marks.toString(),
          remarks: entry.remarks || null,
          updatedAt: new Date(),
        })
        .where(eq(results.id, existing[0].id));
    } else {
      // recordedDate is date() type — pass Date object
      await db.insert(results).values({
        studentId: entry.studentId,
        examId,
        subjectId,
        marks: entry.marks.toString(),
        remarks: entry.remarks || null,
        recordedDate: new Date(),
        updatedAt: new Date(),
      });
    }
  }
}

export type ResultFilter = {
  classId?: number;
  subjectId?: number;
  examType?: string;
  search?: string;
  page?: number;
  pageSize?: number;
};

export async function getTeacherResults(teacherId: number, filter: ResultFilter = {}) {
  const { page = 1, pageSize = 15, search, classId, subjectId, examType } = filter;
  const offset = (page - 1) * pageSize;

  // Get teacher's assigned classes and subjects
  const classRows = await db
    .select({ classId: teacherClassAssignments.classId })
    .from(teacherClassAssignments)
    .where(eq(teacherClassAssignments.teacherId, teacherId));
  const assignedClassIds = classRows.map((r) => r.classId);

  const subjectRows = await db
    .select({ subjectId: teacherSubjectAssignments.subjectId })
    .from(teacherSubjectAssignments)
    .where(eq(teacherSubjectAssignments.teacherId, teacherId));
  const assignedSubjectIds = subjectRows.map((r) => r.subjectId);

  if (assignedClassIds.length === 0 || assignedSubjectIds.length === 0) {
    return { items: [], total: 0, pages: 0 };
  }

  // Build result rows for teacher's subjects
  const allRows = await db
    .select({
      id: results.id,
      marks: results.marks,
      recordedDate: results.recordedDate,
      remarks: results.remarks,
      studentId: results.studentId,
      examId: results.examId,
      subjectId: results.subjectId,
      studentName: users.name,
      rollNumber: students.rollNumber,
      examName: exams.name,
      examType: exams.type,
      classId: students.classId,
      className: classes.name,
      classSection: classes.section,
      subjectName: subjects.name,
      maxMarks: exams.maxMarks,
    })
    .from(results)
    .leftJoin(students, eq(results.studentId, students.id))
    .leftJoin(users, eq(students.userId, users.id))
    .leftJoin(exams, eq(results.examId, exams.id))
    .leftJoin(classes, eq(students.classId, classes.id))
    .leftJoin(subjects, eq(results.subjectId, subjects.id))
    .where(
      and(
        inArray(students.classId, assignedClassIds),
        inArray(results.subjectId, assignedSubjectIds)
      )
    )
    .orderBy(desc(results.recordedDate));

  let filtered = allRows;

  if (classId) filtered = filtered.filter((r) => r.classId === classId);
  if (subjectId) filtered = filtered.filter((r) => r.subjectId === subjectId);
  if (examType) filtered = filtered.filter((r) => r.examType === examType);
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (r) =>
        (r.studentName ?? '').toLowerCase().includes(q) ||
        (r.rollNumber ?? '').toLowerCase().includes(q)
    );
  }

  const total = filtered.length;
  const items = filtered.slice(offset, offset + pageSize).map((r) => ({
    id: r.id,
    studentName: r.studentName ?? 'Unknown',
    rollNumber: r.rollNumber ?? '',
    className: `${r.className ?? ''}${r.classSection ? ` ${r.classSection}` : ''}`,
    subjectName: r.subjectName ?? 'N/A',
    examName: r.examName ?? 'N/A',
    examType: r.examType ?? 'exam',
    marks: Number(r.marks),
    maxMarks: Number(r.maxMarks || 100),
    recordedDate: r.recordedDate,
    remarks: r.remarks ?? '',
  }));

  return { items, total, pages: Math.ceil(total / pageSize) };
}

export async function updateMark(resultId: number, marks: number, remarks?: string) {
  await db
    .update(results)
    .set({ marks: marks.toString(), remarks: remarks || null, updatedAt: new Date() })
    .where(eq(results.id, resultId));
}

export async function getEditableMarks(teacherId: number, page = 1, pageSize = 15) {
  return getTeacherResults(teacherId, { page, pageSize });
}
