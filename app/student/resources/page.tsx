import { requireRole } from "@/lib/auth";
import { getStudentResources } from "@/lib/student-resources.service";
import { db } from "@/lib/db";
import { classSubjects, subjects } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import StudentResourcesClient from "@/components/student/StudentResourcesClient";
import { students } from "@/lib/schema";

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

  // Fetch student's class subjects to provide options for AI generation
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
      initialRecent={resourcesData.recentResources}
      initialPopular={resourcesData.popularResources}
      initialRecommended={resourcesData.recommendedResources}
      initialNotes={resourcesData.myNotes}
      weakSubjects={resourcesData.weakSubjects}
      recentTopics={resourcesData.recentTopics}
    />
  );
}
