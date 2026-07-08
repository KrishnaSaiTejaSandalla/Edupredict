import { requireRole } from "@/lib/auth";
import { getChatRecipients } from "@/lib/message-actions";
import MessagesClient from "@/components/shared/MessagesClient";

export const dynamic = "force-dynamic";

export default async function AdminMessagesPage() {
  const user = await requireRole("admin");
  const contacts = await getChatRecipients();

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <MessagesClient
        currentUserId={user.id}
        currentUserRole={user.role}
        initialContacts={contacts}
      />
    </main>
  );
}
