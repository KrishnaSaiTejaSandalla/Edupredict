import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { teachers, timetables, leaveRequests } from "@/lib/schema";
import { eq, sql, and } from "drizzle-orm";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function TeacherPage() {
  const user = await requireRole("teacher");

  // Fetch teacher record
  const [teacher] = await db
    .select()
    .from(teachers)
    .where(eq(teachers.userId, user.id))
    .limit(1);

  let classCount = 0;
  if (teacher) {
    const classCountResult = await db
      .select({ count: sql`count(*)` })
      .from(timetables)
      .where(eq(timetables.teacherId, teacher.id));
    classCount = Number(classCountResult[0]?.count || 0);
  }

  // Fetch pending leave count
  const pendingLeavesResult = await db
    .select({ count: sql`count(*)` })
    .from(leaveRequests)
    .where(
      and(
        eq(leaveRequests.userId, user.id),
        eq(leaveRequests.status, "pending")
      )
    );
  const leavesPending = Number(pendingLeavesResult[0]?.count || 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Welcome Block */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-500 dark:text-cyan-400">
          Faculty Portal
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
          Welcome back, {user.name}
        </h1>
        <p className="mt-2 text-sm text-secondary">
          Here is an overview of your schedule, classes, and leave requests.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Classes Scheduled */}
        <div className="rounded-2xl border border-theme bg-surface p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Classes Scheduled</p>
          <p className="mt-2 text-3xl font-bold text-primary">{classCount}</p>
        </div>

        {/* Pending Leaves */}
        <div className="rounded-2xl border border-theme bg-surface p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-500">Pending Leaves</p>
          <p className="mt-2 text-3xl font-bold text-amber-400">{leavesPending}</p>
        </div>

        {/* Department Info */}
        <div className="rounded-2xl border border-theme bg-surface p-5 shadow-sm sm:col-span-2 lg:col-span-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-purple-500">Department</p>
          <p className="mt-2 text-xl font-bold text-purple-400 truncate">
            {teacher?.department || "General Academics"}
          </p>
        </div>
      </div>

      {/* Quick shortcuts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Schedule panel */}
        <div className="rounded-2xl border border-theme bg-surface p-6 space-y-4">
          <h2 className="text-base font-bold text-primary">Class Schedule</h2>
          <p className="text-xs text-secondary leading-relaxed">
            View your weekly class schedule, subject allocations, and classroom assignments.
          </p>
          <Link
            href="/teacher/timetable"
            className="inline-flex rounded-xl btn-blue px-4 py-2 text-xs font-semibold"
          >
            Go to Timetable
          </Link>
        </div>

        {/* Leave requests panel */}
        <div className="rounded-2xl border border-theme bg-surface p-6 space-y-4">
          <h2 className="text-base font-bold text-primary">Request Time-Off</h2>
          <p className="text-xs text-secondary leading-relaxed">
            Apply for personal or sick leaves, track validation status, and view leave history.
          </p>
          <Link
            href="/teacher/leaves"
            className="inline-flex rounded-xl btn-cyan px-4 py-2 text-xs font-semibold"
          >
            Manage Leaves
          </Link>
        </div>
      </div>

      {/* Profile Details */}
      {teacher && (
        <div className="rounded-2xl border border-theme bg-surface p-6">
          <h2 className="text-base font-bold text-primary border-b border-theme pb-3 mb-4">
            Professional Profile Details
          </h2>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-xs text-muted">Employee ID</dt>
              <dd className="mt-1 text-sm font-semibold text-primary">{teacher.employeeId}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Qualifications</dt>
              <dd className="mt-1 text-sm font-semibold text-primary">{teacher.qualification || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Experience (Years)</dt>
              <dd className="mt-1 text-sm font-semibold text-primary">{teacher.experience ?? "—"} Years</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Phone Number</dt>
              <dd className="mt-1 text-sm font-semibold text-primary">{teacher.phoneNumber || "—"}</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}
