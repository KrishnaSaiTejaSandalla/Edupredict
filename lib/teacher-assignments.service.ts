import { db } from './db';
import {
  teachers,
  assignments,
  assignmentSubmissions,
  students,
  classes,
  subjects,
  teacherClassAssignments,
  teacherSubjectAssignments,
} from './schema';
import { eq, and, desc, sql, isNull, isNotNull, inArray } from 'drizzle-orm';
import { users } from './schema';

// ==================== TEACHER ASSIGNMENTS SERVICE ====================

export type AssignmentFilter = {
  search?: string;
  page?: number;
  pageSize?: number;
};

export async function getTeacherAssignments(teacherId: number, filter: AssignmentFilter = {}) {
  const { page = 1, pageSize = 12, search } = filter;
  const offset = (page - 1) * pageSize;

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

  if (assignedClassIds.length === 0 || assignedSubjectIds.length === 0) {
    return { items: [], total: 0, pages: 0 };
  }

  const rows = await db
    .select({
      id: assignments.id,
      title: assignments.title,
      description: assignments.description,
      dueDate: assignments.dueDate,
      maxMarks: assignments.maxMarks,
      classId: assignments.classId,
      subjectId: assignments.subjectId,
      createdAt: assignments.createdAt,
      className: classes.name,
      classSection: classes.section,
      subjectName: subjects.name,
    })
    .from(assignments)
    .leftJoin(classes, eq(assignments.classId, classes.id))
    .leftJoin(subjects, eq(assignments.subjectId, subjects.id))
    .where(
      and(
        eq(assignments.teacherId, teacherId),
        inArray(assignments.classId, assignedClassIds),
        inArray(assignments.subjectId, assignedSubjectIds)
      )
    )
    .orderBy(desc(assignments.dueDate));

  let filtered = rows;
  if (search) {
    const q = search.toLowerCase();
    filtered = rows.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        (r.subjectName ?? '').toLowerCase().includes(q)
    );
  }

  const total = filtered.length;
  const paginated = filtered.slice(offset, offset + pageSize);

  // Get submission counts for each assignment
  const withSubmissions = await Promise.all(
    paginated.map(async (a) => {
      // Total students in class
      const [totalStudentsRow] = await db
        .select({ count: sql<number>`count(*)` })
        .from(students)
        .where(eq(students.classId, a.classId));
      const totalStudents = Number(totalStudentsRow?.count || 0);

      // Submitted
      const [submittedRow] = await db
        .select({ count: sql<number>`count(*)` })
        .from(assignmentSubmissions)
        .where(eq(assignmentSubmissions.assignmentId, a.id));
      const submitted = Number(submittedRow?.count || 0);

      const submissionPct =
        totalStudents > 0 ? Math.round((submitted / totalStudents) * 100) : 0;

      return {
        id: a.id,
        title: a.title,
        description: a.description ?? '',
        // dueDate is a Date object — serialize
        dueDate: a.dueDate ? (a.dueDate instanceof Date ? a.dueDate.toISOString().split('T')[0] : String(a.dueDate)) : null,
        maxMarks: Number(a.maxMarks || 100),
        className: `${a.className ?? ''}${a.classSection ? ` ${a.classSection}` : ''}`,
        subjectName: a.subjectName ?? 'N/A',
        totalStudents,
        submitted,
        submissionPct,
        createdAt: a.createdAt ? new Date(a.createdAt).toISOString() : '',
      };
    })
  );

  return { items: withSubmissions, total, pages: Math.ceil(total / pageSize) };
}

export async function createAssignment(
  teacherId: number,
  data: {
    classId: number;
    subjectId: number;
    title: string;
    description?: string;
    dueDate: string;
    maxMarks?: number;
  }
) {
  await db.insert(assignments).values({
    teacherId,
    classId: data.classId,
    subjectId: data.subjectId,
    title: data.title,
    description: data.description || null,
    dueDate: new Date(data.dueDate + 'T00:00:00'),
    maxMarks: data.maxMarks?.toString() || null,
    updatedAt: new Date(),
  });
}

export async function deleteAssignment(id: number, teacherId: number) {
  // Verify ownership
  const [existing] = await db
    .select()
    .from(assignments)
    .where(and(eq(assignments.id, id), eq(assignments.teacherId, teacherId)))
    .limit(1);
  if (!existing) throw new Error('Assignment not found');
  await db.delete(assignments).where(eq(assignments.id, id));
}

export async function getSubmissions(assignmentId: number, page = 1, pageSize = 15) {
  const offset = (page - 1) * pageSize;

  const rows = await db
    .select({
      id: assignmentSubmissions.id,
      studentId: assignmentSubmissions.studentId,
      submittedAt: assignmentSubmissions.submittedAt,
      isLate: assignmentSubmissions.isLate,
      grade: assignmentSubmissions.grade,
      feedback: assignmentSubmissions.feedback,
      gradedAt: assignmentSubmissions.gradedAt,
      content: assignmentSubmissions.content,
      studentName: users.name,
      rollNumber: students.rollNumber,
    })
    .from(assignmentSubmissions)
    .leftJoin(students, eq(assignmentSubmissions.studentId, students.id))
    .leftJoin(users, eq(students.userId, users.id))
    .where(eq(assignmentSubmissions.assignmentId, assignmentId))
    .orderBy(desc(assignmentSubmissions.submittedAt));

  const total = rows.length;
  const items = rows.slice(offset, offset + pageSize).map((r) => ({
    id: r.id,
    studentName: r.studentName ?? 'Unknown',
    rollNumber: r.rollNumber ?? '',
    submittedAt: r.submittedAt ? new Date(r.submittedAt).toISOString() : '',
    isLate: r.isLate,
    grade: r.grade !== null ? Number(r.grade) : null,
    feedback: r.feedback ?? '',
    gradedAt: r.gradedAt ? new Date(r.gradedAt).toISOString() : null,
    content: r.content ?? '',
  }));

  return { items, total, pages: Math.ceil(total / pageSize) };
}

export async function gradeSubmission(
  submissionId: number,
  grade: number,
  feedback: string,
  gradedByUserId: number
) {
  await db
    .update(assignmentSubmissions)
    .set({
      grade: grade.toString(),
      feedback,
      gradedAt: new Date(),
      gradedBy: gradedByUserId,
      updatedAt: new Date(),
    })
    .where(eq(assignmentSubmissions.id, submissionId));
}

export async function getAssignmentAnalytics(assignmentId: number) {
  const subs = await db
    .select()
    .from(assignmentSubmissions)
    .where(eq(assignmentSubmissions.assignmentId, assignmentId));

  const total = subs.length;
  const graded = subs.filter((s) => s.grade !== null).length;
  const late = subs.filter((s) => s.isLate).length;
  const grades = subs.filter((s) => s.grade !== null).map((s) => Number(s.grade));
  const avgGrade = grades.length > 0 ? grades.reduce((a, b) => a + b, 0) / grades.length : 0;

  // Get assignment + class to find total students
  const [assignment] = await db
    .select({ classId: assignments.classId })
    .from(assignments)
    .where(eq(assignments.id, assignmentId))
    .limit(1);

  let totalStudents = 0;
  if (assignment) {
    const [r] = await db
      .select({ count: sql<number>`count(*)` })
      .from(students)
      .where(eq(students.classId, assignment.classId));
    totalStudents = Number(r?.count || 0);
  }

  const submissionRate = totalStudents > 0 ? Math.round((total / totalStudents) * 100) : 0;

  return {
    total,
    graded,
    late,
    avgGrade: Math.round(avgGrade * 10) / 10,
    submissionRate,
    totalStudents,
  };
}

export async function getTeacherClassSubjects(teacherId: number) {
  // Get assigned classes
  const classRows = await db
    .select({ classId: teacherClassAssignments.classId, className: classes.name, classSection: classes.section })
    .from(teacherClassAssignments)
    .leftJoin(classes, eq(teacherClassAssignments.classId, classes.id))
    .where(eq(teacherClassAssignments.teacherId, teacherId));

  // Get assigned subjects
  const subjectRows = await db
    .select({ subjectId: teacherSubjectAssignments.subjectId, subjectName: subjects.name })
    .from(teacherSubjectAssignments)
    .leftJoin(subjects, eq(teacherSubjectAssignments.subjectId, subjects.id))
    .where(eq(teacherSubjectAssignments.teacherId, teacherId));

  const classSubjects: { classId: number; subjectId: number; className: string; subjectName: string }[] = [];
  for (const c of classRows) {
    for (const s of subjectRows) {
      if (c.classId && s.subjectId) {
        classSubjects.push({
          classId: c.classId,
          subjectId: s.subjectId,
          className: `${c.className ?? ''}${c.classSection ? ` ${c.classSection}` : ''}`,
          subjectName: s.subjectName ?? 'N/A',
        });
      }
    }
  }

  return classSubjects;
}
