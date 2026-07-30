import { NextResponse } from 'next/server';
import { getBearerToken, verifyJwt } from '@/lib/jwt';
import { db } from '@/lib/db';
import { students, users, studentTransportAssignments, buses, transportRoutes, busStops, classes } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = getBearerToken(req);
    const payload = token ? verifyJwt(token) : null;

    if (!payload || payload.role.toLowerCase() !== 'driver') {
      return NextResponse.json(
        { success: false, message: 'Authentication required.' },
        { status: 401 }
      );
    }

    const { id: studentIdStr } = await params;
    const studentId = Number(studentIdStr);

    if (!studentId) {
      return NextResponse.json(
        { success: false, message: 'Invalid student ID.' },
        { status: 400 }
      );
    }

    // First fetch student & user info
    const [studentInfo] = await db
      .select({
        id: students.id,
        name: users.name,
        rollNumber: students.rollNumber,
        className: classes.name,
        classSection: classes.section,
      })
      .from(students)
      .innerJoin(users, eq(students.userId, users.id))
      .innerJoin(classes, eq(students.classId, classes.id))
      .where(eq(students.id, studentId))
      .limit(1);

    if (!studentInfo) {
      return NextResponse.json(
        { success: false, message: 'Student not found.' },
        { status: 404 }
      );
    }

    // Now look for active transport assignment
    const [assignment] = await db
      .select({
        busId: studentTransportAssignments.busId,
        busNumber: buses.registrationNumber,
        routeId: studentTransportAssignments.routeId,
        routeName: transportRoutes.routeName,
        stopId: studentTransportAssignments.pickupStopId,
        stopName: busStops.stopName,
      })
      .from(studentTransportAssignments)
      .innerJoin(buses, eq(studentTransportAssignments.busId, buses.id))
      .leftJoin(transportRoutes, eq(studentTransportAssignments.routeId, transportRoutes.id))
      .leftJoin(busStops, eq(studentTransportAssignments.pickupStopId, busStops.id))
      .where(
        and(
          eq(studentTransportAssignments.studentId, studentId),
          eq(studentTransportAssignments.isActive, true)
        )
      )
      .limit(1);

    return NextResponse.json({
      success: true,
      data: {
        studentId: studentInfo.id,
        name: studentInfo.name,
        rollNumber: studentInfo.rollNumber,
        className: studentInfo.className,
        classSection: studentInfo.classSection,
        assignedBusId: assignment?.busId ?? null,
        assignedBusNumber: assignment?.busNumber ?? null,
        routeId: assignment?.routeId ?? null,
        routeName: assignment?.routeName ?? null,
        stopId: assignment?.stopId ?? null,
        pickupStopName: assignment?.stopName ?? null,
      },
    });
  } catch (error) {
    console.error('GET validate student error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error during lookup.' },
      { status: 500 }
    );
  }
}
