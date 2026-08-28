import { requireRole } from "@/lib/auth";
import { getAnnouncements } from "@/lib/announcement-actions";
import AdminAnnouncementsClient from "@/components/admin/AdminAnnouncementsClient";

export const dynamic = "force-dynamic";

export default async function AdminAnnouncementsPage() {
  await requireRole("admin");
  const initialAnnouncements = await getAnnouncements();

  return (
    <main className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8">
      <AdminAnnouncementsClient initialAnnouncements={initialAnnouncements as any} />
    </main>
  );
}
