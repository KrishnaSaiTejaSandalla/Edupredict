import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getAdminTrackingSnapshots } from '@/lib/bus-tracking.service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req, 'admin');
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const snapshots = await getAdminTrackingSnapshots(user.school?.id ?? null);
  return NextResponse.json({ buses: snapshots });
}
