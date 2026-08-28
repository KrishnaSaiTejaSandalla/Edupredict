import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { teachers, classTeacherAssignments } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { getAttendanceHistory } from "@/lib/teacher-attendance.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireRole("teacher");
    const [teacher] = await db
      .select({ id: teachers.id })
      .from(teachers)
      .where(eq(teachers.userId, user.id))
      .limit(1);

    if (!teacher) return NextResponse.json({ records: [] });

    // Retrieve class teacher class assignments
    const classTeacherAssignmentsList = await db
      .select({ classId: classTeacherAssignments.classId })
      .from(classTeacherAssignments)
      .where(eq(classTeacherAssignments.teacherId, teacher.id));
    const classTeacherClassIds = classTeacherAssignmentsList.map((a) => a.classId);

    if (classTeacherClassIds.length === 0) {
      return NextResponse.json({ records: [] });
    }

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId") ? Number(searchParams.get("classId")) : undefined;

    if (classId) {
      if (!classTeacherClassIds.includes(classId)) {
        return NextResponse.json({ error: "Access denied." }, { status: 403 });
      }
    }

    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    const records = await getAttendanceHistory(
      teacher.id,
      classId || classTeacherClassIds,
      startDate,
      endDate
    );
    return NextResponse.json({ records });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}
