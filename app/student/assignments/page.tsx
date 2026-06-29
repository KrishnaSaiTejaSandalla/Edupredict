import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { students, assignments, assignmentSubmissions, subjects } from "@/lib/schema";
import { eq, desc, and } from "drizzle-orm";
import StudentAssignmentsClient from "@/components/student/StudentAssignmentsClient";

export const dynamic = "force-dynamic";

export default async function StudentAssignmentsPage() {
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

  const list = await db
    .select({
      id: assignments.id,
      title: assignments.title,
      description: assignments.description,
      dueDate: assignments.dueDate,
      maxMarks: assignments.maxMarks,
      subjectId: assignments.subjectId,
      subjectName: subjects.name,
    })
    .from(assignments)
    .leftJoin(subjects, eq(subjects.id, assignments.subjectId))
    .where(eq(assignments.classId, studentRow.classId))
    .orderBy(desc(assignments.dueDate));

  const submissions = await db
    .select({
      assignmentId: assignmentSubmissions.assignmentId,
      content: assignmentSubmissions.content,
      fileUrl: assignmentSubmissions.fileUrl,
      submittedAt: assignmentSubmissions.submittedAt,
      grade: assignmentSubmissions.grade,
      feedback: assignmentSubmissions.feedback,
      isLate: assignmentSubmissions.isLate,
    })
    .from(assignmentSubmissions)
    .where(eq(assignmentSubmissions.studentId, studentRow.id));

  const formattedList = list.map(a => ({
    ...a,
    dueDate: a.dueDate instanceof Date ? a.dueDate.toISOString().split('T')[0] : String(a.dueDate)
  }));

  const formattedSubmissions = submissions.map(s => ({
    ...s,
    submittedAt: s.submittedAt instanceof Date ? s.submittedAt.toISOString() : s.submittedAt ? String(s.submittedAt) : null
  }));

  return (
    <StudentAssignmentsClient
      initialAssignments={formattedList}
      submissions={formattedSubmissions}
    />
  );
}
