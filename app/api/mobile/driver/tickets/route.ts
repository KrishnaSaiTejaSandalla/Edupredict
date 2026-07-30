import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { helpTickets, users } from '@/lib/schema';
import { eq, desc, and } from 'drizzle-orm';
import { getBearerToken, verifyJwt } from '@/lib/jwt';
import { buildDriverSessionInfo } from '@/lib/driver-auth';
import { createNotificationForUser } from '@/lib/notification-actions';
import { revalidatePath } from 'next/cache';

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
    const { category, priority, message, deviceInfo } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({ success: false, message: 'Message is required' }, { status: 400 });
    }

    const ticketId = `TCK-${Math.floor(100000 + Math.random() * 900000)}`;

    const formattedMessage = deviceInfo
      ? `${message.trim()}\n\n[Device Info: ${JSON.stringify(deviceInfo)}]`
      : message.trim();

    const result = await db.insert(helpTickets).values({
      ticketId,
      driverId: driver.id,
      driverName: driver.name,
      driverPhone: driver.phone || '',
      category: category || 'General',
      priority: 'HIGH',
      message: formattedMessage,
      status: 'OPEN',
      replies: JSON.stringify([]),
    });

    const insertedId = Number(result[0]?.insertId || 0);

    // Admin Integration: Notify all admins and increment notification badge
    try {
      const admins = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.role, 'admin'));

      for (const admin of admins) {
        await createNotificationForUser(
          admin.id,
          `HIGH PRIORITY DRIVER HELP REQUEST: ${ticketId}`,
          `Driver ${driver.name} (ID: ${driver.id}) submitted help ticket (${category || 'General'}): "${message.trim().slice(0, 80)}"`,
          'feedback',
          'high',
          '/admin/feedback'
        );
      }
    } catch (notifErr) {
      console.error('[mobile/driver/tickets] Failed to notify admins:', notifErr);
    }

    revalidatePath('/admin/feedback');
    revalidatePath('/admin');

    return NextResponse.json({
      success: true,
      message: 'Support ticket submitted successfully',
      data: {
        id: insertedId,
        ticketId,
        status: 'OPEN',
        priority: 'HIGH',
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[mobile/driver/tickets POST]', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to create help ticket' },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
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
    const userTickets = await db
      .select()
      .from(helpTickets)
      .where(eq(helpTickets.driverId, userId))
      .orderBy(desc(helpTickets.createdAt));

    return NextResponse.json({
      success: true,
      data: userTickets.map((t) => ({
        ...t,
        replies: t.replies ? JSON.parse(t.replies) : [],
      })),
    });
  } catch (error: any) {
    console.error('[mobile/driver/tickets GET]', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to fetch tickets' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
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
    const { searchParams } = new URL(req.url);
    const ticketId = searchParams.get('ticketId') || searchParams.get('id');

    if (!ticketId) {
      return NextResponse.json({ success: false, message: 'Ticket ID required' }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(helpTickets)
      .where(and(eq(helpTickets.ticketId, ticketId), eq(helpTickets.driverId, userId)))
      .limit(1);

    if (!existing) {
      const numericId = parseInt(ticketId, 10);
      if (!isNaN(numericId)) {
        await db
          .delete(helpTickets)
          .where(and(eq(helpTickets.id, numericId), eq(helpTickets.driverId, userId)));
      } else {
        return NextResponse.json({ success: false, message: 'Ticket not found or unauthorized' }, { status: 404 });
      }
    } else {
      await db.delete(helpTickets).where(eq(helpTickets.ticketId, ticketId));
    }

    revalidatePath('/admin/feedback');

    return NextResponse.json({ success: true, message: 'Ticket deleted successfully' });
  } catch (error: any) {
    console.error('[mobile/driver/tickets DELETE]', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to delete ticket' },
      { status: 500 }
    );
  }
}
