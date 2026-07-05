import { requireRole } from "@/lib/auth";
import { getAnnouncements } from "@/lib/announcement-actions";
import ParentAnnouncementsClient from "@/components/parent/ParentAnnouncementsClient";

export const dynamic = "force-dynamic";

export default async function ParentAnnouncementsPage() {
  await requireRole("parent");
  const list = await getAnnouncements();

  const formattedList = list.map((r) => ({
    id: r.id,
    announcementId: r.announcementId,
    title: r.title,
    message: r.message,
    priority: r.priority,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    attachmentUrl: r.attachmentUrl,
  }));

  return (
    <ParentAnnouncementsClient initialAnnouncements={formattedList} />
  );
}
