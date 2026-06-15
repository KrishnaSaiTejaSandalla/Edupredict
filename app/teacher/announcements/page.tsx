import { requireRole } from "@/lib/auth";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

export const dynamic = "force-dynamic";

export default async function TeacherAnnouncementsPage() {
  await requireRole("teacher");

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      <PageHeader
        tag="Faculty Portal"
        title="Announcements"
        description="View school-wide announcements and post updates for your assigned classes."
      />

      <EmptyState
        icon={
          <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2Zm0 14H5.17l-.59.59-.58.58V4h16v12ZM11 12h2v2h-2v-2Zm0-6h2v4h-2V6Z" />
          </svg>
        }
        title="Announcements"
        message="School announcements and class-specific updates will be displayed here. Stay informed about important dates and events."
      />
    </div>
  );
}
