import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { feedback } from '@/lib/schema';
import { getBearerToken, verifyJwt } from '@/lib/jwt';
import { buildDriverSessionInfo } from '@/lib/driver-auth';

export async function POST(req: Request) {
  try {
    const token = getBearerToken(req);
    if (!token) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }

    const payload = verifyJwt(token);
    if (!payload || payload.role.toLowerCase() !== 'driver') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    const userId = payload.sub;
    const driver = await buildDriverSessionInfo(userId);
    if (!driver) {
      return NextResponse.json({ success: false, message: 'Driver not found' }, { status: 404 });
    }

    const body = await req.json();
    const { title, category, message, priority } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({ success: false, message: 'Message is required' }, { status: 400 });
    }

    const [inserted] = await db.insert(feedback).values({
      schoolId: driver.schoolId || 1,
      userId: driver.id,
      title: title || 'Driver App Feedback',
      message: message.trim(),
      category: category || 'Driver Application',
      priority: priority || 'medium',
      status: 'pending',
      replies: JSON.stringify([]),
    });

    return NextResponse.json({
      success: true,
      message: 'Feedback submitted successfully',
      data: { id: inserted },
    });
  } catch (error: any) {
    console.error('[mobile/driver/feedback POST]', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to submit feedback' },
      { status: 500 }
    );
  }
}
