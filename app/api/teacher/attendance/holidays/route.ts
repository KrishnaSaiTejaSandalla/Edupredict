import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import {
  getDatabaseHolidays,
  isDateHoliday,
  addHoliday,
  removeHoliday,
  removeHolidayByDate,
  isSunday,
} from '@/lib/holiday-actions';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await requireRole('teacher');
    const schoolId = user.school?.id;
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    if (date) {
      const holidayInfo = await isDateHoliday(date, schoolId);
      return NextResponse.json(holidayInfo);
    }

    const holidays = await getDatabaseHolidays(schoolId, startDate, endDate);
    return NextResponse.json({ holidays });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch holidays' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRole('teacher');
    const schoolId = user.school?.id;
    const body = await request.json();
    const { date, reason } = body;

    if (!date || !reason?.trim()) {
      return NextResponse.json({ error: 'Date and reason are required' }, { status: 400 });
    }

    if (isSunday(date)) {
      return NextResponse.json(
        { error: 'Sundays are already automatic weekly holidays.' },
        { status: 400 }
      );
    }

    const result = await addHoliday(date, reason.trim(), schoolId ?? null, user.id);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to add holiday' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireRole('teacher');
    const schoolId = user.school?.id;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const date = searchParams.get('date');

    if (id) {
      await removeHoliday(Number(id));
      return NextResponse.json({ success: true, message: 'Holiday removed successfully. Date is now a working day.' });
    }

    if (date) {
      if (isSunday(date)) {
        return NextResponse.json(
          { error: 'Sundays are automatic weekly holidays and cannot be set as working days.' },
          { status: 400 }
        );
      }
      await removeHolidayByDate(date, schoolId);
      return NextResponse.json({ success: true, message: 'Holiday removed successfully. Date is now a working day.' });
    }

    return NextResponse.json({ error: 'Holiday id or date required' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete holiday' }, { status: 500 });
  }
}
