import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getStudentAdmitCard } from '@/lib/admit-card-actions';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ studentId: string }> }
) {
  try {
    const user = await getCurrentUser(req, 'admin');
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { studentId: paramId } = await context.params;
    const studentId = Number(paramId);

    if (!studentId || isNaN(studentId)) {
      return NextResponse.json({ error: 'Invalid student ID' }, { status: 400 });
    }

    const admitCard = await getStudentAdmitCard(studentId);
    if (!admitCard) {
      return NextResponse.json({ error: 'Student admit card not found' }, { status: 404 });
    }

    return NextResponse.json(admitCard);
  } catch (error: any) {
    console.error('Error fetching student admit card API:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
