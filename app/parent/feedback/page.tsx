import { requireRole } from "@/lib/auth";
import { getFeedbackByUser } from "@/lib/feedback-actions";
import ParentFeedbackClient from "@/components/parent/ParentFeedbackClient";

export const dynamic = "force-dynamic";

export default async function ParentFeedbackPage() {
  const user = await requireRole("parent");
  const initialHistory = await getFeedbackByUser(user.id);

  return (
    <main className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8">
      <ParentFeedbackClient initialHistory={initialHistory as any} />
    </main>
  );
}
