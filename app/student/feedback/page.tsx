import { requireRole } from "@/lib/auth";
import { getFeedbackByUser } from "@/lib/feedback-actions";
import StudentFeedbackClient from "@/components/student/StudentFeedbackClient";
import { db } from "@/lib/db";
import { students, schools, classSubjects, teachers, users, subjects } from "@/lib/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function StudentFeedbackPage() {
  const user = await requireRole("student");
  const initialHistory = await getFeedbackByUser(user.id);

  const [studentRow] = await db
    .select({ id: students.id, classId: students.classId, schoolId: students.schoolId })
    .from(students)
    .where(eq(students.userId, user.id))
    .limit(1);

  if (!studentRow) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 text-center text-muted">
        Student profile not found.
      </div>
    );
  }

  const [schoolConfig] = await db
    .select({
      monthlyFeedbackOpen: schools.monthlyFeedbackOpen,
      teacherFeedbackOpen: schools.teacherFeedbackOpen,
      schoolSurveyOpen: schools.schoolSurveyOpen,
    })
    .from(schools)
    .where(eq(schools.id, studentRow.schoolId))
    .limit(1);

  const teachersList = await db
    .select({
      id: teachers.id,
      name: users.name,
      subjectName: subjects.name,
    })
    .from(classSubjects)
    .leftJoin(teachers, eq(teachers.id, classSubjects.teacherId))
    .leftJoin(users, eq(users.id, teachers.userId))
    .leftJoin(subjects, eq(subjects.id, classSubjects.subjectId))
    .where(eq(classSubjects.classId, studentRow.classId));

  return (
    <main className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8">
      <StudentFeedbackClient 
        initialHistory={initialHistory as any}
        schoolConfig={schoolConfig || { monthlyFeedbackOpen: false, teacherFeedbackOpen: false, schoolSurveyOpen: false }}
        teachers={teachersList.filter(t => t.id && t.name) as { id: number; name: string; subjectName: string | null }[]}
      />
    </main>
  );
}
