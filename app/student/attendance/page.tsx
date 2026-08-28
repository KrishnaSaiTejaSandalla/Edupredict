import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { students, attendance } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import StudentAttendanceClient from "@/components/student/StudentAttendanceClient";

export const dynamic = "force-dynamic";

export default async function StudentAttendancePage() {
  const user = await requireRole("student");

  const [studentRow] = await db
    .select({ id: students.id })
    .from(students)
    .where(eq(students.userId, user.id))
    .limit(1);

  if (!studentRow) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 text-center text-muted">
        Student profile not found.
      </div>
    );
  }

  const studentId = studentRow.id;

  const records = await db
    .select({
      id: attendance.id,
      date: attendance.attendanceDate,
      status: attendance.status,
      remarks: attendance.remarks,
      topicTaught: attendance.topicTaught,
    })
    .from(attendance)
    .where(eq(attendance.studentId, studentId))
    .orderBy(desc(attendance.attendanceDate))
    .limit(100);

  const formattedRecords = records.map(r => ({
    ...r,
    date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date)
  }));

  return <StudentAttendanceClient initialRecords={formattedRecords} />;
}
