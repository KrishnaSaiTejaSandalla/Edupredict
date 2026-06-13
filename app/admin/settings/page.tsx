import SettingsClient from "@/components/admin/SettingsClient";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, schools, userPreferences, userAvatars } from "@/lib/schema";
import { eq } from "drizzle-orm";

export default async function SettingsPage() {
  const authUser = await requireRole("admin");

  const [dbUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, authUser.id))
    .limit(1);

  let school = dbUser?.schoolId
    ? (await db.select().from(schools).where(eq(schools.id, dbUser.schoolId)).limit(1))[0] || null
    : null;

  if (!school) {
    const [firstSchool] = await db.select().from(schools).limit(1);
    school = firstSchool || null;
  }

  const [prefs] = dbUser
    ? await db.select().from(userPreferences).where(eq(userPreferences.userId, dbUser.id)).limit(1)
    : [];

  const avatars = dbUser
    ? await db.select().from(userAvatars).where(eq(userAvatars.userId, dbUser.id))
    : [];

  return (
    <main className="min-h-screen bg-base p-4 sm:p-6 lg:p-8 text-primary transition-colors duration-200">
      <SettingsClient
        user={dbUser ? {
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email,
          schoolId: dbUser.schoolId,
          bio: dbUser.bio,
          profileImageUrl: dbUser.profileImageUrl,
          designation: dbUser.designation,
          phoneNumber: dbUser.phoneNumber,
          notificationPreferences: dbUser.notificationPreferences,
          appearancePreferences: dbUser.appearancePreferences
        } : {
          id: authUser.id,
          name: authUser.name,
          email: authUser.email || "",
          schoolId: null,
          bio: null,
          profileImageUrl: null,
          designation: null,
          phoneNumber: null,
          notificationPreferences: null,
          appearancePreferences: null
        }}
        school={school}
        userPreferences={prefs || null}
        userAvatars={avatars}
      />
    </main>
  );
}
