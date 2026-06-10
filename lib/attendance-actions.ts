"use server";

import { and, eq, gte, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { attendance } from "@/lib/schema";
import {
  AttendanceStatus,
  calculateAttendancePercentage,
  getMonthRange,
  normalizeAttendanceStatus,
} from "@/lib/attendance-utils";

export async function upsertDailyAttendance(data: {
  studentId: number;
  classId: number;
  attendanceDate: Date;
  status: AttendanceStatus | string;
  markedBy?: number | null;
  remarks?: string | null;
}) {
  const status = normalizeAttendanceStatus(data.status);

  const [existing] = await db
    .select()
    .from(attendance)
    .where(
      and(
        eq(attendance.studentId, data.studentId),
        eq(attendance.attendanceDate, data.attendanceDate)
      )
    )
    .limit(1);

  if (existing) {
    await db
      .update(attendance)
      .set({
        status,
        remarks: data.remarks ?? null,
        markedBy: data.markedBy ?? null,
        updatedAt: new Date(),
      })
      .where(eq(attendance.id, existing.id));
  } else {
    await db.insert(attendance).values({
      studentId: data.studentId,
      classId: data.classId,
      attendanceDate: data.attendanceDate,
      status,
      remarks: data.remarks ?? null,
      markedBy: data.markedBy ?? null,
    });
  }

  revalidatePath("/admin");
  revalidatePath("/admin/attendance");
  revalidatePath("/admin/attendance/history");
  revalidatePath("/admin/attendance/summary");
}

export async function getMonthlyAttendancePercentage(studentId: number, month: string) {
  const { start, end } = getMonthRange(month);

  const rows = await db
    .select()
    .from(attendance)
    .where(
      and(
        eq(attendance.studentId, studentId),
        gte(attendance.attendanceDate, start),
        lte(attendance.attendanceDate, end)
      )
    );

  const present = rows.filter((row) => row.status === "present").length;
  return calculateAttendancePercentage({ present, total: rows.length });
}
