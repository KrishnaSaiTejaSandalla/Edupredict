import { db } from './db';
import { attendanceHolidays } from './schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

/**
 * Format Date to YYYY-MM-DD
 */
export function formatDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function normalizeDateInput(dateInput: string | Date): string {
  if (typeof dateInput === 'string') {
    const raw = dateInput.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    return formatDateString(new Date(raw));
  }
  return formatDateString(dateInput);
}

/**
 * Check if a date is a Sunday
 */
export function isSunday(dateInput: string | Date): boolean {
  const dateStr = normalizeDateInput(dateInput);
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.getDay() === 0;
}

/**
 * Get all database holidays in an optional date range
 */
export async function getDatabaseHolidays(schoolId?: number | null, startDate?: string, endDate?: string) {
  try {
    const conditions: any[] = [];
    if (schoolId) {
      conditions.push(eq(attendanceHolidays.schoolId, schoolId));
    }
    if (startDate) {
      const startStr = normalizeDateInput(startDate);
      conditions.push(gte(attendanceHolidays.holidayDate, startStr as any));
    }
    if (endDate) {
      const endStr = normalizeDateInput(endDate);
      conditions.push(lte(attendanceHolidays.holidayDate, endStr as any));
    }

    const rows = conditions.length > 0
      ? await db.select().from(attendanceHolidays).where(and(...conditions))
      : await db.select().from(attendanceHolidays);

    return rows.map((r) => {
      const dateStr = typeof r.holidayDate === 'string'
        ? r.holidayDate
        : formatDateString(new Date(r.holidayDate));
      return {
        id: r.id,
        schoolId: r.schoolId,
        date: dateStr,
        reason: r.reason,
        createdBy: r.createdBy,
        isSunday: false,
      };
    });
  } catch (err) {
    console.error('Error fetching database holidays:', err);
    return [];
  }
}

/**
 * Check if a specific date is a holiday (either a Sunday or explicitly declared in DB)
 */
export async function isDateHoliday(
  dateInput: string | Date,
  schoolId?: number | null
): Promise<{ isHoliday: boolean; reason?: string; id?: number; isSunday: boolean }> {
  const dateStr = normalizeDateInput(dateInput);

  if (isSunday(dateStr)) {
    return {
      isHoliday: true,
      reason: 'Sunday (Weekly Holiday)',
      isSunday: true,
    };
  }

  try {
    const conditions = [
      sql`DATE(${attendanceHolidays.holidayDate}) = DATE(${dateStr})`
    ];
    if (schoolId) {
      conditions.push(eq(attendanceHolidays.schoolId, schoolId));
    }

    const [row] = await db
      .select()
      .from(attendanceHolidays)
      .where(and(...conditions))
      .limit(1);

    if (row) {
      return {
        isHoliday: true,
        reason: row.reason,
        id: row.id,
        isSunday: false,
      };
    }
  } catch (err) {
    console.error('Error checking holiday date:', err);
  }

  return { isHoliday: false, isSunday: false };
}

/**
 * Add a custom holiday to DB
 */
export async function addHoliday(
  dateInput: string,
  reason: string,
  schoolId: number | null,
  createdBy?: number
) {
  const dateStr = normalizeDateInput(dateInput);

  if (isSunday(dateStr)) {
    throw new Error('Sundays are automatically holidays by default and cannot be declared again.');
  }

  // Check if holiday already exists
  const conditions = [
    sql`DATE(${attendanceHolidays.holidayDate}) = DATE(${dateStr})`
  ];
  if (schoolId) {
    conditions.push(eq(attendanceHolidays.schoolId, schoolId));
  }

  const [existing] = await db
    .select()
    .from(attendanceHolidays)
    .where(and(...conditions))
    .limit(1);

  if (existing) {
    // Update reason
    await db
      .update(attendanceHolidays)
      .set({ reason: reason.trim(), updatedAt: new Date() })
      .where(eq(attendanceHolidays.id, existing.id));
    return { success: true, id: existing.id, updated: true };
  }

  const result = await db.insert(attendanceHolidays).values({
    schoolId: schoolId || null,
    holidayDate: dateStr as any,
    reason: reason.trim(),
    createdBy: createdBy || null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return { success: true, id: (result as any)[0]?.insertId };
}

/**
 * Remove a custom holiday from DB (makes day a working day again)
 */
export async function removeHoliday(holidayId: number) {
  await db.delete(attendanceHolidays).where(eq(attendanceHolidays.id, holidayId));
  return { success: true };
}

/**
 * Remove holiday by date
 */
export async function removeHolidayByDate(dateInput: string, schoolId?: number | null) {
  const dateStr = normalizeDateInput(dateInput);

  if (isSunday(dateStr)) {
    throw new Error('Sundays are permanent weekly holidays and cannot be removed.');
  }

  const conditions = [
    sql`DATE(${attendanceHolidays.holidayDate}) = DATE(${dateStr})`
  ];
  if (schoolId) {
    conditions.push(eq(attendanceHolidays.schoolId, schoolId));
  }
  await db.delete(attendanceHolidays).where(and(...conditions));
  return { success: true };
}
