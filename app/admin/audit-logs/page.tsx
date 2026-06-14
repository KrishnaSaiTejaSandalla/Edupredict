import { requireRole } from "@/lib/auth";
import { getAuditLogs, getAuditStats } from "@/lib/audit-utils";
import AuditLogsClient from "@/components/admin/AuditLogsClient";

export const dynamic = "force-dynamic";

export default async function AdminAuditLogsPage() {
  await requireRole("admin");

  const [initialLogs, stats] = await Promise.all([
    getAuditLogs(),
    getAuditStats(),
  ]);

  return (
    <main className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8">
      <AuditLogsClient initialLogs={initialLogs as any} stats={stats} />
    </main>
  );
}
