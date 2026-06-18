import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { teachers } from "@/lib/schema";
import { eq } from "drizzle-orm";
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

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId") ? Number(searchParams.get("classId")) : undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    const records = await getAttendanceHistory(teacher.id, classId, startDate, endDate);
    return NextResponse.json({ records });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}
