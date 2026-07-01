import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { studentDiaries, studentDiaryProgress, teachers, subjects, classes, users } from '@/lib/schema';
import { eq, and, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await requireRole('teacher');
    const [teacher] = await db.select({ id: teachers.id, schoolId: teachers.schoolId }).from(teachers).where(eq(teachers.userId, user.id)).limit(1);
    if (!teacher) return NextResponse.json([], { status: 200 });

    const rows = await db
      .select({
        id: studentDiaries.id, topicTaught: studentDiaries.topicTaught, homework: studentDiaries.homework,
        date: studentDiaries.date, subjectId: studentDiaries.subjectId, classId: studentDiaries.classId,
      })
      .from(studentDiaries)
      .where(eq(studentDiaries.teacherId, teacher.id))
      .orderBy(desc(studentDiaries.date))
      .limit(50);

    const enriched = await Promise.all(rows.map(async r => {
      const [subj] = await db.select({ name: subjects.name }).from(subjects).where(eq(subjects.id, r.subjectId)).limit(1);
      const [cls] = await db.select({ name: classes.name, section: classes.section }).from(classes).where(eq(classes.id, r.classId)).limit(1);
      return { ...r, subjectName: subj?.name || 'Unknown', className: cls ? `${cls.name}${cls.section ? ` ${cls.section}` : ''}` : 'Unknown' };
    }));

    return NextResponse.json(enriched);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRole('teacher');
    const [teacher] = await db.select({ id: teachers.id, schoolId: teachers.schoolId }).from(teachers).where(eq(teachers.userId, user.id)).limit(1);
    if (!teacher) return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });

    const body = await request.json();
    const { classId, subjectId, topicTaught, homework, date } = body;
    if (!classId || !subjectId || !topicTaught || !date) return NextResponse.json({ error: 'classId, subjectId, topicTaught, and date are required' }, { status: 400 });

    // Upsert: one diary entry per class+subject+date
    const [existing] = await db.select({ id: studentDiaries.id }).from(studentDiaries)
      .where(and(eq(studentDiaries.classId, classId), eq(studentDiaries.subjectId, subjectId), eq(studentDiaries.date, date))).limit(1);

    if (existing) {
      await db.update(studentDiaries).set({ topicTaught, homework: homework || null, updatedAt: new Date() }).where(eq(studentDiaries.id, existing.id));
      return NextResponse.json({ id: existing.id, updated: true });
    } else {
      const [result] = await db.insert(studentDiaries).values({
        schoolId: teacher.schoolId, classId, subjectId, teacherId: teacher.id,
        topicTaught, homework: homework || null, date, createdAt: new Date(), updatedAt: new Date(),
      });
      return NextResponse.json({ id: (result as any).insertId, created: true });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireRole('teacher');
    const [teacher] = await db.select({ id: teachers.id }).from(teachers).where(eq(teachers.userId, user.id)).limit(1);
    if (!teacher) return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get('id'));
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    // Delete progress entries referencing this diary entry first
    await db.delete(studentDiaryProgress).where(eq(studentDiaryProgress.diaryId, id));

    // Delete the diary entry
    await db.delete(studentDiaries).where(and(eq(studentDiaries.id, id), eq(studentDiaries.teacherId, teacher.id)));
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
