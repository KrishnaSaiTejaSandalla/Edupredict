import { requireRole } from "@/lib/auth";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

export const dynamic = "force-dynamic";

export default async function ParentBusTrackingPage() {
  await requireRole("parent");

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      <PageHeader tag="Parent Portal" title="Bus Tracking" description="Track your child's school bus in real-time during active trips." />
      <EmptyState
        icon={<svg viewBox="0 0 24 24" className="h-6 w-6 fill-current"><path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10Zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17Zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5Zm1.5-6H6V6h12v5Z" /></svg>}
        title="Bus Tracking"
        message="Live bus location tracking is available only during active trip hours. Your child's assigned bus route and real-time position will appear here."
      />
    </div>
  );
}
