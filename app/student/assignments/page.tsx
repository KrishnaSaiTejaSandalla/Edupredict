import { requireRole } from "@/lib/auth";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

export const dynamic = "force-dynamic";

export default async function StudentAssignmentsPage() {
  await requireRole("student");
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      <PageHeader tag="Student Portal" title="Assignments" description="View pending and completed assignments from your teachers." />
      <EmptyState
        icon={<svg viewBox="0 0 24 24" className="h-6 w-6 fill-current"><path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2Zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1Zm-2 14-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8Z" /></svg>}
        title="Assignments"
        message="Your pending and completed assignments will appear here. This is a read-only view of assignments posted by your teachers."
      />
    </div>
  );
}
