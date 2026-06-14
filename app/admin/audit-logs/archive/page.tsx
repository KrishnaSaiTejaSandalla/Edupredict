import { requireRole } from "@/lib/auth";
import AuditArchiveClient from "@/components/admin/AuditArchiveClient";

export const dynamic = "force-dynamic";

export default async function AdminAuditArchivePage() {
  await requireRole("admin");

  return (
    <main className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8">
      <AuditArchiveClient />
    </main>
  );
}
