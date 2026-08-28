import { requireRole } from "@/lib/auth";
import { getParentChildren } from "@/lib/parent-actions";
import { db } from "@/lib/db";
import { assignments, assignmentSubmissions, subjects } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import ParentAssignmentsClient from "@/components/parent/ParentAssignmentsClient";

export const dynamic = "force-dynamic";

export default async function ParentAssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const user = await requireRole("parent");
  const childrenList = await getParentChildren(user.id);

  if (childrenList.length === 0) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 text-center text-muted">
        <div className="max-w-md mx-auto rounded-2xl border border-theme bg-surface p-8 space-y-4">
          <h2 className="text-lg font-bold text-primary">No Linked Profiles</h2>
          <p className="text-xs text-secondary leading-relaxed">
            No student profiles are currently linked to your parent account. Please contact the school administration to map your children.
          </p>
        </div>
      </div>
    );
  }

  const params = await searchParams;
  const studentIdParam = params?.studentId;
  const selectedStudent = studentIdParam
    ? childrenList.find((c) => c.studentId === Number(studentIdParam)) || childrenList[0]
    : childrenList[0];

  const studentId = selectedStudent.studentId;
  const classId = selectedStudent.classId;

  // 1. Fetch Assignments
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
    .where(eq(assignments.classId, classId))
    .orderBy(desc(assignments.dueDate));

  const formattedAssignments = list.map((a) => ({
    id: a.id,
    title: a.title,
    description: a.description,
    dueDate: a.dueDate instanceof Date ? a.dueDate.toISOString().split("T")[0] : String(a.dueDate),
    maxMarks: a.maxMarks,
    subjectId: a.subjectId,
    subjectName: a.subjectName ?? "Unknown Subject",
  }));

  // 2. Fetch submissions
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
    .where(eq(assignmentSubmissions.studentId, studentId));

  const formattedSubmissions = submissions.map((s) => ({
    assignmentId: s.assignmentId,
    content: s.content,
    fileUrl: s.fileUrl,
    submittedAt: s.submittedAt instanceof Date ? s.submittedAt.toISOString() : s.submittedAt ? String(s.submittedAt) : null,
    grade: s.grade,
    feedback: s.feedback,
    isLate: s.isLate,
  }));

  return (
    <ParentAssignmentsClient
      initialAssignments={formattedAssignments}
      submissions={formattedSubmissions}
      studentName={selectedStudent.name}
    />
  );
}
