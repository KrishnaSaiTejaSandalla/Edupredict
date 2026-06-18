import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { teachers } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { getTeacherExams } from "@/lib/teacher-marks.service";
import { getTeacherClassSubjects } from "@/lib/teacher-assignments.service";
import MarksClient from "@/components/teacher/MarksClient";

export const dynamic = "force-dynamic";

export default async function TeacherMarksPage() {
  const user = await requireRole("teacher");

  const [teacher] = await db
    .select({ id: teachers.id })
    .from(teachers)
    .where(eq(teachers.userId, user.id))
    .limit(1);

  const exams = teacher ? await getTeacherExams(teacher.id) : [];
  const classSubjects = teacher ? await getTeacherClassSubjects(teacher.id) : [];

  return (
    <MarksClient
      teacherId={teacher?.id ?? null}
      teacherUserId={user.id}
      exams={exams as any}
      classSubjects={classSubjects}
    />
  );
}
