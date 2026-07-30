import { NextResponse } from 'next/server';
import { buildDriverSessionInfo } from '@/lib/driver-auth';
import { getBearerToken, verifyJwt } from '@/lib/jwt';
import { db } from '@/lib/db';
import { buses } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const token = getBearerToken(req);

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Authentication required.' },
        { status: 401 }
      );
    }

    const payload = verifyJwt(token);
    if (!payload || payload.role.toLowerCase() !== 'driver') {
      return NextResponse.json(
        { success: false, message: 'Session expired. Please log in again.' },
        { status: 401 }
      );
    }

    const driver = await buildDriverSessionInfo(payload.sub);
    if (!driver || !driver.assignedBus) {
      return NextResponse.json(
        { success: false, message: 'No vehicle assigned to this driver.' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { nickname } = body;

    if (typeof nickname !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Invalid nickname format.' },
        { status: 400 }
      );
    }

    await db
      .update(buses)
      .set({ nickname: nickname.trim() || null, updatedAt: new Date() })
      .where(eq(buses.id, driver.assignedBus.id));

    return NextResponse.json({
      success: true,
      message: 'Vehicle nickname updated successfully.',
      nickname: nickname.trim() || null,
    });
  } catch (error) {
    console.error('[mobile/driver/vehicle]', error);
    return NextResponse.json(
      { success: false, message: 'Server error occurred.' },
      { status: 500 }
    );
  }
}
