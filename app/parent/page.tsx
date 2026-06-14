import { requireRole } from "@/lib/auth";
import { getParentChildren } from "@/lib/parent-actions";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ParentPage() {
  const user = await requireRole("parent");
  const children = await getParentChildren(user.id);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Welcome Block */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-500 dark:text-cyan-400">
          Parent Portal
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
          Welcome back, {user.name}
        </h1>
        <p className="mt-2 text-sm text-secondary">
          Monitor your children's academic weekly timetables, request student leaves, and provide operational feedback.
        </p>
      </div>

      {/* Children list summary */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-primary">Student Summaries</h2>
        {children.length === 0 ? (
          <div className="rounded-2xl border border-theme bg-surface p-8 text-center text-sm font-medium text-muted">
            No student profiles are currently linked to your parent account. Please contact administration.
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            {children.map((child) => (
              <div
                key={child.studentId}
                className="rounded-2xl border border-theme bg-surface p-5 space-y-4 shadow-sm"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-bold text-primary">{child.name}</h3>
                    <p className="text-xs text-muted mt-0.5">{child.email}</p>
                  </div>
                  <span className="rounded bg-hover px-2.5 py-1 text-[10px] font-bold text-cyan-400 capitalize">
                    {child.gender || "Student"}
                  </span>
                </div>

                <dl className="grid grid-cols-2 gap-4 border-t border-subtle pt-4 text-xs">
                  <div>
                    <dt className="text-muted font-medium">Class / Section</dt>
                    <dd className="mt-1 font-semibold text-primary">{child.displayClass}</dd>
                  </div>
                  <div>
                    <dt className="text-muted font-medium">Roll Number</dt>
                    <dd className="mt-1 font-semibold text-primary">{child.rollNumber || "—"}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick shortcuts */}
      <div className="grid gap-6 sm:grid-cols-3">
        {/* Timetable Card */}
        <div className="rounded-2xl border border-theme bg-surface p-6 space-y-4">
          <h2 className="text-base font-bold text-primary">Class Timetables</h2>
          <p className="text-xs text-secondary leading-relaxed">
            Check weekly lesson slots and schedules for your child.
          </p>
          <Link
            href="/parent/timetable"
            className="inline-flex rounded-xl btn-blue px-4 py-2 text-xs font-semibold"
          >
            View Timetables
          </Link>
        </div>

        {/* Leaves Card */}
        <div className="rounded-2xl border border-theme bg-surface p-6 space-y-4">
          <h2 className="text-base font-bold text-primary">Student Leaves</h2>
          <p className="text-xs text-secondary leading-relaxed">
            Submit leave requests on behalf of children and track status.
          </p>
          <Link
            href="/parent/leaves"
            className="inline-flex rounded-xl btn-cyan px-4 py-2 text-xs font-semibold"
          >
            Apply for Leaves
          </Link>
        </div>

        {/* Feedback Card */}
        <div className="rounded-2xl border border-theme bg-surface p-6 space-y-4">
          <h2 className="text-base font-bold text-primary">Feedback Form</h2>
          <p className="text-xs text-secondary leading-relaxed">
            Submit reviews or requests about academics, transit, or facilities.
          </p>
          <Link
            href="/parent/feedback"
            className="inline-flex rounded-xl border border-theme bg-surface px-4 py-2 text-xs font-semibold text-primary hover:bg-hover transition"
          >
            Submit Feedback
          </Link>
        </div>
      </div>
    </div>
  );
}
