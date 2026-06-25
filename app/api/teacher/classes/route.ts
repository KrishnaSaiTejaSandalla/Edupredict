import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { teachers, students, users, attendance, results, exams, subjects, classTeacherAssignments, classes } from "@/lib/schema";
import { eq, and, gte, sql, isNotNull } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireRole("teacher");
    const { searchParams } = new URL(request.url);
    const classId = Number(searchParams.get("classId"));

    if (!classId) return NextResponse.json({ students: [], analysis: null });

    const [teacherRow] = await db
      .select({ id: teachers.id })
      .from(teachers)
      .where(eq(teachers.userId, user.id))
      .limit(1);

    if (!teacherRow) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    const [isClassTeacher] = await db
      .select({ id: classTeacherAssignments.id })
      .from(classTeacherAssignments)
      .where(
        and(
          eq(classTeacherAssignments.teacherId, teacherRow.id),
          eq(classTeacherAssignments.classId, classId)
        )
      )
      .limit(1);

    if (!isClassTeacher) {
      return NextResponse.json({ error: "Unauthorized access to this class" }, { status: 403 });
    }

    const studentList = await db
      .select({
        id: students.id,
        userId: students.userId,
        rollNumber: students.rollNumber,
        gender: students.gender,
        dateOfBirth: students.dateOfBirth,
        address: students.address,
        classId: students.classId,
        name: users.name,
        profileImageUrl: users.profileImageUrl,
      })
      .from(students)
      .leftJoin(users, eq(students.userId, users.id))
      .where(eq(students.classId, classId))
      .orderBy(students.rollNumber);

    const [classInfo] = await db
      .select({ name: classes.name, section: classes.section })
      .from(classes)
      .where(eq(classes.id, classId))
      .limit(1);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const studentsWithMetrics = await Promise.all(
      studentList.map(async (s) => {
        const attendanceRows = await db
          .select({ status: attendance.status })
          .from(attendance)
          .where(
            and(
              eq(attendance.studentId, s.id),
              eq(attendance.classId, classId),
              gte(attendance.attendanceDate, thirtyDaysAgo)
            )
          );

        const presentCount = attendanceRows.filter((a) => a.status === "present").length;
        const totalCount = attendanceRows.length;
        const attendancePct = totalCount > 0 
          ? Math.round((presentCount / totalCount) * 100) 
          : 100;

        const resultRows = await db
          .select({ marks: results.marks, maxMarks: exams.maxMarks })
          .from(results)
          .leftJoin(exams, eq(results.examId, exams.id))
          .where(
            and(
              eq(results.studentId, s.id),
              isNotNull(results.marks)
            )
          );

        const perfSum = resultRows.reduce((sum, r) => sum + (Number(r.marks || 0) / Number(r.maxMarks || 100) * 100), 0);
        const performancePct = resultRows.length > 0 ? Math.round(perfSum / resultRows.length) : 0;

        let riskLevel: "low" | "medium" | "high" | null = null;
        if (attendancePct < 70 || performancePct < 60) {
          riskLevel = "high";
        } else if (attendancePct < 85 || performancePct < 80) {
          riskLevel = "medium";
        } else {
          riskLevel = "low";
        }

        return {
          id: s.id,
          userId: s.userId,
          name: s.name ?? "Unknown",
          rollNumber: s.rollNumber ?? "",
          gender: s.gender ?? "",
          dateOfBirth: s.dateOfBirth ? (s.dateOfBirth instanceof Date ? s.dateOfBirth.toISOString().split("T")[0] : String(s.dateOfBirth)) : null,
          address: s.address ?? null,
          profileImageUrl: s.profileImageUrl ?? null,
          classId: s.classId,
          className: classInfo?.name 
            ? `${classInfo.name}${classInfo.section ? ` ${classInfo.section}` : ""}` 
            : "",
          attendancePct,
          performancePct,
          riskLevel,
        };
      })
    );

    const analysis = {
      totalStudents: studentsWithMetrics.length,
      atRiskStudents: studentsWithMetrics.filter((s) => s.riskLevel === "high" || s.riskLevel === "medium").length,
      avgAttendance: studentsWithMetrics.length > 0
        ? Math.round(studentsWithMetrics.reduce((sum, s) => sum + s.attendancePct, 0) / studentsWithMetrics.length)
        : 0,
      avgPerformance: studentsWithMetrics.length > 0
        ? Math.round(studentsWithMetrics.reduce((sum, s) => sum + s.performancePct, 0) / studentsWithMetrics.length)
        : 0,
    };

    return NextResponse.json({ students: studentsWithMetrics, analysis });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}