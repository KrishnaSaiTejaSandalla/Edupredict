import { requireRole } from "@/lib/auth";
import { getFeedbackByUser } from "@/lib/feedback-actions";
import TeacherFeedbackClient from "@/components/teacher/TeacherFeedbackClient";

export const dynamic = "force-dynamic";

export default async function TeacherFeedbackPage() {
  const user = await requireRole("teacher");
  const initialFeedback = await getFeedbackByUser(user.id);

  return (
    <main className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8">
      <TeacherFeedbackClient initialFeedback={initialFeedback as any} />
    </main>
  );
}
