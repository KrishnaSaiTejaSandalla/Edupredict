import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, teachers, userPreferences, userAvatars } from "@/lib/schema";
import { eq } from "drizzle-orm";
import TeacherSettingsClient from "@/components/teacher/TeacherSettingsClient";

export const dynamic = "force-dynamic";

export default async function TeacherSettingsPage() {
  const authUser = await requireRole("teacher");

  const [dbUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, authUser.id))
    .limit(1);

  const [teacher] = await db
    .select()
    .from(teachers)
    .where(eq(teachers.userId, authUser.id))
    .limit(1);

  const [prefs] = dbUser
    ? await db.select().from(userPreferences).where(eq(userPreferences.userId, dbUser.id)).limit(1)
    : [];

  const avatarList = dbUser
    ? await db.select().from(userAvatars).where(eq(userAvatars.userId, dbUser.id))
    : [];

  return (
    <main className="min-h-screen bg-base p-4 sm:p-6 lg:p-8 text-primary transition-colors duration-200">
      <TeacherSettingsClient
        user={dbUser
          ? {
              id: dbUser.id,
              name: dbUser.name,
              email: dbUser.email,
              bio: dbUser.bio,
              profileImageUrl: dbUser.profileImageUrl,
              designation: dbUser.designation,
              phoneNumber: dbUser.phoneNumber,
              notificationPreferences: dbUser.notificationPreferences,
              appearancePreferences: dbUser.appearancePreferences,
            }
          : {
              id: authUser.id,
              name: authUser.name,
              email: authUser.email || "",
              bio: null,
              profileImageUrl: null,
              designation: null,
              phoneNumber: null,
              notificationPreferences: null,
              appearancePreferences: null,
            }}
        teacher={teacher
          ? {
              id: teacher.id,
              employeeId: teacher.employeeId,
              department: teacher.department,
              qualification: teacher.qualification,
              experience: teacher.experience,
            }
          : null}
        userPreferences={prefs || null}
        userAvatars={avatarList}
      />
    </main>
  );
}
