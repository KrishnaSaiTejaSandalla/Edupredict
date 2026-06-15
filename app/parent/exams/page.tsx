import { requireRole } from "@/lib/auth";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

export const dynamic = "force-dynamic";

export default async function ParentExamsPage() {
  await requireRole("parent");

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      <PageHeader tag="Parent Portal" title="Exams" description="View upcoming examination schedules and your child's results." />
      <EmptyState
        icon={<svg viewBox="0 0 24 24" className="h-6 w-6 fill-current"><path d="M6 3h12v18H6V3Zm3 4h6V5H9v2Zm0 4h6V9H9v2Zm0 4h4v-2H9v2Z" /></svg>}
        title="Examination Schedule"
        message="Upcoming exams and published results for your child will be displayed here. Check back when exam schedules are announced."
      />
    </div>
  );
}
