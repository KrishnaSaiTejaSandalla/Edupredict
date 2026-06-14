import { NextRequest, NextResponse } from 'next/server';
import { getTeachersBySubject } from '@/lib/timetable-actions';

export async function GET(req: NextRequest) {
  const subjectId = req.nextUrl.searchParams.get('subjectId');
  if (!subjectId) {
    return NextResponse.json([], { status: 200 });
  }

  try {
    const teachers = await getTeachersBySubject(Number(subjectId));
    return NextResponse.json(teachers);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch teachers' }, { status: 500 });
  }
}
