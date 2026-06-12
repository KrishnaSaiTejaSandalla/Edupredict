import SettingsClient from "@/components/admin/SettingsClient";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, schools } from "@/lib/schema";
import { eq } from "drizzle-orm";

export default async function SettingsPage() {
  const authUser = await requireRole("admin");

  const [dbUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, authUser.id))
    .limit(1);

  const school = dbUser?.schoolId
    ? (await db.select().from(schools).where(eq(schools.id, dbUser.schoolId)).limit(1))[0] || null
    : null;

  return (
    <main className="min-h-screen bg-[#070b16] p-4 sm:p-6 lg:p-8">
      <SettingsClient
        user={dbUser ? { 
          id: dbUser.id, 
          name: dbUser.name, 
          email: dbUser.email, 
          schoolId: dbUser.schoolId,
          notificationPreferences: dbUser.notificationPreferences,
          appearancePreferences: dbUser.appearancePreferences
        } : { 
          id: authUser.id, 
          name: authUser.name, 
          email: authUser.email || "", 
          schoolId: null,
          notificationPreferences: null,
          appearancePreferences: null
        }}
        school={school}
      />
    </main>
  );
}
