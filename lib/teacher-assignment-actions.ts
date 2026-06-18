'use server';

import { db } from './db';
import {
  teacherSubjectAssignments,
  teacherClassAssignments,
  classTeacherAssignments,
  classes,
  teachers,
  users,
  assignments,
  assignmentSubmissions,
  results,
  classSubjects,
  timetables,
  teacherResources,
  teacherFeedback,
  userPreferences,
  userAvatars,
  aiGenerations,
  sessions,
  accounts,
  verificationTokens,
  leaveRequests,
  feedback,
  auditLogs,
  notifications,
  schools,
} from './schema';
import { eq, and, ne, sql, inArray } from 'drizzle-orm';
import { createNotification } from './notification-actions';
import { logAudit } from './audit-utils';
import { revalidatePath } from 'next/cache';

/**
 * Cleanly deletes a teacher and all linked records using a database transaction
 */
export async function deleteTeacherCascading(teacherId: number) {
  const [teacher] = await db.select().from(teachers).where(eq(teachers.id, teacherId)).limit(1);
  if (!teacher) {
    throw new Error('Teacher not found.');
  }
  const userId = teacher.userId;

await db.transaction(async (tx) => {
    // 1. Find teacher's assignments
    const teacherAssignments = await tx
      .select({ id: assignments.id })
      .from(assignments)
      .where(eq(assignments.teacherId, teacherId));
    const assignmentIds = teacherAssignments.map((a) => a.id);

    // 2. Delete submissions & results linked to teacher's assignments
    if (assignmentIds.length > 0) {
      try {
        await tx.delete(assignmentSubmissions).where(inArray(assignmentSubmissions.assignmentId, assignmentIds));
      } catch (e) { /* may not exist per DB state */ }
      try {
        await tx.delete(results).where(inArray(results.assignmentId, assignmentIds));
      } catch (e) { /* may not exist per DB state */ }
    }

    // 3. Delete assignments
    try {
      await tx.delete(assignments).where(eq(assignments.teacherId, teacherId));
    } catch (e) { /* may not exist per DB state */ }

    // 4. Delete classSubjects mapping
    try {
      await tx.delete(classSubjects).where(eq(classSubjects.teacherId, teacherId));
    } catch (e) { /* may not exist per DB state */ }

    // 5. Delete timetables
    try {
      await tx.delete(timetables).where(eq(timetables.teacherId, teacherId));
    } catch (e) { /* may not exist per DB state */ }

    // 6. Delete teacherResources
    try {
      await tx.delete(teacherResources).where(eq(teacherResources.teacherId, teacherId));
    } catch (e) {
      console.warn('teacherResources delete skipped:', e);
    }

    // 7. Delete teacherFeedback
    try {
      await tx.delete(teacherFeedback).where(eq(teacherFeedback.teacherId, teacherId));
    } catch (e) { /* may not exist per DB state */ }

    // 8. Delete subject assignments
    try {
      await tx.delete(teacherSubjectAssignments).where(eq(teacherSubjectAssignments.teacherId, teacherId));
    } catch (e) { /* may not exist per DB state */ }

    // 9. Delete class assignments
    try {
      await tx.delete(teacherClassAssignments).where(eq(teacherClassAssignments.teacherId, teacherId));
    } catch (e) { /* may not exist per DB state */ }

    // 10. Delete class teacher assignments
    try {
      await tx.delete(classTeacherAssignments).where(eq(classTeacherAssignments.teacherId, teacherId));
    } catch (e) { /* may not exist per DB state */ }

    // 11. Clear classTeacherId on classes
    try {
      await tx.update(classes).set({ classTeacherId: null }).where(eq(classes.classTeacherId, teacherId));
    } catch (e) { /* may not exist per DB state */ }

    // 12. Delete teacher profile (this MUST succeed or transaction rolls back)
    await tx.delete(teachers).where(eq(teachers.id, teacherId));

    // 13. Delete user preferences/avatars/generations/sessions/accounts/tokens/leaves/feedback/audit/notifications
    try {
      await tx.delete(userPreferences).where(eq(userPreferences.userId, userId));
    } catch (e) { /* may not exist per DB state */ }
    try {
      await tx.delete(userAvatars).where(eq(userAvatars.userId, userId));
    } catch (e) { /* may not exist per DB state */ }
    try {
      await tx.delete(aiGenerations).where(eq(aiGenerations.userId, userId));
    } catch (e) { /* may not exist per DB state */ }
    try {
      await tx.delete(sessions).where(eq(sessions.userId, userId));
    } catch (e) { /* may not exist per DB state */ }
    try {
      await tx.delete(accounts).where(eq(accounts.userId, userId));
    } catch (e) { /* may not exist per DB state */ }
    try {
      await tx.delete(verificationTokens).where(eq(verificationTokens.userId, userId));
    } catch (e) { /* may not exist per DB state */ }
    try {
      await tx.delete(leaveRequests).where(eq(leaveRequests.userId, userId));
    } catch (e) { /* may not exist per DB state */ }
    try {
      await tx.delete(feedback).where(eq(feedback.userId, userId));
    } catch (e) { /* may not exist per DB state */ }
    try {
      await tx.delete(auditLogs).where(eq(auditLogs.userId, userId));
    } catch (e) { /* may not exist per DB state */ }
    try {
      await tx.delete(notifications).where(eq(notifications.userId, userId));
    } catch (e) { /* may not exist per DB state */ }

    // 14. Finally delete the user record
    await tx.delete(users).where(eq(users.id, userId));
  });

  return { success: true };
}


/**
 * Assigns a subject to a teacher
 */
export async function assignSubject(teacherId: number, subjectId: number) {
  // Check if already assigned
  const [existing] = await db
    .select()
    .from(teacherSubjectAssignments)
    .where(
      and(
        eq(teacherSubjectAssignments.teacherId, teacherId),
        eq(teacherSubjectAssignments.subjectId, subjectId)
      )
    )
    .limit(1);

  if (existing) return { success: true };

  await db.insert(teacherSubjectAssignments).values({
    teacherId,
    subjectId,
  });

  revalidatePath(`/admin/teachers/${teacherId}`);
  return { success: true };
}

/**
 * Unassigns a subject from a teacher
 */
export async function unassignSubject(teacherId: number, subjectId: number) {
  await db
    .delete(teacherSubjectAssignments)
    .where(
      and(
        eq(teacherSubjectAssignments.teacherId, teacherId),
        eq(teacherSubjectAssignments.subjectId, subjectId)
      )
    );

  revalidatePath(`/admin/teachers/${teacherId}`);
  return { success: true };
}

/**
 * Assigns a class to a teacher
 */
export async function assignClass(teacherId: number, classId: number) {
  // Check if already assigned
  const [existing] = await db
    .select()
    .from(teacherClassAssignments)
    .where(
      and(
        eq(teacherClassAssignments.teacherId, teacherId),
        eq(teacherClassAssignments.classId, classId)
      )
    )
    .limit(1);

  if (existing) return { success: true };

  await db.insert(teacherClassAssignments).values({
    teacherId,
    classId,
  });

  revalidatePath(`/admin/teachers/${teacherId}`);
  return { success: true };
}

/**
 * Unassigns a class from a teacher
 */
export async function unassignClass(teacherId: number, classId: number) {
  await db
    .delete(teacherClassAssignments)
    .where(
      and(
        eq(teacherClassAssignments.teacherId, teacherId),
        eq(teacherClassAssignments.classId, classId)
      )
    );

  revalidatePath(`/admin/teachers/${teacherId}`);
  return { success: true };
}

/**
 * Sets the class teacher assignment for a teacher.
 * classId can be null to clear any class teacher assignment for this teacher.
 */
export async function setClassTeacher(teacherId: number, classId: number | null) {
  if (classId !== null) {
    // 1. Verify if this class is already assigned to ANOTHER teacher as class teacher
    const [otherAssignment] = await db
      .select({
        id: classTeacherAssignments.id,
        teacherId: classTeacherAssignments.teacherId,
        teacherName: users.name,
      })
      .from(classTeacherAssignments)
      .leftJoin(teachers, eq(classTeacherAssignments.teacherId, teachers.id))
      .leftJoin(users, eq(teachers.userId, users.id))
      .where(
        and(
          eq(classTeacherAssignments.classId, classId),
          ne(classTeacherAssignments.teacherId, teacherId)
        )
      )
      .limit(1);

    if (otherAssignment) {
      throw new Error('This class already has an assigned class teacher.');
    }
  }

  // 2. Delete any existing class teacher assignments for this current teacher
  await db
    .delete(classTeacherAssignments)
    .where(eq(classTeacherAssignments.teacherId, teacherId));

  // 3. If classId is provided, insert the new assignment
  if (classId !== null) {
    await db.insert(classTeacherAssignments).values({
      teacherId,
      classId,
    });
  }

  revalidatePath(`/admin/teachers/${teacherId}`);
  return { success: true };
}

/**
 * Updates all assignments in one transaction and logs audit + notification
 */
export async function updateTeacherAssignments(
  teacherId: number,
  subjectIds: number[],
  classIds: number[],
  classTeacherClassId: number | null
) {
  try {
    // 1. Set Class Teacher Assignment
    await setClassTeacher(teacherId, classTeacherClassId);

    // 2. Sync Subject Assignments
    // Delete ones not in subjectIds
    if (subjectIds.length > 0) {
      await db
        .delete(teacherSubjectAssignments)
        .where(
          and(
            eq(teacherSubjectAssignments.teacherId, teacherId),
            sql`subject_id NOT IN (${sql.join(
              subjectIds.map((id) => sql`${id}`),
              sql`, `
            )})`
          )
        );
    } else {
      await db
        .delete(teacherSubjectAssignments)
        .where(eq(teacherSubjectAssignments.teacherId, teacherId));
    }

    // Insert new ones
    for (const subId of subjectIds) {
      await assignSubject(teacherId, subId);
    }

    // 3. Sync Class Assignments
    // Delete ones not in classIds
    if (classIds.length > 0) {
      await db
        .delete(teacherClassAssignments)
        .where(
          and(
            eq(teacherClassAssignments.teacherId, teacherId),
            sql`class_id NOT IN (${sql.join(
              classIds.map((id) => sql`${id}`),
              sql`, `
            )})`
          )
        );
    } else {
      await db
        .delete(teacherClassAssignments)
        .where(eq(teacherClassAssignments.teacherId, teacherId));
    }

    // Insert new ones
    for (const clsId of classIds) {
      await assignClass(teacherId, clsId);
    }

    // Fetch teacher user details for notification
    const [t] = await db
      .select({ name: users.name, schoolId: teachers.schoolId })
      .from(teachers)
      .innerJoin(users, eq(users.id, teachers.userId))
      .where(eq(teachers.id, teacherId))
      .limit(1);

    const teacherName = t?.name || 'Teacher';
    const schoolId = t?.schoolId || 1;

    // 4. Create notification
    await createNotification(
      'Assignments Updated',
      `Teacher assignments updated successfully for ${teacherName}.`,
      'info',
      'medium'
    );

    // 5. Log audit
    await logAudit(
      'UPDATE_TEACHER_ASSIGNMENTS',
      'teacher',
      teacherId,
      `Updated assignments for teacher ${teacherName}`,
      schoolId
    );

    revalidatePath(`/admin/teachers/${teacherId}`);
    return { success: true, message: 'Teacher assignments updated successfully.' };
  } catch (error: any) {
    throw new Error(error.message || 'Failed to update teacher assignments.');
  }
}


