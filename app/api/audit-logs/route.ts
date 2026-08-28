import { NextResponse } from 'next/server';
import { getAuditLogs } from '@/lib/audit-utils';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser(req, 'admin');
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const logs = await getAuditLogs();
    return NextResponse.json(logs);
  } catch (err) {
    console.error('Audit logs API error:', err);
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
  }
}
