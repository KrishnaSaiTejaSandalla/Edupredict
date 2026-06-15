import { requireRole } from "@/lib/auth";
import { getStudentDetails } from "@/lib/student-actions";
import PageHeader from "@/components/shared/PageHeader";

export const dynamic = "force-dynamic";

export default async function StudentOverviewPage() {
  const user = await requireRole("student");
  const student = await getStudentDetails(user.id);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      <PageHeader tag="Student Portal" title="Academic Overview" description="Your academic profile summary, semester information, and key metrics." />

      <div className="rounded-2xl border border-theme bg-surface p-6">
        <h2 className="text-base font-bold text-primary border-b border-theme pb-3 mb-4">Profile Summary</h2>
        <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
          <div><dt className="text-xs text-muted">Student Name</dt><dd className="mt-1 text-sm font-semibold text-primary">{user.name}</dd></div>
          <div><dt className="text-xs text-muted">Class & Section</dt><dd className="mt-1 text-sm font-semibold text-primary">{student?.displayClass || "—"}</dd></div>
          <div><dt className="text-xs text-muted">Roll Number</dt><dd className="mt-1 text-sm font-semibold text-primary">{student?.rollNumber || "—"}</dd></div>
          <div><dt className="text-xs text-muted">Email Address</dt><dd className="mt-1 text-sm font-semibold text-primary">{user.email || "—"}</dd></div>
        </dl>
      </div>
    </div>
  );
}
