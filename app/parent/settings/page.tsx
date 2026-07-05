import ParentSettingsClient from "@/components/parent/ParentSettingsClient";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, userPreferences, userAvatars, parents } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { getParentChildren, generateParentAvatars } from "@/lib/parent-actions";

export const dynamic = "force-dynamic";

export default async function ParentSettingsPage() {
  const authUser = await requireRole("parent");

  const [dbUser] = await db.select().from(users).where(eq(users.id, authUser.id)).limit(1);
  const [parentRecord] = await db.select().from(parents).where(eq(parents.userId, authUser.id)).limit(1);

  const myChildren = await getParentChildren(authUser.id);

  let avatars = dbUser
    ? await db.select().from(userAvatars).where(eq(userAvatars.userId, dbUser.id)).orderBy(userAvatars.id)
    : [];

  // Automatically pre-generate 15 parent avatars on load if we have less than 15
  if (dbUser && avatars.length < 15) {
    await generateParentAvatars(dbUser.id);
    avatars = await db.select().from(userAvatars).where(eq(userAvatars.userId, dbUser.id)).orderBy(userAvatars.id);
  }

  const userData = dbUser ? {
    id: dbUser.id,
    name: dbUser.name,
    email: dbUser.email,
    profileImageUrl: dbUser.profileImageUrl,
    phoneNumber: parentRecord?.phoneNumber || dbUser.phoneNumber || "",
    address: parentRecord?.address || "",
    notificationPreferences: dbUser.notificationPreferences,
  } : {
    id: authUser.id,
    name: authUser.name,
    email: authUser.email || "",
    profileImageUrl: null,
    phoneNumber: "",
    address: "",
    notificationPreferences: null,
  };

  return (
    <main className="min-h-screen bg-base p-4 sm:p-6 lg:p-8 text-primary transition-colors duration-200">
      <ParentSettingsClient
        user={userData}
        students={myChildren}
        userAvatars={avatars}
      />
    </main>
  );
}
