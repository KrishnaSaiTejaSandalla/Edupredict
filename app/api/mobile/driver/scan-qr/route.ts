import { NextResponse } from 'next/server';
import { getBearerToken, verifyJwt } from '@/lib/jwt';
import { db } from '@/lib/db';
import {
  students,
  users,
  buses,
  busStops,
  studentTransportAssignments,
  studentBoardingLogs,
  studentParents,
  parents,
} from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { createNotificationForUser } from '@/lib/notification-actions';

export async function POST(req: Request) {
  try {
    const token = getBearerToken(req);
    const payload = token ? verifyJwt(token) : null;

    if (!payload || payload.role.toLowerCase() !== 'driver') {
      return NextResponse.json(
        { success: false, message: 'Authentication required. Driver access only.' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { qrToken, busId, routeId, stopId, tripId, direction = 'pickup' } = body;

    if (!qrToken || typeof qrToken !== 'string' || !qrToken.trim()) {
      return NextResponse.json(
        { success: false, message: 'Invalid or missing student QR code.' },
        { status: 400 }
      );
    }

    if (!busId || !tripId) {
      return NextResponse.json(
        { success: false, message: 'Missing busId or tripId.' },
        { status: 400 }
      );
    }

    // 1. Verify student by QR token
    const [studentRow] = await db
      .select({
        id: students.id,
        userId: students.userId,
        rollNumber: students.rollNumber,
        name: users.name,
      })
      .from(students)
      .innerJoin(users, eq(students.userId, users.id))
      .where(eq(students.qrToken, qrToken.trim()))
      .limit(1);

    if (!studentRow) {
      return NextResponse.json(
        { success: false, message: 'Invalid or unrecognized student QR code.' },
        { status: 404 }
      );
    }

    const studentId = studentRow.id;

    // 2. Authorize student for this driver's bus / transport assignment
    const [assignment] = await db
      .select({
        id: studentTransportAssignments.id,
        busId: studentTransportAssignments.busId,
        routeId: studentTransportAssignments.routeId,
        pickupStopId: studentTransportAssignments.pickupStopId,
        dropStopId: studentTransportAssignments.dropStopId,
      })
      .from(studentTransportAssignments)
      .where(
        and(
          eq(studentTransportAssignments.studentId, studentId),
          eq(studentTransportAssignments.busId, Number(busId)),
          eq(studentTransportAssignments.isActive, true)
        )
      )
      .limit(1);

    if (!assignment) {
      return NextResponse.json(
        {
          success: false,
          message: `Unauthorized: ${studentRow.name} is not assigned to this bus or route.`,
        },
        { status: 403 }
      );
    }

    const effectiveRouteId = Number(routeId || assignment.routeId || 1);
    const effectiveStopId = Number(
      stopId ||
        (direction === 'dropoff' ? assignment.dropStopId : assignment.pickupStopId) ||
        1
    );

    // 3. Duplicate check for this trip
    const [existingLog] = await db
      .select()
      .from(studentBoardingLogs)
      .where(
        and(
          eq(studentBoardingLogs.studentId, studentId),
          eq(studentBoardingLogs.tripId, tripId),
          eq(studentBoardingLogs.direction, direction)
        )
      )
      .limit(1);

    if (existingLog && existingLog.status === 'boarded') {
      return NextResponse.json({
        success: true,
        alreadyBoarded: true,
        message: `${studentRow.name} is already marked present/boarded for this trip.`,
        data: {
          studentId: studentRow.id,
          studentName: studentRow.name,
          status: existingLog.status,
          boardedAt: existingLog.boardedAt?.toISOString() || null,
        },
      });
    }

    const now = new Date();

    // 4. Insert or update boarding log
    if (existingLog) {
      await db
        .update(studentBoardingLogs)
        .set({
          status: 'boarded',
          boardedAt: now,
          busId: Number(busId),
          routeId: effectiveRouteId,
          stopId: effectiveStopId,
        })
        .where(eq(studentBoardingLogs.id, existingLog.id));
    } else {
      await db.insert(studentBoardingLogs).values({
        studentId,
        busId: Number(busId),
        routeId: effectiveRouteId,
        stopId: effectiveStopId,
        tripId,
        status: 'boarded',
        direction,
        boardedAt: now,
      });
    }

    // 5. Query details for parent notification
    const [busDetails] = await db
      .select({ reg: buses.registrationNumber })
      .from(buses)
      .where(eq(buses.id, Number(busId)))
      .limit(1);

    const [stopDetails] = await db
      .select({ name: busStops.stopName })
      .from(busStops)
      .where(eq(busStops.id, effectiveStopId))
      .limit(1);

    const busReg = busDetails?.reg || 'School Bus';
    const stopName = stopDetails?.name || 'designated stop';

    const notifTitle = direction === 'dropoff' ? 'Child Dropped' : 'Child Boarded';
    const notifMsg =
      direction === 'dropoff'
        ? `${studentRow.name} has been safely dropped off from Bus ${busReg} at ${stopName}.`
        : `${studentRow.name} has boarded Bus ${busReg} at ${stopName} via QR verification.`;

    const parentRows = await db
      .select({ userId: parents.userId })
      .from(studentParents)
      .innerJoin(parents, eq(parents.id, studentParents.parentId))
      .where(eq(studentParents.studentId, studentId));

    const parentUserIds = [...new Set(parentRows.map((p) => p.userId))];

    if (parentUserIds.length > 0) {
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
      message: `${studentRow.name} successfully verified and marked present/boarded!`,
      data: {
        studentId: studentRow.id,
        studentName: studentRow.name,
        rollNumber: studentRow.rollNumber,
        status: 'boarded',
        boardedAt: now.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Driver scan-qr error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error processing student QR scan.' },
      { status: 500 }
    );
  }
}
