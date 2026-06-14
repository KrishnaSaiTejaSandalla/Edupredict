import { requireRole } from "@/lib/auth";
import { getAllBuses } from "@/lib/transport-actions";
import TransportClient from "@/components/admin/TransportClient";

export const dynamic = "force-dynamic";

export default async function AdminTransportPage() {
  await requireRole("admin");
  const initialBuses = await getAllBuses();

  return (
    <main className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8">
      <TransportClient initialBuses={initialBuses} />
    </main>
  );
}
