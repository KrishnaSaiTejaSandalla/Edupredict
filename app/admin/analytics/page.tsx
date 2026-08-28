import { Suspense } from "react";
import AnalyticsDashboardClient from "@/components/admin/AnalyticsDashboardClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function AnalyticsPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8 space-y-8 animate-pulse">
        <div className="h-8 w-64 bg-muted rounded-xl"></div>
        <div className="h-4 w-96 bg-muted rounded-lg mt-2"></div>
        <div className="h-80 bg-muted rounded-2xl"></div>
      </main>
    }>
      <AnalyticsDashboardClient />
    </Suspense>
  );
}
