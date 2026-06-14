'use server';

import { db } from './db';
import { auditLogs, auditLogsArchive, users } from './schema';
import { getCurrentUser } from './auth';
import { eq, desc, gte, lt, lte, and, or, like, sql, count } from 'drizzle-orm';

// ==================== Types ====================

export type AuditPriority = 'high' | 'medium' | 'low';

export interface AuditLogRow {
  id: number;
  schoolId: number;
  userId: number;
  action: string;
  entityType: string;
  entityId: number | null;
  details: string | null;
  priority: string | null;
  module: string | null;
  userRole: string | null;
  createdAt: Date | string;
  userName: string;
}

export interface AuditLogFilters {
  page?: number;
  search?: string;
  module?: string;
  actionType?: string; // 'all' | 'create' | 'update' | 'delete' | 'process'
  role?: string;
  from?: string; // ISO date string
  to?: string;   // ISO date string
}

export interface PaginatedAuditLogs {
  logs: AuditLogRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ==================== Priority & Module Derivation ====================

function derivePriority(action: string): AuditPriority {
  const upper = action.toUpperCase();
  if (
    upper.includes('DELETE') ||
    upper.includes('ROLE_CHANGE') ||
    upper.includes('MODIFY_MARKS') ||
    upper.includes('PUBLISH_RESULT') ||
    upper.includes('BULK_DELETE')
  ) return 'high';

  if (
    upper.includes('APPROVE') ||
    upper.includes('REJECT') ||
    upper.includes('TIMETABLE') ||
    upper.includes('TRANSFER') ||
    upper.includes('ASSIGN') ||
    upper.includes('LEAVE') ||
    upper.includes('UPDATE_MARKS')
  ) return 'medium';

  return 'low';
}

function deriveModule(action: string): string {
  const upper = action.toUpperCase();
  if (upper.includes('TIMETABLE'))                             return 'Timetable';
  if (upper.includes('LEAVE'))                                 return 'Leave';
  if (upper.includes('TRANSPORT') || upper.includes('ROUTE') || upper.includes('BUS')) return 'Transport';
  if (upper.includes('FEEDBACK'))                              return 'Feedback';
  if (upper.includes('SETTINGS') || upper.includes('CONFIG')) return 'Settings';
  if (upper.includes('TEACHER') || upper.includes('DRIVER') || upper.includes('ROLE')) return 'Staff';
  if (upper.includes('MARKS') || upper.includes('RESULT') || upper.includes('EXAM') ||
      upper.includes('ATTENDANCE') || upper.includes('STUDENT') || upper.includes('CLASS') ||
      upper.includes('SUBJECT'))                               return 'Academic';
  return 'System';
}

// ==================== Write ====================

/**
 * Logs an audit entry. Silently fails if user session is missing or DB errors,
 * so that audit logging never blocks the primary operation.
 *
 * Backward compatible — priority and module are auto-derived if not provided.
 */
export async function logAudit(
  action: string,
  entityType: string,
  entityId: number,
  details: string,
  schoolId?: number,
  options?: { priority?: AuditPriority; module?: string }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return;

    const resolvedPriority = options?.priority ?? derivePriority(action);
    const resolvedModule   = options?.module   ?? deriveModule(action);
    const resolvedRole     = (user as any).role ?? null;

    await db.insert(auditLogs).values({
      schoolId: schoolId ?? (user.school?.id ?? 1),
      userId: user.id,
      action,
      entityType,
      entityId,
      details,
      priority: resolvedPriority,
      module: resolvedModule,
      userRole: resolvedRole,
    });
  } catch (err) {
    console.error('Audit log failed:', err);
  }
}

// ==================== Stat Helpers ====================

export async function getAuditStats() {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek  = new Date(startOfToday);
  startOfWeek.setDate(startOfToday.getDate() - 7);

  const [todayCount, weekCount, criticalCount, totalCount] = await Promise.all([
    db.select({ c: count() }).from(auditLogs).where(gte(auditLogs.createdAt, startOfToday)),
    db.select({ c: count() }).from(auditLogs).where(gte(auditLogs.createdAt, startOfWeek)),
    db.select({ c: count() }).from(auditLogs).where(eq(auditLogs.priority, 'high')),
    db.select({ c: count() }).from(auditLogs),
  ]);

  return {
    today:    Number((todayCount[0] as any)?.c    ?? 0),
    week:     Number((weekCount[0] as any)?.c     ?? 0),
    critical: Number((criticalCount[0] as any)?.c ?? 0),
    total:    Number((totalCount[0] as any)?.c    ?? 0),
  };
}

// ==================== Recent Activity (last 100) ====================

export async function getAuditLogs() {
  const rows = await db
    .select({
      id:         auditLogs.id,
      schoolId:   auditLogs.schoolId,
      userId:     auditLogs.userId,
      action:     auditLogs.action,
      entityType: auditLogs.entityType,
      entityId:   auditLogs.entityId,
      details:    auditLogs.details,
      priority:   auditLogs.priority,
      module:     auditLogs.module,
      userRole:   auditLogs.userRole,
      createdAt:  auditLogs.createdAt,
      userName:   users.name,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .orderBy(desc(auditLogs.createdAt))
    .limit(100);

  return rows.map((r) => ({
    ...r,
    userName: r.userName || 'System',
    userRole: r.userRole || (r as any).users_role || 'system',
  }));
}

// Alias used by new Recent Activity component
export const getRecentActivity = getAuditLogs;

// ==================== Active Logs (last 12 months, paginated) ====================

const PAGE_SIZE = 20;

export async function getActiveLogs(filters: AuditLogFilters = {}): Promise<PaginatedAuditLogs> {
  const page     = Math.max(1, filters.page ?? 1);
  const offset   = (page - 1) * PAGE_SIZE;

  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);

  // Build WHERE conditions
  const conditions: any[] = [gte(auditLogs.createdAt, twelveMonthsAgo)];

  if (filters.from) {
    conditions.push(gte(auditLogs.createdAt, new Date(filters.from)));
  }
  if (filters.to) {
    const toDate = new Date(filters.to);
    toDate.setHours(23, 59, 59, 999);
    conditions.push(lte(auditLogs.createdAt, toDate));
  }
  if (filters.module && filters.module !== 'all') {
    conditions.push(eq(auditLogs.module, filters.module));
  }
  if (filters.role && filters.role !== 'all') {
    conditions.push(eq(auditLogs.userRole, filters.role));
  }
  if (filters.actionType && filters.actionType !== 'all') {
    const actionMap: Record<string, string> = {
      create: 'CREATE',
      update: 'UPDATE',
      delete: 'DELETE',
      approve: 'APPROVE',
      reject: 'REJECT',
    };
    const prefix = actionMap[filters.actionType];
    if (prefix) conditions.push(like(auditLogs.action, `${prefix}%`));
  }
  if (filters.search) {
    const term = `%${filters.search}%`;
    conditions.push(
      or(
        like(auditLogs.action, term),
        like(auditLogs.details, term),
        like(auditLogs.entityType, term),
        like(users.name, term),
      )
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id:         auditLogs.id,
        schoolId:   auditLogs.schoolId,
        userId:     auditLogs.userId,
        action:     auditLogs.action,
        entityType: auditLogs.entityType,
        entityId:   auditLogs.entityId,
        details:    auditLogs.details,
        priority:   auditLogs.priority,
        module:     auditLogs.module,
        userRole:   auditLogs.userRole,
        createdAt:  auditLogs.createdAt,
        userName:   users.name,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(where)
      .orderBy(desc(auditLogs.createdAt))
      .limit(PAGE_SIZE)
      .offset(offset),

    db
      .select({ c: count() })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(where),
  ]);

  const total = Number((totalRows[0] as any)?.c ?? 0);

  return {
    logs: rows.map((r) => ({ ...r, userName: r.userName || 'System' })),
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.ceil(total / PAGE_SIZE),
  };
}

// ==================== Archived Logs (older than 12 months, paginated) ====================

export async function getArchivedLogs(filters: AuditLogFilters = {}): Promise<PaginatedAuditLogs> {
  const page   = Math.max(1, filters.page ?? 1);
  const offset = (page - 1) * PAGE_SIZE;

  const conditions: any[] = [];

  if (filters.from) conditions.push(gte(auditLogsArchive.createdAt, new Date(filters.from)));
  if (filters.to) {
    const toDate = new Date(filters.to);
    toDate.setHours(23, 59, 59, 999);
    conditions.push(lte(auditLogsArchive.createdAt, toDate));
  }
  if (filters.module && filters.module !== 'all')
    conditions.push(eq(auditLogsArchive.module, filters.module));
  if (filters.role && filters.role !== 'all')
    conditions.push(eq(auditLogsArchive.userRole, filters.role));
  if (filters.actionType && filters.actionType !== 'all') {
    const actionMap: Record<string, string> = {
      create: 'CREATE', update: 'UPDATE', delete: 'DELETE',
      approve: 'APPROVE', reject: 'REJECT',
    };
    const prefix = actionMap[filters.actionType];
    if (prefix) conditions.push(like(auditLogsArchive.action, `${prefix}%`));
  }
  if (filters.search) {
    const term = `%${filters.search}%`;
    conditions.push(
      or(
        like(auditLogsArchive.action, term),
        like(auditLogsArchive.details, term),
        like(auditLogsArchive.entityType, term),
      )
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, totalRows] = await Promise.all([
    db
      .select()
      .from(auditLogsArchive)
      .where(where)
      .orderBy(desc(auditLogsArchive.createdAt))
      .limit(PAGE_SIZE)
      .offset(offset),

    db.select({ c: count() }).from(auditLogsArchive).where(where),
  ]);

  const total = Number((totalRows[0] as any)?.c ?? 0);

  return {
    logs: rows.map((r) => ({ ...r, userName: 'System' })),
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.ceil(total / PAGE_SIZE),
  };
}

// ==================== Archive Process ====================

/**
 * Moves audit log records older than 12 months from auditLogs → auditLogsArchive.
 * Returns the number of records archived.
 */
export async function archiveOldLogs(): Promise<{ archived: number }> {
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 1);

  // Fetch records to archive
  const oldRecords = await db
    .select()
    .from(auditLogs)
    .where(lt(auditLogs.createdAt, cutoff))
    .limit(500); // Batch limit to avoid timeouts

  if (oldRecords.length === 0) return { archived: 0 };

  // Insert into archive
  await db.insert(auditLogsArchive).values(
    oldRecords.map((r) => ({
      originalId:  r.id,
      schoolId:    r.schoolId,
      userId:      r.userId,
      action:      r.action,
      entityType:  r.entityType,
      entityId:    r.entityId,
      details:     r.details,
      priority:    r.priority ?? null,
      module:      r.module ?? null,
      userRole:    r.userRole ?? null,
      createdAt:   r.createdAt,
    }))
  );

  // Delete from active table
  const ids = oldRecords.map((r) => r.id);
  for (const id of ids) {
    await db.delete(auditLogs).where(eq(auditLogs.id, id));
  }

  return { archived: oldRecords.length };
}

// ==================== Delete from Archive ====================

/**
 * Permanently deletes a single record from audit_logs_archive.
 * This is irreversible — use with caution.
 */
export async function deleteArchivedLog(id: number): Promise<void> {
  await db.delete(auditLogsArchive).where(eq(auditLogsArchive.id, id));
}
