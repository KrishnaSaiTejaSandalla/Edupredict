import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { exams } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: Request) {
  const user = await getCurrentUser(request, 'admin');
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const classId = searchParams.get('classId');

  if (!classId || !/^\d+$/.test(classId) || Number(classId) < 1) {
    return NextResponse.json({ error: 'Invalid classId' }, { status: 400 });
  }

  try {
    const list = await db
      .select()
      .from(exams)
      .where(eq(exams.classId, Number(classId)));
    return NextResponse.json(list);
  } catch (error) {
    console.error('Error fetching exams:', error);
    return NextResponse.json({ error: 'Request could not be completed' }, { status: 500 });
  }
}
