import { NextResponse } from 'next/server';
import { getBearerToken, verifyJwt } from '@/lib/jwt';
import { db } from '@/lib/db';
import { studentBoardingLogs, studentParents, parents, students, users, buses, busStops } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
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
    const { studentId, busId, routeId, stopId, tripId, status, direction } = body;

    if (!studentId || !busId || !routeId || !stopId || !tripId || !status || !direction) {
      return NextResponse.json(
        { success: false, message: 'Missing required parameters.' },
        { status: 400 }
      );
    }

    // Upsert the boarding log
    const [existing] = await db
      .select()
      .from(studentBoardingLogs)
      .where(
        and(
          eq(studentBoardingLogs.studentId, Number(studentId)),
          eq(studentBoardingLogs.tripId, tripId),
          eq(studentBoardingLogs.direction, direction)
        )
      )
      .limit(1);

    const boardedAt = status === 'boarded' ? new Date() : null;

    if (existing) {
      await db
        .update(studentBoardingLogs)
        .set({
          status,
          boardedAt,
          busId: Number(busId),
          routeId: Number(routeId),
          stopId: Number(stopId),
        })
        .where(eq(studentBoardingLogs.id, existing.id));
    } else {
      await db.insert(studentBoardingLogs).values({
        studentId: Number(studentId),
        busId: Number(busId),
        routeId: Number(routeId),
        stopId: Number(stopId),
        tripId,
        status,
        direction,
        boardedAt,
      });
    }

    // Retrieve details for the parent notification
    const [studentUser] = await db
      .select({ name: users.name })
      .from(students)
      .innerJoin(users, eq(students.userId, users.id))
      .where(eq(students.id, Number(studentId)))
      .limit(1);

    const [busDetails] = await db
      .select({ reg: buses.registrationNumber })
      .from(buses)
      .where(eq(buses.id, Number(busId)))
      .limit(1);

    const [stopDetails] = await db
      .select({ name: busStops.stopName })
      .from(busStops)
      .where(eq(busStops.id, Number(stopId)))
      .limit(1);

    const studentName = studentUser?.name || 'Your child';
    const busReg = busDetails?.reg || 'School Bus';
    const stopName = stopDetails?.name || 'designated stop';

    let notifTitle = 'Bus Boarding Update';
    let notifMsg = '';

    if (status === 'boarded') {
      notifTitle = 'Child Boarded';
      notifMsg = `${studentName} has boarded Bus ${busReg} at ${stopName}.`;
    } else if (status === 'absent') {
      notifTitle = 'Child Absent';
      notifMsg = `${studentName} was marked absent for Bus ${busReg} at ${stopName}.`;
    } else if (status === 'dropped') {
      notifTitle = 'Child Dropped';
      notifMsg = `${studentName} has been safely dropped off from Bus ${busReg} at ${stopName}.`;
    }

    // Query parents
    const parentRows = await db
      .select({ userId: parents.userId })
      .from(studentParents)
      .innerJoin(parents, eq(parents.id, studentParents.parentId))
      .where(eq(studentParents.studentId, Number(studentId)));

    const parentUserIds = [...new Set(parentRows.map((p) => p.userId))];

    if (notifMsg && parentUserIds.length > 0) {
      await Promise.all(
        parentUserIds.map((parentUserId) =>
          createNotificationForUser(
            parentUserId,
            notifTitle,
            notifMsg,
            'transport',
            'medium',
            '/parent/bus-tracking'
          )
        )
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        studentId,
        status,
        boardedAt: boardedAt?.toISOString() || null,
      },
    });
  } catch (error) {
    console.error('POST boarding log error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error saving boarding status.' },
      { status: 500 }
    );
  }
}
