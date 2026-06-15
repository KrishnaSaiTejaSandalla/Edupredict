import { requireRole } from "@/lib/auth";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

export const dynamic = "force-dynamic";

export default async function TeacherMessagesPage() {
  await requireRole("teacher");

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      <PageHeader
        tag="Faculty Portal"
        title="Messages"
        description="Communicate with parents, students, and school administration."
      />

      <EmptyState
        icon={
          <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
            <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
          </svg>
        }
        title="Message Center"
        message="Your messages from parents, students, and administration will appear here. Start a conversation to communicate directly."
      />
    </div>
  );
}
