import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  users,
  teachers,
  subjects,
  classes,
  teacherSubjectAssignments,
  teacherClassAssignments,
  classTeacherAssignments,
  auditLogs,
} from '@/lib/schema';
import { eq, desc, and, ne } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { createNotification } from '@/lib/notification-actions';
import { parseDbError } from '@/lib/db-errors';
import TeacherProfileClient from '@/components/admin/TeacherProfileClient';
import { updateTeacherAssignments, deleteTeacherCascading } from '@/lib/teacher-assignment-actions';
import bcrypt from 'bcryptjs';

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function TeacherEditPage({ params }: Props) {
  await requireRole('admin');

  const { id } = await params;
  const teacherId = Number(id);

  // Fetch teacher profile
  const [teacher] = await db.select().from(teachers).where(eq(teachers.id, teacherId)).limit(1);
  if (!teacher) {
    return <div className="p-8 text-foreground">Teacher not found.</div>;
  }

  // Fetch linked user details
  const [user] = await db.select().from(users).where(eq(users.id, teacher.userId)).limit(1);

  // 1. All subjects available in school
  const allSubjects = await db.select().from(subjects).orderBy(subjects.name);

  // 2. All classes available in school
  const allClasses = await db.select().from(classes).orderBy(classes.name, classes.section);

  // 3. Current subject assignments for this teacher
  const assignedSubjectRows = await db
    .select({ subjectId: teacherSubjectAssignments.subjectId })
    .from(teacherSubjectAssignments)
    .where(eq(teacherSubjectAssignments.teacherId, teacherId));
  const assignedSubjects = assignedSubjectRows.map((r) => r.subjectId);

  // 4. Current class assignments for this teacher
  const assignedClassRows = await db
    .select({ classId: teacherClassAssignments.classId })
    .from(teacherClassAssignments)
    .where(eq(teacherClassAssignments.teacherId, teacherId));
  const assignedClasses = assignedClassRows.map((r) => r.classId);

  // 5. Current class teacher role classId
  const [classTeacherRow] = await db
    .select({ classId: classTeacherAssignments.classId })
    .from(classTeacherAssignments)
    .where(eq(classTeacherAssignments.teacherId, teacherId))
    .limit(1);
  const classTeacherClassId = classTeacherRow?.classId ?? null;

  // 6. Other class teacher assignments (to validation in select)
  const otherClassTeacherAssignments = await db
    .select({
      classId: classTeacherAssignments.classId,
      teacherId: classTeacherAssignments.teacherId,
      teacherName: users.name,
    })
    .from(classTeacherAssignments)
    .leftJoin(teachers, eq(classTeacherAssignments.teacherId, teachers.id))
    .leftJoin(users, eq(teachers.userId, users.id));

  // 7. Audit logs (Activity) for teacher
  const teacherLogs = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      details: auditLogs.details,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .where(eq(auditLogs.userId, teacher.userId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(30);

  // Server actions for profile edits
  async function updateTeacher(formData: FormData) {
    'use server';
    const fullName = String(formData.get('fullName') || '').trim();
    const email = String(formData.get('email') || '').trim();
    const phoneNumber = String(formData.get('phoneNumber') || '').trim();
    const qualification = String(formData.get('qualification') || '').trim();
    const experience = Number(formData.get('experience') || 0);
    const department = String(formData.get('department') || '').trim();
    const employeeId = String(formData.get('employeeId') || '').trim();
    const joinDate = String(formData.get('joinDate') || '').trim();
    const performanceRating = formData.get('performanceRating') ? Number(formData.get('performanceRating')) : null;
    const schoolId = 1;

    // Credentials
    const tempPassword = String(formData.get('tempPassword') || '').trim();

    // Teaching Assignments & Class Teacher Assignment
    const subjectIds = formData.getAll('subjectIds').map(Number);
    const classIds = formData.getAll('classIds').map(Number);
    const classTeacherClassId = formData.get('classTeacherClassId') ? Number(formData.get('classTeacherClassId')) : null;

    if (!fullName || !email || !employeeId) {
      throw new Error('Full name, email, and employee ID are required.');
    }

    try {
      // 1. Basic Info
      await db.update(users).set({ name: fullName, email }).where(eq(users.id, teacher.userId));
      await db.update(teachers).set({
        phoneNumber: phoneNumber || null,
        qualification: qualification || null,
        experience: Number.isNaN(experience) ? null : experience,
        department: department || null,
        employeeId,
        joinDate: joinDate ? new Date(joinDate) : null,
        performanceRating,
        schoolId,
      }).where(eq(teachers.id, teacherId));

      // 2. Password (if set)
      if (tempPassword) {
        if (tempPassword.length < 6) {
          throw new Error('Password must be at least 6 characters long.');
        }
        const hashedPassword = await bcrypt.hash(tempPassword, 12);
        await db.update(users).set({ password: hashedPassword }).where(eq(users.id, teacher.userId));
      }

      // 3. Assignments (subjects, classes, class teacher)
      await updateTeacherAssignments(teacherId, subjectIds, classIds, classTeacherClassId);

    } catch (err: any) {
      throw new Error(err.message || parseDbError(err));
    }

    await createNotification('Teacher Updated', `Teacher profile for "${fullName}" was updated.`, 'info', 'medium');
    revalidatePath('/admin/teachers');
  }

  async function deleteTeacher(formData: FormData) {
    'use server';
    try {
      await deleteTeacherCascading(teacherId);
    } catch (err: any) {
      throw new Error(err.message || parseDbError(err));
    }
    await createNotification('Teacher Deleted', `Teacher "${user?.name || 'Unknown'}" was deleted.`, 'info', 'medium');
    revalidatePath('/admin/teachers');
    revalidatePath("/admin");
  }

  const name = user?.name || 'Teacher';
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <main className="min-h-screen bg-background p-4 sm:p-6 lg:p-8 space-y-8 text-foreground transition-colors duration-200">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-lg sm:text-xl font-bold text-cyan-500 dark:text-cyan-400 shadow-inner select-none">
            {initials}
          </div>
          <div>
            <a
              href="/admin/teachers"
              className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-cyan-500 transition mb-1"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
              Teachers
            </a>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">{user?.name}</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {teacher.department || 'General Department'} &bull; Employee ID: {teacher.employeeId || '—'}
            </p>
          </div>
        </div>
      </div>

      {/* TABS CONTAINER */}
      <TeacherProfileClient
        teacher={teacher}
        user={user}
        allSubjects={allSubjects}
        allClasses={allClasses.map(c => ({ id: c.id, name: c.name, section: c.section }))}
        assignedSubjects={assignedSubjects}
        assignedClasses={assignedClasses}
        classTeacherClassId={classTeacherClassId}
        otherClassTeacherAssignments={otherClassTeacherAssignments}
        teacherLogs={teacherLogs}
        updateTeacherAction={updateTeacher}
        deleteTeacherAction={deleteTeacher}
      />
    </main>
  );
}
