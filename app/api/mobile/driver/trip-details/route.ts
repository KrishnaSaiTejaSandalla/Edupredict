import { NextResponse } from 'next/server';
import { buildDriverSessionInfo } from '@/lib/driver-auth';
import { getBearerToken, verifyJwt } from '@/lib/jwt';
import { db } from '@/lib/db';
import { transportRoutes, busStops, studentTransportAssignments, students, users, classes, studentParents, parents } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(req: Request) {
  try {
    const token = getBearerToken(req);

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: 'Authentication required.',
          data: null,
          timestamp: new Date().toISOString(),
        },
        { status: 401 },
      );
    }

    const payload = verifyJwt(token);
    if (!payload || payload.role.toLowerCase() !== 'driver') {
      return NextResponse.json(
        {
          success: false,
          message: 'Session expired. Please log in again.',
          code: 'TOKEN_EXPIRED',
          data: null,
          timestamp: new Date().toISOString(),
        },
        { status: 401 },
      );
    }

    const driver = await buildDriverSessionInfo(payload.sub);
    if (!driver) {
      return NextResponse.json(
        {
          success: false,
          message: 'This account is not authorized for Driver App.',
          code: 'UNAUTHORIZED_ROLE',
          data: null,
          timestamp: new Date().toISOString(),
        },
        { status: 403 },
      );
    }

    const assignedBus = driver.assignedBus;
    if (!assignedBus || !assignedBus.routeId) {
      return NextResponse.json({
        success: true,
        message: 'No active route assigned to this driver.',
        timestamp: new Date().toISOString(),
        data: {
          routeId: null,
          routeName: null,
          routeType: null,
          stops: [],
          expectedStudents: [],
        },
      });
    }

    const routeId = assignedBus.routeId;
    const [route] = await db
      .select()
      .from(transportRoutes)
      .where(eq(transportRoutes.id, routeId))
      .limit(1);

    if (!route) {
      return NextResponse.json(
        {
          success: false,
          message: 'Route details not found.',
          data: null,
          timestamp: new Date().toISOString(),
        },
        { status: 404 },
      );
    }

    // Fetch ordered stops on this route
    const stops = await db
      .select()
      .from(busStops)
      .where(eq(busStops.routeId, routeId))
      .orderBy(busStops.sequenceNumber);

    // Fetch students assigned to this route & stops with parent info
    const stopsWithStudents = await Promise.all(
      stops.map(async (stop) => {
        const assignedStudents = await db
          .select({
            id: students.id,
            name: users.name,
            rollNumber: students.rollNumber,
            classId: students.classId,
            className: classes.name,
            classSection: classes.section,
          })
          .from(studentTransportAssignments)
          .innerJoin(students, eq(studentTransportAssignments.studentId, students.id))
          .innerJoin(users, eq(students.userId, users.id))
          .innerJoin(classes, eq(students.classId, classes.id))
          .where(
            and(
              eq(studentTransportAssignments.busId, assignedBus.id),
              eq(studentTransportAssignments.routeId, routeId),
              eq(studentTransportAssignments.pickupStopId, stop.id),
              eq(studentTransportAssignments.isActive, true)
            )
          );

        const studentsWithParentDetails = await Promise.all(
          (assignedStudents || []).map(async (student) => {
            const [parentInfo] = await db
              .select({
                parentName: users.name,
                phoneNumber: parents.phoneNumber,
                userPhone: users.phoneNumber,
              })
              .from(studentParents)
              .innerJoin(parents, eq(studentParents.parentId, parents.id))
              .innerJoin(users, eq(parents.userId, users.id))
              .where(eq(studentParents.studentId, student.id))
              .limit(1);

            return {
              ...student,
              parentName: parentInfo?.parentName || 'Parent / Guardian',
              parentPhone: parentInfo?.phoneNumber || parentInfo?.userPhone || '',
              pickupTime: stop.pickupTime || '08:00 AM',
              dropTime: stop.dropTime || '04:30 PM',
            };
          })
        );

        return {
          id: stop.id,
          stopName: stop.stopName,
          latitude: stop.latitude,
          longitude: stop.longitude,
          pickupTime: stop.pickupTime,
          dropTime: stop.dropTime,
          sequenceNumber: stop.sequenceNumber,
          students: studentsWithParentDetails || [],
        };
      })
    );

    const allExpectedStudents = stopsWithStudents.flatMap((s) => s.students || []) || [];

    return NextResponse.json({
      success: true,
      message: 'Trip details loaded.',
      timestamp: new Date().toISOString(),
      data: {
        routeId: route.id,
        routeName: route.routeName,
        routeType: route.type,
        stops: stopsWithStudents,
        expectedStudents: allExpectedStudents,
      },
    });
  } catch (error) {
    console.error('[mobile/driver/trip-details]', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Server error occurred.',
        data: null,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
