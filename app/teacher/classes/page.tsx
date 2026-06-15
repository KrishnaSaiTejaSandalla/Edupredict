import { requireRole } from "@/lib/auth";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

export const dynamic = "force-dynamic";

export default async function TeacherClassesPage() {
  await requireRole("teacher");

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      <PageHeader
        tag="Faculty Portal"
        title="My Classes"
        description="View and manage your assigned classes, subjects, and student rosters."
      />

      <EmptyState
        icon={
          <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
            <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2ZM6 4h5v8l-2.5-1.5L6 12V4Z" />
          </svg>
        }
        title="My Classes"
        message="Your assigned classes will appear here. View class rosters, student performance, and subject assignments once configured by the administrator."
      />
    </div>
  );
}
