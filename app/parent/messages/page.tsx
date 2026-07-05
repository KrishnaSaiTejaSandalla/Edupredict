import { requireRole } from "@/lib/auth";
import { getParentChildren } from "@/lib/parent-actions";
import { db } from "@/lib/db";
import { classTeacherAssignments, teachers, users, subjects, teacherSubjectAssignments } from "@/lib/schema";
import { eq } from "drizzle-orm";
import ParentMessagesClient from "@/components/parent/ParentMessagesClient";

export const dynamic = "force-dynamic";

export default async function ParentMessagesPage() {
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

  const selectedStudent = childrenList[0];
  const classId = selectedStudent.classId;

  // 1. Fetch class teachers
  const classTeachers = await db
    .select({
      id: teachers.id,
      name: users.name,
      email: users.email,
      profileImageUrl: users.profileImageUrl,
      subjectName: subjects.name,
    })
    .from(classTeacherAssignments)
    .innerJoin(teachers, eq(teachers.id, classTeacherAssignments.teacherId))
    .innerJoin(users, eq(users.id, teachers.userId))
    .leftJoin(teacherSubjectAssignments, eq(teacherSubjectAssignments.teacherId, teachers.id))
    .leftJoin(subjects, eq(subjects.id, teacherSubjectAssignments.subjectId))
    .where(eq(classTeacherAssignments.classId, classId));

  const teacherContactMap = new Map<number, any>();
  classTeachers.forEach((t) => {
    if (!teacherContactMap.has(t.id)) {
      teacherContactMap.set(t.id, {
        id: `teacher_${t.id}`,
        dbId: t.id,
        name: t.name,
        role: "teacher" as const,
        email: t.email,
        profileImageUrl: t.profileImageUrl,
        subjectName: t.subjectName ?? "Class Instructor",
        displayClass: selectedStudent.displayClass,
      });
    }
  });
  const uniqueTeachers = Array.from(teacherContactMap.values());

  // 2. Fetch admins
  const adminsList = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      profileImageUrl: users.profileImageUrl,
    })
    .from(users)
    .where(eq(users.role, "admin"));

  const adminContacts = adminsList.map((a) => ({
    id: `admin_${a.id}`,
    dbId: a.id,
    name: a.name,
    role: "admin" as const,
    email: a.email,
    profileImageUrl: a.profileImageUrl,
  }));

  const contacts = [...uniqueTeachers, ...adminContacts];

  return (
    <ParentMessagesClient
      contacts={contacts}
      parentName={user.name}
      studentName={selectedStudent.name}
    />
  );
}
