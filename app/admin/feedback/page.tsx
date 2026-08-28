import { requireRole } from "@/lib/auth";
import { getAllFeedback, getAllHelpTickets } from "@/lib/feedback-actions";
import FeedbackClient from "@/components/admin/FeedbackClient";

export const dynamic = "force-dynamic";

export default async function AdminFeedbackPage() {
  await requireRole("admin");
  const [initialFeedback, initialTickets] = await Promise.all([
    getAllFeedback(),
    getAllHelpTickets(),
  ]);

  return (
    <main className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8">
      <FeedbackClient initialFeedback={initialFeedback as any} initialTickets={initialTickets as any} />
    </main>
  );
}
