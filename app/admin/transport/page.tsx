import { requireRole } from "@/lib/auth";
import { getAllBuses, getAllRoutes } from "@/lib/transport-actions";
import { getAdminTrackingSnapshots } from "@/lib/bus-tracking.service";
import TransportClient from "@/components/admin/TransportClient";

export const dynamic = "force-dynamic";

export default async function AdminTransportPage() {
  const user = await requireRole("admin");
  const [initialBuses, initialRoutes, trackingSnapshots] = await Promise.all([
    getAllBuses(),
    getAllRoutes(),
    getAdminTrackingSnapshots(user.school?.id ?? null),
  ]);

  return (
    <main className="min-h-screen space-y-8 bg-background text-foreground p-4 sm:p-6 lg:p-8">
      <TransportClient
        initialBuses={initialBuses}
        initialRoutes={initialRoutes}
        initialTrackingSnapshots={trackingSnapshots}
      />
    </main>
  );
}
