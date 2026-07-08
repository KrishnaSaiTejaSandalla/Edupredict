import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { students } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { getLeaveRequestsByUser } from "@/lib/leave-actions";
import StudentLeavesClient from "@/components/student/StudentLeavesClient";

export const dynamic = "force-dynamic";

export default async function StudentLeavesPage() {
  const user = await requireRole("student");

  // Fetch student record for this user
  const [studentRow] = await db
    .select({ id: students.id })
    .from(students)
    .where(eq(students.userId, user.id))
    .limit(1);

  if (!studentRow) {
    return (
      <main className="min-h-screen bg-base p-4 sm:p-6 lg:p-8 text-primary">
        <div className="rounded-2xl border border-theme bg-surface p-8 text-center max-w-md mx-auto">
          <p className="text-sm font-semibold text-secondary">Student Record Not Found</p>
          <p className="text-xs text-muted mt-1">Please ensure your account is correctly associated with a student profile.</p>
        </div>
      </main>
    );
  }

  const initialHistory = await getLeaveRequestsByUser(user.id);

  const formattedHistory = initialHistory.map((h: any) => ({
    id: h.id,
    schoolId: h.schoolId,
    userId: h.userId,
    studentId: h.studentId,
    leaveType: h.leaveType,
    startDate: h.startDate,
    endDate: h.endDate,
    reason: h.reason,
    status: h.status as "pending" | "approved" | "rejected",
    remarks: h.remarks,
    createdAt: h.createdAt,
  }));

  return (
    <main className="min-h-screen bg-base p-4 sm:p-6 lg:p-8 text-primary transition-colors duration-200">
      <StudentLeavesClient
        studentId={studentRow.id}
        initialHistory={formattedHistory}
      />
    </main>
  );
}
