import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { teachers, classSubjects, classes, subjects } from "@/lib/schema";
import { eq } from "drizzle-orm";
import TeacherDiaryClient from "@/components/teacher/TeacherDiaryClient";

export const dynamic = "force-dynamic";

export default async function TeacherDiaryPage() {
  const user = await requireRole("teacher");

  const [teacher] = await db
    .select({ id: teachers.id, schoolId: teachers.schoolId })
    .from(teachers)
    .where(eq(teachers.userId, user.id))
    .limit(1);

  if (!teacher) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 text-center text-muted">
        Teacher profile not found.
      </div>
    );
  }

  // Fetch teacher's assigned classes and subjects
  const mappings = await db
    .select({
      classId: classSubjects.classId,
      className: classes.name,
      classSection: classes.section,
      subjectId: classSubjects.subjectId,
      subjectName: subjects.name,
    })
    .from(classSubjects)
    .leftJoin(classes, eq(classes.id, classSubjects.classId))
    .leftJoin(subjects, eq(subjects.id, classSubjects.subjectId))
    .where(eq(classSubjects.teacherId, teacher.id));

  return (
    <TeacherDiaryClient
      teacherId={teacher.id}
      mappings={mappings.map(m => ({
        classId: m.classId,
        className: (m.className || "") + (m.classSection ? ` ${m.classSection}` : ""),
        subjectId: m.subjectId,
        subjectName: m.subjectName || "Unknown",
      }))}
    />
  );
}
