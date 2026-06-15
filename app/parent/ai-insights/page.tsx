import { requireRole } from "@/lib/auth";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

export const dynamic = "force-dynamic";

export default async function ParentAiInsightsPage() {
  await requireRole("parent");

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      <PageHeader tag="Parent Portal" title="AI Insights" description="AI-generated academic insights and performance predictions for your child." />
      <EmptyState
        icon={<svg viewBox="0 0 24 24" className="h-6 w-6 fill-current"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" /></svg>}
        title="AI-Powered Insights"
        message="Personalized AI insights for your child's academic performance, risk assessments, and study recommendations will appear here as data is collected."
      />
    </div>
  );
}
