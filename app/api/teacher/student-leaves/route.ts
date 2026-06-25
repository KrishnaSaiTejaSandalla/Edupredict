import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { teachers, classTeacherAssignments, leaveRequests, students, classes, parents, studentParents, users } from "@/lib/schema";
import { eq, and, isNull, inArray } from "drizzle-orm";
import { updateLeaveStatus } from "@/lib/leave-actions";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireRole("teacher");

    const [teacher] = await db
      .select({ id: teachers.id })
      .from(teachers)
      .where(eq(teachers.userId, user.id))
      .limit(1);

    if (!teacher) return NextResponse.json([]);

    // Get class IDs for this teacher
    const classIds = await db
      .select({ classId: classTeacherAssignments.classId })
      .from(classTeacherAssignments)
      .where(eq(classTeacherAssignments.teacherId, teacher.id))
      .then(rows => rows.map(r => r.classId));

    if (classIds.length === 0) return NextResponse.json([]);

    // Get student leave requests
    const studentLeaveRows = await db
      .select({
        id: leaveRequests.id,
        studentId: leaveRequests.studentId,
        leaveType: leaveRequests.leaveType,
        startDate: leaveRequests.startDate,
        endDate: leaveRequests.endDate,
        reason: leaveRequests.reason,
        status: leaveRequests.status,
        createdAt: leaveRequests.createdAt,
        className: classes.name,
        classSection: classes.section,
      })
      .from(leaveRequests)
      .leftJoin(students, eq(leaveRequests.studentId, students.id))
      .leftJoin(classes, eq(students.classId, classes.id))
      .where(
        and(
          isNull(leaveRequests.userId),
          inArray(students.classId, classIds)
        )
      )
      .orderBy(leaveRequests.createdAt);

    const studentIds = studentLeaveRows.map(r => r.studentId).filter(Boolean) as number[];

    // Get student names
    const studentNameRows = await db
      .select({ id: users.id, name: users.name, studentId: students.id })
      .from(users)
      .leftJoin(students, eq(users.id, students.userId))
      .where(inArray(users.id, studentIds.length > 0 ? studentIds : [-1]));

    // Get parent names
    const parentNameRows = await db
      .select({ parentId: parents.id, parentName: users.name, studentId: studentParents.studentId })
      .from(studentParents)
      .leftJoin(parents, eq(studentParents.parentId, parents.id))
      .leftJoin(users, eq(parents.userId, users.id))
      .where(inArray(studentParents.studentId, studentIds.length > 0 ? studentIds : [-1]));

    const studentNameMap: Record<number, string> = {};
    const parentNameMap: Record<number, string> = {};

    studentNameRows.forEach(u => {
      if (u.studentId) studentNameMap[u.studentId] = u.name ?? "Unknown";
    });

    parentNameRows.forEach(p => {
      if (p.studentId && !parentNameMap[p.studentId] && p.parentName) {
        parentNameMap[p.studentId] = p.parentName;
      }
    });

    const result = studentLeaveRows.map((r) => ({
      id: r.id,
      studentName: r.studentId && studentNameMap[r.studentId] ? studentNameMap[r.studentId] : "Unknown",
      className: r.className 
        ? `${r.className}${r.classSection ? ` ${r.classSection}` : ""}` 
        : "Unknown",
      parentName: r.studentId && parentNameMap[r.studentId] ? parentNameMap[r.studentId] : "—",
      leaveType: r.leaveType,
      startDate: typeof r.startDate === "string" ? r.startDate : (r.startDate ? new Date(r.startDate).toISOString().split("T")[0] : ""),
      endDate: typeof r.endDate === "string" ? r.endDate : (r.endDate ? new Date(r.endDate).toISOString().split("T")[0] : ""),
      reason: r.reason,
      status: r.status as "pending" | "approved" | "rejected",
      submittedAt: typeof r.createdAt === "string" ? r.createdAt : (r.createdAt ? new Date(r.createdAt).toISOString() : ""),
    }));

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRole("teacher");
    const [teacher] = await db
      .select({ id: teachers.id })
      .from(teachers)
      .where(eq(teachers.userId, user.id))
      .limit(1);

    if (!teacher) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const body = await request.json();
    const { leaveId, action, remarks } = body;

    if (!leaveId || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // Verify this leave is for one of teacher's classes
    const [leave] = await db
      .select({ id: leaveRequests.id })
      .from(leaveRequests)
      .leftJoin(students, eq(leaveRequests.studentId, students.id))
      .leftJoin(classTeacherAssignments, eq(students.classId, classTeacherAssignments.classId))
      .where(
        and(
          eq(leaveRequests.id, leaveId),
          eq(classTeacherAssignments.teacherId, teacher.id)
        )
      )
      .limit(1);

    if (!leave) return NextResponse.json({ error: "Leave request not found or not authorized" }, { status: 404 });

    const status = action === "approve" ? "approved" : "rejected";
    await updateLeaveStatus(leaveId, status, remarks);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}