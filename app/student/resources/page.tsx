import { requireRole } from "@/lib/auth";
import { getStudentResources } from "@/lib/student-resources.service";
import { db } from "@/lib/db";
import { classSubjects, subjects, students } from "@/lib/schema";
import { eq } from "drizzle-orm";
import StudentResourcesClient from "@/components/student/StudentResourcesClient";

export const dynamic = "force-dynamic";

export default async function StudentResourcesPage() {
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

  // Fetch student's class subjects
  const subjectRows = await db
    .select({
      id: subjects.id,
      name: subjects.name,
    })
    .from(classSubjects)
    .leftJoin(subjects, eq(subjects.id, classSubjects.subjectId))
    .where(eq(classSubjects.classId, studentRow.classId));

  const subjectsList = subjectRows
    .map(s => s.name)
    .filter((v, i, a) => v && a.indexOf(v) === i) as string[];

  const resourcesData = await getStudentResources(user.id);

  return (
    <StudentResourcesClient
      subjects={subjectsList}
      initialResources={resourcesData.availableResources.map(r => ({
        ...r,
        createdAt: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString()
      }))}
      initialBookmarkedIds={resourcesData.bookmarkedIds}
      initialProgressList={resourcesData.progressList}
      weakSubjects={resourcesData.weakSubjects}
    />
  );
}
