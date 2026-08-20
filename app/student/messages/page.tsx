import { requireRole } from "@/lib/auth";
import { getChatRecipients } from "@/lib/message-actions";
import MessagesClient from "@/components/shared/MessagesClient";

export const dynamic = "force-dynamic";

export default async function StudentMessagesPage() {
  const user = await requireRole("student");
  const contacts = await getChatRecipients();

  return (
    <main className="h-[calc(100vh-4.5rem)] flex flex-col overflow-hidden">
      <MessagesClient
        currentUserId={user.id}
        currentUserRole="student"
        initialContacts={contacts}
      />
    </main>
  );
}
