import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getParentTrackingSnapshot } from '@/lib/bus-tracking.service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req, 'parent');
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const studentIdParam = req.nextUrl.searchParams.get('studentId');
  const studentId = studentIdParam ? Number(studentIdParam) : undefined;
  const snapshot = await getParentTrackingSnapshot(
    user.id,
    Number.isFinite(studentId) ? studentId : undefined,
  );

  return NextResponse.json(snapshot);
}
