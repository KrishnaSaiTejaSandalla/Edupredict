import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { exams } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const classId = searchParams.get('classId');

  if (!classId) {
    return NextResponse.json([]);
  }

  try {
    const list = await db
      .select()
      .from(exams)
      .where(eq(exams.classId, Number(classId)));
    return NextResponse.json(list);
  } catch (error) {
    console.error('Error fetching exams:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
