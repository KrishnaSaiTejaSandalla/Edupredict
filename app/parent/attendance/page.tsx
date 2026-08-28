import { requireRole } from "@/lib/auth";
import { getParentChildren } from "@/lib/parent-actions";
import { db } from "@/lib/db";
import { attendance, leaveRequests } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import ParentAttendanceClient from "@/components/parent/ParentAttendanceClient";

export const dynamic = "force-dynamic";

export default async function ParentAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const user = await requireRole("parent");
  const childrenList = await getParentChildren(user.id);

  if (childrenList.length === 0) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 text-center text-muted">
        <div className="max-w-md mx-auto rounded-2xl border border-theme bg-surface p-8 space-y-4">
          <h2 className="text-lg font-bold text-primary">No Linked Profiles</h2>
          <p className="text-xs text-secondary leading-relaxed">
            No student profiles are currently linked to your parent account. Please contact the school administration to map your children.
          </p>
        </div>
      </div>
    );
  }

  const params = await searchParams;
  const studentIdParam = params?.studentId;
  const selectedStudent = studentIdParam
    ? childrenList.find((c) => c.studentId === Number(studentIdParam)) || childrenList[0]
    : childrenList[0];

  const studentId = selectedStudent.studentId;

  // 1. Fetch Attendance logs
  const rawAtt = await db
    .select({
      id: attendance.id,
      attendanceDate: attendance.attendanceDate,
      status: attendance.status,
      remarks: attendance.remarks,
    })
    .from(attendance)
    .where(eq(attendance.studentId, studentId))
    .orderBy(desc(attendance.attendanceDate));

  const formattedAttendance: any[] = rawAtt.map((r) => ({
    id: r.id,
    attendanceDate: r.attendanceDate instanceof Date ? r.attendanceDate.toISOString().split("T")[0] : String(r.attendanceDate),
    status: r.status as "present" | "absent" | "late",
    remarks: r.remarks,
  }));

  // 2. Fetch Leave history
  const rawLeaves = await db
    .select({
      id: leaveRequests.id,
      schoolId: leaveRequests.schoolId,
      userId: leaveRequests.userId,
      studentId: leaveRequests.studentId,
      leaveType: leaveRequests.leaveType,
      startDate: leaveRequests.startDate,
      endDate: leaveRequests.endDate,
      reason: leaveRequests.reason,
      status: leaveRequests.status,
      remarks: leaveRequests.remarks,
      createdAt: leaveRequests.createdAt,
    })
    .from(leaveRequests)
    .where(eq(leaveRequests.studentId, studentId))
    .orderBy(desc(leaveRequests.createdAt));

  const formattedLeaves: any[] = rawLeaves.map((r) => ({
    id: r.id,
    schoolId: r.schoolId,
    userId: r.userId,
    studentId: r.studentId,
    leaveType: r.leaveType,
    startDate: (r.startDate as any) instanceof Date ? (r.startDate as any).toISOString().split("T")[0] : String(r.startDate),
    endDate: (r.endDate as any) instanceof Date ? (r.endDate as any).toISOString().split("T")[0] : String(r.endDate),
    reason: r.reason,
    status: r.status as "pending" | "approved" | "rejected",
    remarks: r.remarks,
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <ParentAttendanceClient
      childrenList={childrenList}
      selectedStudent={selectedStudent}
      initialAttendance={formattedAttendance}
      initialLeaves={formattedLeaves}
    />
  );
}
