import { requireRole } from "@/lib/auth";
import { getParentChildren } from "@/lib/parent-actions";
import { getLeaveRequestsByUser } from "@/lib/leave-actions";
import ParentLeavesClient from "@/components/parent/ParentLeavesClient";

export const dynamic = "force-dynamic";

export default async function ParentLeavesPage() {
  const user = await requireRole("parent");

  const [children, initialHistory] = await Promise.all([
    getParentChildren(user.id),
    getLeaveRequestsByUser(user.id),
  ]);

  return (
    <main className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8">
      <ParentLeavesClient
        childrenList={children}
        initialHistory={initialHistory as any}
      />
    </main>
  );
}
