import { requireRole } from "@/lib/auth";
import AuditActiveClient from "@/components/admin/AuditActiveClient";

export const dynamic = "force-dynamic";

export default async function AdminAuditActivePage() {
  await requireRole("admin");

  return (
    <main className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8">
      <AuditActiveClient />
    </main>
  );
}
