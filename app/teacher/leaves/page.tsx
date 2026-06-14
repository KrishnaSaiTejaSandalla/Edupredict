import { requireRole } from "@/lib/auth";
import { getLeaveRequestsByUser } from "@/lib/leave-actions";
import TeacherLeavesClient from "@/components/teacher/TeacherLeavesClient";

export const dynamic = "force-dynamic";

export default async function TeacherLeavesPage() {
  const user = await requireRole("teacher");
  const initialHistory = await getLeaveRequestsByUser(user.id);

  return (
    <main className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8">
      <TeacherLeavesClient initialHistory={initialHistory as any} />
    </main>
  );
}
