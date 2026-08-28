import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, students, studentAvatarSelections, userPreferences } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import StudentSettingsClient from "@/components/student/StudentSettingsClient";

export const dynamic = "force-dynamic";

export default async function StudentSettingsPage() {
  const authUser = await requireRole("student");

  const [dbUser] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      bio: users.bio,
      profileImageUrl: users.profileImageUrl,
      phoneNumber: users.phoneNumber,
      notificationPreferences: users.notificationPreferences,
      appearancePreferences: users.appearancePreferences,
    })
    .from(users)
    .where(eq(users.id, authUser.id))
    .limit(1);

  const [student] = await db
    .select()
    .from(students)
    .where(eq(students.userId, authUser.id))
    .limit(1);

  const [userPref] = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, authUser.id))
    .limit(1);

  const studentAvatars = student
    ? await db
        .select({
          id: studentAvatarSelections.id,
          avatarType: studentAvatarSelections.avatarType,
          imageUrl: studentAvatarSelections.imageUrl,
          isSelected: studentAvatarSelections.isSelected,
          createdAt: studentAvatarSelections.createdAt,
        })
        .from(studentAvatarSelections)
        .where(eq(studentAvatarSelections.studentId, student.id))
        .orderBy(desc(studentAvatarSelections.createdAt))
    : [];

  return (
    <StudentSettingsClient
      user={dbUser ? {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        bio: dbUser.bio ?? null,
        profileImageUrl: dbUser.profileImageUrl ?? null,
        phoneNumber: dbUser.phoneNumber ?? null,
        notificationPreferences: dbUser.notificationPreferences ?? null,
        appearancePreferences: dbUser.appearancePreferences ?? null,
        learningGoal: student?.learningGoal ?? null,
        interests: student?.interests ?? null,
      } : {
        id: authUser.id,
        name: authUser.name,
        email: authUser.email || "",
        bio: null,
        profileImageUrl: null,
        phoneNumber: null,
        notificationPreferences: null,
        appearancePreferences: null,
        learningGoal: student?.learningGoal ?? null,
        interests: student?.interests ?? null,
      }}
      userPreferences={userPref || null}
      userAvatars={studentAvatars}
    />
  );
}
