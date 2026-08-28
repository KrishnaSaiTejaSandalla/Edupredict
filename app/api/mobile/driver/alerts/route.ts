import { NextResponse } from 'next/server';
import { getBearerToken, verifyJwt } from '@/lib/jwt';
import { db } from '@/lib/db';
import { users, buses } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { createNotificationForUser } from '@/lib/notification-actions';

export async function POST(req: Request) {
  try {
    const token = getBearerToken(req);
    const payload = token ? verifyJwt(token) : null;

    if (!payload || payload.role.toLowerCase() !== 'driver') {
      return NextResponse.json(
        { success: false, message: 'Authentication required.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { alertType, message, busId, latitude, longitude } = body;

    if (!alertType) {
      return NextResponse.json(
        { success: false, message: 'Alert type is required.' },
        { status: 400 }
      );
    }

    // Get bus reg if provided
    let busReg = 'School Bus';
    if (busId) {
      const [busRow] = await db
        .select({ reg: buses.registrationNumber })
        .from(buses)
        .where(eq(buses.id, Number(busId)))
        .limit(1);
      if (busRow?.reg) busReg = busRow.reg;
    }

    const isEmergency = alertType === 'emergency';
    const notifTitle = isEmergency ? '🚨 DRIVER EMERGENCY ALERT' : '⚠️ VEHICLE ISSUE REPORTED';
    const notifMsg = message
      ? `Bus ${busReg}: ${message}`
      : isEmergency
      ? `Emergency reported on Bus ${busReg} at location (${latitude ?? 'N/A'}, ${longitude ?? 'N/A'}).`
      : `Vehicle issue reported on Bus ${busReg}.`;

    // Query all admin users
    const adminRows = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, 'admin'));

    const adminUserIds = adminRows.map((a) => a.id);

    if (adminUserIds.length > 0) {
      await Promise.all(
        adminUserIds.map((adminId) =>
          createNotificationForUser(
            adminId,
            notifTitle,
            notifMsg,
            'transport',
            'high',
            '/admin/transport'
          )
        )
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Alert broadcast to admins.',
      data: {
        alertType,
        notifiedAdminsCount: adminUserIds.length,
      },
    });
  } catch (error) {
    console.error('POST /mobile/driver/alerts error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error processing alert.' },
      { status: 500 }
    );
  }
}
