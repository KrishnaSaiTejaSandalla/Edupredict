import { NextRequest, NextResponse } from 'next/server';
import { getActiveLogs } from '@/lib/audit-utils';
import type { AuditLogFilters } from '@/lib/audit-utils';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req, 'admin');
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { searchParams } = new URL(req.url);

    const filters: AuditLogFilters = {
      page:       Math.min(1000, Math.max(1, Number(searchParams.get('page') ?? '1') || 1)),
      search:     searchParams.get('search')?.slice(0, 128) || undefined,
      module:     searchParams.get('module') ?? undefined,
      actionType: searchParams.get('actionType') ?? undefined,
      role:       searchParams.get('role') ?? undefined,
      from:       searchParams.get('from') ?? undefined,
      to:         searchParams.get('to') ?? undefined,
    };

    const result = await getActiveLogs(filters);
    return NextResponse.json(result);
  } catch (err) {
    console.error('Active audit logs API error:', err);
    return NextResponse.json({ error: 'Failed to fetch active audit logs' }, { status: 500 });
  }
}
