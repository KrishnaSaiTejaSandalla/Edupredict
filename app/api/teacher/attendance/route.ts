import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { teachers, classTeacherAssignments } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
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

    // Restrict GET to Class Teacher only
    const [teacher] = await db
      .select({ id: teachers.id })
      .from(teachers)
      .where(eq(teachers.userId, user.id))
      .limit(1);

    if (!teacher) {
      return NextResponse.json({ error: "Teacher record not found" }, { status: 403 });
    }

    const [assignment] = await db
      .select()
      .from(classTeacherAssignments)
      .where(
        and(
          eq(classTeacherAssignments.teacherId, teacher.id),
          eq(classTeacherAssignments.classId, classId)
        )
      )
      .limit(1);

    if (!assignment) {
      return NextResponse.json({ error: "Access denied. Only the assigned Class Teacher can manage attendance." }, { status: 403 });
    }

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

    if (!classId || !subjectId || !date || !Array.isArray(records)) {
      return NextResponse.json({ error: "Invalid request. Class, Subject, and Date are required." }, { status: 400 });
    }

    // Restrict POST to Class Teacher only
    const [teacher] = await db
      .select({ id: teachers.id })
      .from(teachers)
      .where(eq(teachers.userId, user.id))
      .limit(1);

    if (!teacher) {
      return NextResponse.json({ error: "Teacher record not found" }, { status: 403 });
    }

    const [assignment] = await db
      .select()
      .from(classTeacherAssignments)
      .where(
        and(
          eq(classTeacherAssignments.teacherId, teacher.id),
          eq(classTeacherAssignments.classId, Number(classId))
        )
      )
      .limit(1);

    if (!assignment) {
      return NextResponse.json({ error: "Access denied. Only the assigned Class Teacher can manage attendance." }, { status: 403 });
    }

    const finalTopicTaught = topicTaught?.trim() || "General Class Attendance";

    await markBulkAttendance(Number(classId), Number(subjectId), finalTopicTaught, date, records, user.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}
