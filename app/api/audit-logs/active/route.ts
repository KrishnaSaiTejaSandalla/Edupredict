import { NextRequest, NextResponse } from 'next/server';
import { getActiveLogs } from '@/lib/audit-utils';
import type { AuditLogFilters } from '@/lib/audit-utils';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const filters: AuditLogFilters = {
      page:       Number(searchParams.get('page') ?? '1'),
      search:     searchParams.get('search') ?? undefined,
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
