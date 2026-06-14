import { requireRole } from "@/lib/auth";
import { getAllLeaveRequests } from "@/lib/leave-actions";
import LeavesClient from "@/components/admin/LeavesClient";

export const dynamic = "force-dynamic";

export default async function AdminLeavesPage() {
  await requireRole("admin");
  const initialRequests = await getAllLeaveRequests();

  return (
    <main className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8">
      <LeavesClient initialRequests={initialRequests} />
    </main>
  );
}
