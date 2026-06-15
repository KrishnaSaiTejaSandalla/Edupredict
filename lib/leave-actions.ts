'use server';

import { db } from './db';
import { leaveRequests, users, students } from './schema';
import { eq, and, or, sql, gte } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { createNotification } from './notification-actions';
import { parseDbError } from './db-errors';
import { logAudit } from './audit-utils';
import { getCurrentUser } from './auth';

// ==================== LEAVE REQUEST ACTIONS ====================

/**
 * Checks for overlapping leave requests for the same user/student in the given date range.
 */
async function checkLeaveOverlap(
  userId: number,
  startDate: string,
  endDate: string,
  studentId?: number | null,
  excludeId?: number
) {
  const conditions = [
    eq(leaveRequests.userId, userId),
    sql`${leaveRequests.startDate} <= ${endDate}`,
    sql`${leaveRequests.endDate} >= ${startDate}`,
    // Only check against non-rejected requests
    sql`${leaveRequests.status} != 'rejected'`,
  ];

  if (studentId) {
    conditions.push(eq(leaveRequests.studentId, studentId));
  }

  if (excludeId) {
    conditions.push(sql`${leaveRequests.id} != ${excludeId}`);
  }

  const overlap = await db
    .select({ id: leaveRequests.id })
    .from(leaveRequests)
    .where(and(...conditions))
    .limit(1);

  return overlap.length > 0;
}

export async function submitLeaveRequest(data: {
  studentId?: number;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
}) {
  if (!data.leaveType) throw new Error('Please select a leave type.');
  if (!data.startDate || !data.endDate) throw new Error('Please select start and end dates.');
  if (data.startDate > data.endDate) throw new Error('End date cannot be before start date.');
  if (!data.reason || data.reason.trim().length < 5) throw new Error('Please provide a reason (minimum 5 characters).');

  const user = await getCurrentUser();
  if (!user) throw new Error('You must be logged in to submit a leave request.');
  const schoolId = (user as any).school?.id ?? (user as any).schoolId ?? 1;

  // Check for overlapping leave requests
  const hasOverlap = await checkLeaveOverlap(
    user.id,
    data.startDate,
    data.endDate,
    data.studentId
  );

  if (hasOverlap) {
    throw new Error('You already have a leave request that overlaps with these dates.');
  }

  let insertedId: number;
  try {
    const result = await db.insert(leaveRequests).values({
      schoolId,
      userId: user.id,
      studentId: data.studentId || null,
      leaveType: data.leaveType,
      startDate: data.startDate,
      endDate: data.endDate,
      reason: data.reason.trim(),
      status: 'pending',
      updatedAt: new Date(),
    });
    insertedId = Number(result[0].insertId);
  } catch (err) {
    throw new Error(parseDbError(err));
  }

  const leaveFor = data.studentId ? 'student leave' : 'personal leave';
  await createNotification(
    'Leave Request Submitted',
    `A ${data.leaveType} ${leaveFor} request has been submitted for ${data.startDate} to ${data.endDate}.`,
    'info',
    'medium'
  );

  await logAudit('CREATE_LEAVE', 'leave_request', insertedId, `Submitted ${data.leaveType} leave: ${data.startDate} to ${data.endDate}`, schoolId);

  revalidatePath('/admin/leaves');
  revalidatePath('/teacher/leaves');
  revalidatePath('/parent/leaves');
  revalidatePath('/admin');
}

export async function updateLeaveStatus(
  id: number,
  status: 'approved' | 'rejected',
  remarks?: string
) {
  const user = await getCurrentUser();
  if (!user) throw new Error('You must be logged in.');

  const [existing] = await db.select().from(leaveRequests).where(eq(leaveRequests.id, id)).limit(1);
  if (!existing) throw new Error('Leave request not found.');
  if (existing.status !== 'pending') throw new Error('This leave request has already been processed.');

  try {
    await db
      .update(leaveRequests)
      .set({
        status,
        remarks: remarks || null,
        actionedBy: user.id,
        updatedAt: new Date(),
      })
      .where(eq(leaveRequests.id, id));
  } catch (err) {
    throw new Error(parseDbError(err));
  }

  const action = status === 'approved' ? 'Approved' : 'Rejected';
  await createNotification(
    `Leave Request ${action}`,
    `Leave request #${id} has been ${status}.${remarks ? ` Remarks: ${remarks}` : ''}`,
    status === 'approved' ? 'success' : 'warning',
    'high'
  );

  await logAudit(`${status.toUpperCase()}_LEAVE`, 'leave_request', id, `${action} leave request #${id}${remarks ? `. Remarks: ${remarks}` : ''}`);

  revalidatePath('/admin/leaves');
  revalidatePath('/teacher/leaves');
  revalidatePath('/parent/leaves');
  revalidatePath('/admin');
}

export async function deleteLeaveRequest(id: number) {
  const [existing] = await db.select().from(leaveRequests).where(eq(leaveRequests.id, id)).limit(1);
  if (!existing) throw new Error('Leave request not found.');
  if (existing.status !== 'pending') throw new Error('Only pending leave requests can be deleted.');

  try {
    await db.delete(leaveRequests).where(eq(leaveRequests.id, id));
  } catch (err) {
    throw new Error(parseDbError(err));
  }

  await createNotification('Leave Request Deleted', `Leave request #${id} has been removed.`, 'info', 'medium');
  await logAudit('DELETE_LEAVE', 'leave_request', id, `Deleted leave request #${id}`);

  revalidatePath('/admin/leaves');
  revalidatePath('/teacher/leaves');
  revalidatePath('/parent/leaves');
  revalidatePath('/admin');
}

export async function getAllLeaveRequests() {
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const oneMonthAgoStr = oneMonthAgo.toISOString().slice(0, 10);

  const rows = await db
    .select({
      leave: leaveRequests,
      userName: users.name,
      userRole: users.role,
    })
    .from(leaveRequests)
    .leftJoin(users, eq(leaveRequests.userId, users.id))
    .where(gte(leaveRequests.startDate, oneMonthAgoStr));

  // Get student names for student-specific leaves
  const studentIds = rows
    .map((r) => r.leave.studentId)
    .filter((id): id is number => id !== null);

  let studentNameMap: Record<number, string> = {};
  if (studentIds.length > 0) {
    const uniqueIds = [...new Set(studentIds)];
    const studentRows = await db
      .select({ id: students.id, userId: students.userId })
      .from(students)
      .where(
        sql`${students.id} in (${sql.join(
          uniqueIds.map((id) => sql`${id}`),
          sql`, `
        )})`
      );

    const studentUserIds = studentRows.map((s) => s.userId);
    if (studentUserIds.length > 0) {
      const studentUsers = await db
        .select({ id: users.id, name: users.name })
        .from(users)
        .where(
          sql`${users.id} in (${sql.join(
            studentUserIds.map((id) => sql`${id}`),
            sql`, `
          )})`
        );

      const userMap: Record<number, string> = {};
      studentUsers.forEach((u) => { userMap[u.id] = u.name; });
      studentRows.forEach((s) => {
        studentNameMap[s.id] = userMap[s.userId] || 'Unknown';
      });
    }
  }

  // Get actioner names
  const actionerIds = rows
    .map((r) => r.leave.actionedBy)
    .filter((id): id is number => id !== null);

  let actionerNameMap: Record<number, string> = {};
  if (actionerIds.length > 0) {
    const uniqueIds = [...new Set(actionerIds)];
    const actionerRows = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(
        sql`${users.id} in (${sql.join(
          uniqueIds.map((id) => sql`${id}`),
          sql`, `
        )})`
      );
    actionerRows.forEach((u) => { actionerNameMap[u.id] = u.name; });
  }

  return rows.map((r: any) => ({
    ...r.leave,
    userName: r.userName || 'Unknown',
    userRole: r.userRole || 'unknown',
    studentName: r.leave.studentId ? (studentNameMap[r.leave.studentId] || null) : null,
    actionedByName: r.leave.actionedBy ? (actionerNameMap[r.leave.actionedBy] || null) : null,
  }));
}

export async function getLeaveRequestsByUser(userId: number) {
  const rows = await db
    .select()
    .from(leaveRequests)
    .where(eq(leaveRequests.userId, userId));

  return rows;
}
