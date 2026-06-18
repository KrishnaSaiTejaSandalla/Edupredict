import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { teachers } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { getTeacherDashboardData } from "@/lib/teacher-dashboard.service";
import TeacherDashboardClient from "@/components/teacher/dashboard/TeacherDashboardClient";

export const dynamic = "force-dynamic";

export default async function TeacherDashboardPage() {
  const user = await requireRole("teacher");

  const [teacher] = await db
    .select()
    .from(teachers)
    .where(eq(teachers.userId, user.id))
    .limit(1);

  const dashboard = await getTeacherDashboardData(user.id);

  return (
    <TeacherDashboardClient
      userName={user.name}
      dashboard={dashboard}
      teacherDept={teacher?.department || null}
    />
  );
}
