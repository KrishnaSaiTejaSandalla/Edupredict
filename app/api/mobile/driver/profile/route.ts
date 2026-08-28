import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, buses } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { getBearerToken, verifyJwt } from '@/lib/jwt';
import { buildDriverSessionInfo } from '@/lib/driver-auth';

export async function PATCH(req: Request) {
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
    const body = await req.json();
    const { name, phone, photoUrl, vehicleNickname } = body;

    // Update user record
    const userUpdates: Record<string, any> = {};
    if (typeof name === 'string' && name.trim()) userUpdates.name = name.trim();
    if (typeof phone === 'string' && phone.trim()) userUpdates.phoneNumber = phone.trim();
    if (photoUrl !== undefined) userUpdates.profileImageUrl = photoUrl || null;

    if (Object.keys(userUpdates).length > 0) {
      await db.update(users).set(userUpdates).where(eq(users.id, userId));
    }

    // Update vehicle nickname if provided and driver has assigned bus
    const currentDriver = await buildDriverSessionInfo(userId);
    if (vehicleNickname !== undefined && currentDriver?.assignedBus?.id) {
      await db
        .update(buses)
        .set({ nickname: vehicleNickname || null })
        .where(eq(buses.id, currentDriver.assignedBus.id));
    }

    // Rebuild updated driver session info
    const updatedDriver = await buildDriverSessionInfo(userId);

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedDriver,
    });
  } catch (error: any) {
    console.error('[mobile/driver/profile PATCH]', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to update profile' },
      { status: 500 }
    );
  }
}
