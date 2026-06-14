import { NextRequest, NextResponse } from 'next/server';
import { getArchivedLogs, archiveOldLogs, deleteArchivedLog } from '@/lib/audit-utils';
import { requireRole } from '@/lib/auth';
import type { AuditLogFilters } from '@/lib/audit-utils';

export const dynamic = 'force-dynamic';

// GET — search archived logs (paginated)
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

    const result = await getArchivedLogs(filters);
    return NextResponse.json(result);
  } catch (err) {
    console.error('Archive audit logs API error:', err);
    return NextResponse.json({ error: 'Failed to fetch archived logs' }, { status: 500 });
  }
}

// POST — trigger archive process (admin only)
export async function POST() {
  try {
    await requireRole('admin');
    const result = await archiveOldLogs();
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error('Archive trigger error:', err);
    return NextResponse.json(
      { error: err.message ?? 'Failed to archive logs' },
      { status: err.message?.includes('Unauthorized') ? 403 : 500 }
    );
  }
}

// DELETE — permanently delete a single archived record (?id=N)
export async function DELETE(req: NextRequest) {
  try {
    await requireRole('admin');
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get('id'));
    if (!id || isNaN(id)) {
      return NextResponse.json({ error: 'Missing or invalid id' }, { status: 400 });
    }
    await deleteArchivedLog(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Delete archived log error:', err);
    return NextResponse.json(
      { error: err.message ?? 'Failed to delete archived log' },
      { status: 500 }
    );
  }
}
