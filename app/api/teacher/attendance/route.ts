import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { teachers } from "@/lib/schema";
import { eq } from "drizzle-orm";
import {
  getStudentsByClass,
  getAttendanceForDate,
  markBulkAttendance,
} from "@/lib/teacher-attendance.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireRole("teacher");
    const { searchParams } = new URL(request.url);
    const classId = Number(searchParams.get("classId"));
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0];

    if (!classId) return NextResponse.json({ students: [] });

    const studentList = await getStudentsByClass(classId);
    const existingAttendance = await getAttendanceForDate(classId, date);

    const studentsWithStatus = studentList.map((s) => {
      const existing = existingAttendance.find((a) => a.studentId === s.id);
      return {
        ...s,
        status: existing ? existing.status : "present",
      };
    });

    return NextResponse.json({ students: studentsWithStatus });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRole("teacher");
    const body = await request.json();
    const { classId, subjectId, topicTaught, date, records } = body;

    if (!classId || !subjectId || !topicTaught?.trim() || !date || !Array.isArray(records)) {
      return NextResponse.json({ error: "Invalid request. Class, Subject, and Topic Taught are required." }, { status: 400 });
    }

    await markBulkAttendance(Number(classId), Number(subjectId), topicTaught.trim(), date, records, user.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}
