import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { students, studentDiaries, studentDiaryProgress, subjects, teachers, users } from "@/lib/schema";
import { eq, and, desc } from "drizzle-orm";
import StudentDiaryClient from "@/components/student/StudentDiaryClient";

export const dynamic = "force-dynamic";

export default async function StudentDiaryPage() {
  const user = await requireRole("student");

  const [studentRow] = await db
    .select({ id: students.id, classId: students.classId })
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

  // Fetch diary entries for this student's class
  const entries = await db
    .select({
      id: studentDiaries.id,
      topicTaught: studentDiaries.topicTaught,
      homework: studentDiaries.homework,
      date: studentDiaries.date,
      subjectId: studentDiaries.subjectId,
      subjectName: subjects.name,
      teacherName: users.name,
    })
    .from(studentDiaries)
    .leftJoin(subjects, eq(subjects.id, studentDiaries.subjectId))
    .leftJoin(teachers, eq(teachers.id, studentDiaries.teacherId))
    .leftJoin(users, eq(users.id, teachers.userId))
    .where(eq(studentDiaries.classId, studentRow.classId))
    .orderBy(desc(studentDiaries.date))
    .limit(50);

  // Fetch homework completion progress for this student
  const progressList = await db
    .select({
      diaryId: studentDiaryProgress.diaryId,
      isCompleted: studentDiaryProgress.isCompleted,
    })
    .from(studentDiaryProgress)
    .where(eq(studentDiaryProgress.studentId, studentRow.id));

  const formattedEntries = entries.map(e => ({
    ...e,
    date: e.date instanceof Date ? e.date.toISOString().split('T')[0] : String(e.date)
  }));

  return (
    <StudentDiaryClient
      initialEntries={formattedEntries}
      initialProgress={progressList}
    />
  );
}
