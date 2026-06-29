import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { studentDiaries, subjects, teachers, users, students } from '@/lib/schema';
import { eq, and, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await requireRole('student');
    const { searchParams } = new URL(request.url);
    const [studentRow] = await db.select({ id: students.id, classId: students.classId }).from(students).where(eq(students.userId, user.id)).limit(1);
    if (!studentRow) return NextResponse.json([], { status: 200 });

    const rows = await db
      .select({
        id: studentDiaries.id, topicTaught: studentDiaries.topicTaught,
        homework: studentDiaries.homework, date: studentDiaries.date,
        subjectId: studentDiaries.subjectId, teacherId: studentDiaries.teacherId,
      })
      .from(studentDiaries)
      .where(eq(studentDiaries.classId, studentRow.classId))
      .orderBy(desc(studentDiaries.date))
      .limit(30);

    const enriched = await Promise.all(rows.map(async r => {
      const [subj] = await db.select({ name: subjects.name }).from(subjects).where(eq(subjects.id, r.subjectId)).limit(1);
      const [teacher] = await db.select({ name: users.name }).from(users).leftJoin(teachers, eq(teachers.userId, users.id)).where(eq(teachers.id, r.teacherId)).limit(1);
      return { ...r, subjectName: subj?.name || 'Unknown', teacherName: teacher?.name || 'Teacher' };
    }));

    return NextResponse.json(enriched);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
