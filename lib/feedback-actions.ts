'use server';

import { db } from './db';
import { feedback, users } from './schema';
import { eq, sql, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { createNotification } from './notification-actions';
import { parseDbError } from './db-errors';
import { logAudit } from './audit-utils';
import { getCurrentUser } from './auth';

// ==================== FEEDBACK ACTIONS ====================

const VALID_CATEGORIES = ['Academic', 'Facilities', 'Transport', 'Administration', 'Other', 'Monthly Survey', 'School Survey'];

export async function submitFeedback(data: {
  title: string;
  message: string;
  category: string;
}) {
  if (!data.title || data.title.trim().length < 3) throw new Error('Title must be at least 3 characters.');
  if (!data.message || data.message.trim().length < 10) throw new Error('Message must be at least 10 characters.');
  if (!data.category || !VALID_CATEGORIES.includes(data.category)) {
    throw new Error(`Category must be one of: ${VALID_CATEGORIES.join(', ')}.`);
  }

  const user = await getCurrentUser();
  if (!user) throw new Error('You must be logged in to submit feedback.');
  const schoolId = (user as any).school?.id ?? (user as any).schoolId ?? 1;

  let insertedId: number;
  try {
    const result = await db.insert(feedback).values({
      schoolId,
      userId: user.id,
      title: data.title.trim(),
      message: data.message.trim(),
      category: data.category,
    });
    insertedId = Number(result[0].insertId);
  } catch (err) {
    throw new Error(parseDbError(err));
  }

  await createNotification(
    'Feedback Submitted',
    `New ${data.category} feedback: "${data.title}".`,
    'info',
    'medium'
  );

  await logAudit('CREATE_FEEDBACK', 'feedback', insertedId, `Feedback submitted: "${data.title}" (${data.category})`, schoolId);

  revalidatePath('/admin/feedback');
  revalidatePath('/parent/feedback');
  revalidatePath('/student/feedback');
  revalidatePath('/admin');
}

export async function getAllFeedback() {
  const rows = await db
    .select({
      feedback: feedback,
      userName: users.name,
      userRole: users.role,
    })
    .from(feedback)
    .leftJoin(users, eq(feedback.userId, users.id))
    .orderBy(desc(feedback.createdAt));

  return rows.map((r: any) => ({
    ...r.feedback,
    userName: r.userName || 'Unknown',
    userRole: r.userRole || 'unknown',
  }));
}

export async function getFeedbackByUser(userId: number) {
  const rows = await db
    .select()
    .from(feedback)
    .where(eq(feedback.userId, userId))
    .orderBy(desc(feedback.createdAt));

  return rows;
}

export async function deleteFeedback(id: number) {
  const [entry] = await db.select().from(feedback).where(eq(feedback.id, id)).limit(1);
  const title = entry?.title || 'Unknown';

  try {
    await db.delete(feedback).where(eq(feedback.id, id));
  } catch (err) {
    throw new Error(parseDbError(err));
  }

  await createNotification('Feedback Removed', `Feedback "${title}" has been removed.`, 'info', 'medium');
  await logAudit('DELETE_FEEDBACK', 'feedback', id, `Deleted feedback: "${title}"`);

  revalidatePath('/admin/feedback');
  revalidatePath('/admin');
}

export async function submitTeacherFeedbackAction(data: {
  teacherId: number;
  rating: number;
  comment: string;
  category: string;
}) {
  const { students, teacherFeedback } = await import('./schema');
  
  if (data.rating < 1 || data.rating > 5) throw new Error('Rating must be between 1 and 5 stars.');
  if (!data.comment || data.comment.trim().length < 5) throw new Error('Comment must be at least 5 characters.');

  const user = await getCurrentUser();
  if (!user) throw new Error('You must be logged in.');

  const [studentRow] = await db
    .select({ id: students.id, classId: students.classId })
    .from(students)
    .where(eq(students.userId, user.id))
    .limit(1);

  if (!studentRow) throw new Error('Student record not found.');

  try {
    await db.insert(teacherFeedback).values({
      teacherId: data.teacherId,
      studentId: studentRow.id,
      classId: studentRow.classId,
      rating: data.rating,
      comment: data.comment.trim(),
      category: data.category || 'overall',
      academicYear: '2026-2027',
    });
  } catch (err) {
    throw new Error(parseDbError(err));
  }

  revalidatePath('/student/feedback');
}
