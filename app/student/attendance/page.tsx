import { requireRole } from "@/lib/auth";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

export const dynamic = "force-dynamic";

export default async function StudentAttendancePage() {
  await requireRole("student");
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      <PageHeader tag="Student Portal" title="Attendance" description="View your attendance percentage and daily attendance records." />
      <EmptyState
        icon={<svg viewBox="0 0 24 24" className="h-6 w-6 fill-current"><path d="M17 12h-5v5h5v-5ZM16 1v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2Zm3 18H5V8h14v11Z" /></svg>}
        title="Attendance Records"
        message="Your daily attendance records and monthly attendance percentage will appear here once marked by your class teacher."
      />
    </div>
  );
}
