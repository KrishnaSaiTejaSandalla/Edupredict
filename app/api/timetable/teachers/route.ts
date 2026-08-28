import { NextRequest, NextResponse } from 'next/server';
import { getTeachersBySubject } from '@/lib/timetable-actions';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req, 'admin');
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const subjectId = req.nextUrl.searchParams.get('subjectId');
  if (!subjectId || !/^\d+$/.test(subjectId) || Number(subjectId) < 1) {
    return NextResponse.json({ error: 'Invalid subjectId' }, { status: 400 });
  }

  try {
    const teachers = await getTeachersBySubject(Number(subjectId));
    return NextResponse.json(teachers);
  } catch (err) {
    console.error('Timetable teachers API error:', err);
    return NextResponse.json({ error: 'Request could not be completed' }, { status: 500 });
  }
}
