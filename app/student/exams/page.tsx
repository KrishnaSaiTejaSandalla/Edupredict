import { requireRole } from "@/lib/auth";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

export const dynamic = "force-dynamic";

export default async function StudentExamsPage() {
  await requireRole("student");
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      <PageHeader tag="Student Portal" title="Exams" description="View upcoming examination schedules, subjects, and dates." />
      <EmptyState
        icon={<svg viewBox="0 0 24 24" className="h-6 w-6 fill-current"><path d="M6 3h12v18H6V3Zm3 4h6V5H9v2Zm0 4h6V9H9v2Zm0 4h4v-2H9v2Z" /></svg>}
        title="Exam Schedule"
        message="Your upcoming exam schedule including subjects, dates, and timings will appear here when announced."
      />
    </div>
  );
}
