import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { helpTickets, notifications } from '@/lib/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET() {
  try {
    const tickets = await db.select().from(helpTickets).orderBy(desc(helpTickets.createdAt));
    return NextResponse.json({
      success: true,
      data: tickets.map((t) => ({
        ...t,
        replies: t.replies ? JSON.parse(t.replies) : [],
      })),
    });
  } catch (error: any) {
    console.error('[admin/tickets GET]', error);
    return NextResponse.json({ success: false, message: error?.message || 'Failed to fetch tickets' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { ticketId, status, replyMessage } = body;

    if (!ticketId) {
      return NextResponse.json({ success: false, message: 'Ticket ID required' }, { status: 400 });
    }

    const [existing] = await db.select().from(helpTickets).where(eq(helpTickets.ticketId, ticketId)).limit(1);
    if (!existing) {
      return NextResponse.json({ success: false, message: 'Ticket not found' }, { status: 404 });
    }

    const updates: Record<string, any> = {};
    if (status && status !== existing.status) {
      updates.status = status;
      await db.insert(notifications).values({
        userId: existing.driverId,
        title: `Ticket ${existing.ticketId} ${status}`,
        message: `Your support ticket status was updated to ${status}`,
        type: 'support_status',
        isRead: false,
      }).catch((e) => console.error('Failed to create driver notification:', e));
    }

    let updatedReplies = existing.replies ? JSON.parse(existing.replies) : [];
    if (replyMessage && replyMessage.trim()) {
      const newReply = {
        sender: 'School Admin',
        message: replyMessage.trim(),
        date: new Date().toISOString(),
      };
      updatedReplies.push(newReply);
      updates.replies = JSON.stringify(updatedReplies);

      // Create notification for driver
      await db.insert(notifications).values({
        userId: existing.driverId,
        title: `Reply on Ticket ${existing.ticketId}`,
        message: `Admin replied: "${replyMessage.trim()}"`,
        type: 'support_reply',
        isRead: false,
      }).catch((e) => console.error('Failed to create driver notification:', e));
    }

    if (Object.keys(updates).length > 0) {
      await db.update(helpTickets).set(updates).where(eq(helpTickets.ticketId, ticketId));
    }

    return NextResponse.json({
      success: true,
      message: 'Ticket updated successfully',
      data: {
        ticketId,
        status: status || existing.status,
        replies: updatedReplies,
      },
    });
  } catch (error: any) {
    console.error('[admin/tickets PATCH]', error);
    return NextResponse.json({ success: false, message: error?.message || 'Failed to update ticket' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const ticketId = searchParams.get('ticketId') || searchParams.get('id');

    if (!ticketId) {
      return NextResponse.json({ success: false, message: 'Ticket ID required' }, { status: 400 });
    }

    const [existing] = await db.select().from(helpTickets).where(eq(helpTickets.ticketId, ticketId)).limit(1);
    if (!existing) {
      const numericId = parseInt(ticketId, 10);
      if (!isNaN(numericId)) {
        await db.delete(helpTickets).where(eq(helpTickets.id, numericId));
      } else {
        return NextResponse.json({ success: false, message: 'Ticket not found' }, { status: 404 });
      }
    } else {
      await db.delete(helpTickets).where(eq(helpTickets.ticketId, ticketId));
    }

    return NextResponse.json({ success: true, message: 'Ticket deleted successfully' });
  } catch (error: any) {
    console.error('[admin/tickets DELETE]', error);
    return NextResponse.json({ success: false, message: error?.message || 'Failed to delete ticket' }, { status: 500 });
  }
}
