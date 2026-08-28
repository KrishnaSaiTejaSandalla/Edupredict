import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { teachers, teacherClassAssignments, teacherSubjectAssignments, classes, subjects } from "@/lib/schema";
import { eq } from "drizzle-orm";
import ResourcesClient from "@/components/teacher/ResourcesClient";

export const dynamic = "force-dynamic";

export default async function TeacherResourcesPage() {
  const user = await requireRole("teacher");

  const [teacher] = await db
    .select({ id: teachers.id, department: teachers.department })
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

  // Fetch teacher's class assignments — include id AND section so 10-A, 10-B, 10-C are distinct
  const classRows = await db
    .select({ id: classes.id, name: classes.name, section: classes.section })
    .from(teacherClassAssignments)
    .leftJoin(classes, eq(classes.id, teacherClassAssignments.classId))
    .where(eq(teacherClassAssignments.teacherId, teacher.id));

  // Deduplicate by class ID and build label strings like "10 - A"
  const seenIds = new Set<number>();
  const teacherClasses = classRows
    .filter((r) => r.id !== null && !seenIds.has(r.id!) && seenIds.add(r.id!))
    .map((r) => ({
      id: r.id as number,
      label: r.section ? `${r.name} - ${r.section}` : (r.name ?? ""),
    }));

  // Fetch teacher's subject assignments and deduplicate
  const subjectRows = await db
    .select({ name: subjects.name })
    .from(teacherSubjectAssignments)
    .leftJoin(subjects, eq(subjects.id, teacherSubjectAssignments.subjectId))
    .where(eq(teacherSubjectAssignments.teacherId, teacher.id));

  const teacherSubjects = Array.from(
    new Set(subjectRows.map((r) => r.name).filter(Boolean))
  ) as string[];

  return (
    <ResourcesClient
      teacherId={teacher.id}
      department={teacher.department}
      assignedClasses={teacherClasses}
      assignedSubjects={teacherSubjects}
    />
  );
}
