import { requireRole } from "@/lib/auth";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

export const dynamic = "force-dynamic";

export default async function TeacherMarksPage() {
  await requireRole("teacher");

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      <PageHeader
        tag="Faculty Portal"
        title="Marks Entry"
        description="Enter and manage examination marks for your assigned classes and subjects."
      />

      <EmptyState
        icon={
          <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
            <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6Zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2Zm-1 9h-4v4h-2v-4H9V9h4V5h2v4h4v2Z" />
          </svg>
        }
        title="Marks Entry"
        message="Select a class, subject, and exam to enter student marks. Marks entry is enabled only for your assigned subjects."
      />
    </div>
  );
}
