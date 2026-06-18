import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { teachers } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { getTeacherPerformance } from "@/lib/teacher-performance.service";
import TeacherPerformanceClient from "@/components/teacher/TeacherPerformanceClient";

export const dynamic = "force-dynamic";

export default async function TeacherPerformancePage() {
  const user = await requireRole("teacher");

  const [teacher] = await db
    .select({ id: teachers.id })
    .from(teachers)
    .where(eq(teachers.userId, user.id))
    .limit(1);

  const performance = teacher
    ? await getTeacherPerformance(teacher.id, user.id)
    : {
        kpis: { teacherRating: 0, attendanceCompletionRate: 0, gradingRate: 0, studentSatisfaction: 0 },
        teachingEffectiveness: [],
        classOutcomes: [],
        aiInsights: null,
      };

  return <TeacherPerformanceClient performance={performance} />;
}
