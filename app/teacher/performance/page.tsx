import { requireRole } from "@/lib/auth";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

export const dynamic = "force-dynamic";

export default async function TeacherPerformancePage() {
  await requireRole("teacher");

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      <PageHeader
        tag="Faculty Portal"
        title="Performance"
        description="Track student performance trends, class-wise analytics, and subject-level insights."
      />

      <EmptyState
        icon={
          <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
            <path d="M4 19h16v2H4v-2Zm2-2h3V9H6v8Zm5 0h3V4h-3v13Zm5 0h3v-6h-3v6Z" />
          </svg>
        }
        title="Performance Analytics"
        message="Performance charts and analytics for your classes will appear here. View trends in student scores, attendance correlation, and subject-wise breakdowns."
      />
    </div>
  );
}
