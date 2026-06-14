import { requireRole } from "@/lib/auth";
import { getFeedbackByUser } from "@/lib/feedback-actions";
import StudentFeedbackClient from "@/components/student/StudentFeedbackClient";

export const dynamic = "force-dynamic";

export default async function StudentFeedbackPage() {
  const user = await requireRole("student");
  const initialHistory = await getFeedbackByUser(user.id);

  return (
    <main className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8">
      <StudentFeedbackClient initialHistory={initialHistory as any} />
    </main>
  );
}
