import { NextResponse } from 'next/server';
import { getAuditLogs } from '@/lib/audit-utils';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const logs = await getAuditLogs();
    return NextResponse.json(logs);
  } catch (err) {
    console.error('Audit logs API error:', err);
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
  }
}
