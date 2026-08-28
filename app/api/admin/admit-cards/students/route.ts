import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getStudentsForAdmitCards, getClassesForAdmitCards } from '@/lib/admit-card-actions';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req, 'admin');
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const classIdParam = searchParams.get('classId');
    const search = searchParams.get('search') || '';

    const classId = classIdParam && classIdParam !== 'all' ? Number(classIdParam) : undefined;
    const schoolId = user.school?.id ?? undefined;

    const [studentsList, classesList] = await Promise.all([
      getStudentsForAdmitCards({ schoolId, classId, search }),
      getClassesForAdmitCards(schoolId),
    ]);

    return NextResponse.json({
      students: studentsList,
      classes: classesList,
    });
  } catch (error: any) {
    console.error('Error fetching admit card students API:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
