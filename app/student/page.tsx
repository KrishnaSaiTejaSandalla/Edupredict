import { requireRole } from "@/lib/auth";
import { getStudentDetails } from "@/lib/student-actions";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function StudentPage() {
  const user = await requireRole("student");
  const student = await getStudentDetails(user.id);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Welcome Block */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-500 dark:text-cyan-400">
          Student Portal
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
          Welcome back, {user.name}
        </h1>
        <p className="mt-2 text-sm text-secondary">
          Access your daily lectures schedule and submit feedback directly to school administration.
        </p>
      </div>

      {/* Profile summary card */}
      <div className="rounded-2xl border border-theme bg-surface p-6">
        <h2 className="text-base font-bold text-primary border-b border-theme pb-3 mb-4">
          Academic Profile Summary
        </h2>
        <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs text-muted">Student Name</dt>
            <dd className="mt-1 text-sm font-semibold text-primary">{user.name}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Class & Section</dt>
            <dd className="mt-1 text-sm font-semibold text-primary">{student?.displayClass || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Roll Number</dt>
            <dd className="mt-1 text-sm font-semibold text-primary">{student?.rollNumber || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Email Address</dt>
            <dd className="mt-1 text-sm font-semibold text-primary">{user.email || "—"}</dd>
          </div>
        </dl>
      </div>

      {/* Quick shortcuts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Timetable Card */}
        <div className="rounded-2xl border border-theme bg-surface p-6 space-y-4">
          <h2 className="text-base font-bold text-primary">Class Timetable</h2>
          <p className="text-xs text-secondary leading-relaxed">
            View your class weekly lectures schedule, subject allocations, and classroom room numbers.
          </p>
          <Link
            href="/student/timetable"
            className="inline-flex rounded-xl btn-blue px-4 py-2 text-xs font-semibold"
          >
            Open Timetable
          </Link>
        </div>

        {/* Feedback Card */}
        <div className="rounded-2xl border border-theme bg-surface p-6 space-y-4">
          <h2 className="text-base font-bold text-primary">Submit Feedback</h2>
          <p className="text-xs text-secondary leading-relaxed">
            Send administrative requests or operational feedback regarding classes, transport, or facilities.
          </p>
          <Link
            href="/student/feedback"
            className="inline-flex rounded-xl btn-cyan px-4 py-2 text-xs font-semibold"
          >
            Submit Feedback
          </Link>
        </div>
      </div>
    </div>
  );
}
