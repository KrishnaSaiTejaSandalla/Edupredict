'use server';

import { db } from './db';
import { buses, busStops, users, students, studentTransportAssignments, classes, transportRoutes } from './schema';
import { eq, and, sql, or, like, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { createNotification } from './notification-actions';
import { parseDbError } from './db-errors';
import { logAudit } from './audit-utils';
import { getCurrentUser } from './auth';
import { findDriverByPhone } from './driver-auth';
import bcrypt from 'bcryptjs';

// ==================== TRANSPORT ACTIONS ====================

/**
 * Validates that a driver is not assigned to another active bus.
 */
async function checkDriverConflict(driverName: string, driverPhone: string, excludeBusId?: number) {
  const conditions = [
    eq(buses.isActive, true),
    eq(buses.driverName, driverName),
    eq(buses.driverPhone, driverPhone),
  ];

  if (excludeBusId) {
    conditions.push(sql`${buses.id} != ${excludeBusId}`);
  }

  const conflict = await db
    .select({ id: buses.id, registrationNumber: buses.registrationNumber })
    .from(buses)
    .where(and(...conditions))
    .limit(1);

  return conflict.length > 0 ? conflict[0] : null;
}

/**
 * Validates that a route is not assigned to another active bus.
 */
async function checkRouteConflict(routeId: number, excludeBusId?: number) {
  if (!routeId) return null;

  const conditions = [
    eq(buses.isActive, true),
    eq(buses.routeId, routeId),
  ];

  if (excludeBusId) {
    conditions.push(sql`${buses.id} != ${excludeBusId}`);
  }

  const conflict = await db
    .select({ id: buses.id, registrationNumber: buses.registrationNumber })
    .from(buses)
    .where(and(...conditions))
    .limit(1);

  return conflict.length > 0 ? conflict[0] : null;
}

export async function assignDriverAndRoute(
  busId: number,
  driverName: string,
  driverPhone: string,
  routeId: number
) {
  if (!driverName) throw new Error('Driver name is required.');
  if (!driverPhone) throw new Error('Driver phone number is required.');
  if (!routeId) throw new Error('Route selection is required.');

  // Check driver conflict
  const driverConflict = await checkDriverConflict(driverName, driverPhone, busId);
  if (driverConflict) {
    throw new Error("Driver already assigned to another route");
  }

  // Check route conflict
  const routeConflict = await checkRouteConflict(routeId, busId);
  if (routeConflict) {
    throw new Error("Route already assigned to another bus");
  }

  // Fetch route name
  const [route] = await db
    .select({ name: transportRoutes.routeName })
    .from(transportRoutes)
    .where(eq(transportRoutes.id, routeId))
    .limit(1);
  const routeName = route?.name ?? '';

  try {
    await db
      .update(buses)
      .set({
        driverName,
        driverPhone,
        routeId,
        routeName,
        updatedAt: new Date(),
      })
      .where(eq(buses.id, busId));
  } catch (err) {
    throw new Error(parseDbError(err));
  }

  await createNotification(
    'Bus Assignment Updated',
    `Driver "${driverName}" assigned to route "${routeName}".`,
    'info',
    'medium'
  );

  await logAudit('UPDATE_BUS_ASSIGNMENT', 'bus', busId, `Assigned driver: ${driverName} (${driverPhone}), route ID: ${routeId}`);

  revalidatePath('/admin/transport');
  revalidatePath('/admin');
}

export async function getAllBuses() {
  const rows = await db
    .select({
      id: buses.id,
      schoolId: buses.schoolId,
      registrationNumber: buses.registrationNumber,
      nickname: buses.nickname,
      routeName: buses.routeName,
      routeId: buses.routeId,
      driverName: buses.driverName,
      driverPhone: buses.driverPhone,
      capacity: buses.capacity,
      isActive: buses.isActive,
      createdAt: buses.createdAt,
      updatedAt: buses.updatedAt,
      actualRouteName: transportRoutes.routeName,
      assignedCount: sql<number>`COALESCE((SELECT COUNT(*) FROM student_transport_assignments WHERE bus_id = buses.id AND is_active = true), 0)`,
    })
    .from(buses)
    .leftJoin(transportRoutes, eq(buses.routeId, transportRoutes.id));
  return rows;
}

export async function createBus(data: {
  registrationNumber: string;
  routeId?: number;
  driverName?: string;
  driverPhone?: string;
  driverPassword?: string;
  capacity?: number;
}) {
  if (!data.registrationNumber) throw new Error('Registration number is required.');

  const user = await getCurrentUser();
  const schoolId = user?.school?.id ?? 1;

  // Check driver conflict if driver provided
  if (data.driverName && data.driverPhone) {
    const driverConflict = await checkDriverConflict(data.driverName, data.driverPhone);
    if (driverConflict) {
      throw new Error("Driver already assigned to another route");
    }
  }

  // Check route conflict if route provided
  if (data.routeId) {
    const routeConflict = await checkRouteConflict(data.routeId);
    if (routeConflict) {
      throw new Error("Route already assigned to another bus");
    }
  }

  // Create/Sync Driver User in the users table
  if (data.driverName && data.driverPhone) {
    if (!data.driverPassword) {
      throw new Error("Password is required for new drivers.");
    }
    const hashedPassword = await bcrypt.hash(data.driverPassword, 10);
    const existingDriver = await findDriverByPhone(data.driverPhone);

    if (existingDriver) {
      await db
        .update(users)
        .set({
          name: data.driverName,
          password: hashedPassword,
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existingDriver.id));
    } else {
      const normalizedPhone = data.driverPhone.replace(/\D/g, '');
      await db.insert(users).values({
        email: `driver.${normalizedPhone}@edupredict.com`,
        name: data.driverName,
        password: hashedPassword,
        role: 'driver',
        schoolId,
        phoneNumber: data.driverPhone,
        isActive: true,
      });
    }
  }

  let fetchedRouteName = null;
  if (data.routeId) {
    const [route] = await db
      .select({ name: transportRoutes.routeName })
      .from(transportRoutes)
      .where(eq(transportRoutes.id, data.routeId))
      .limit(1);
    fetchedRouteName = route?.name ?? null;
  }

  let insertedId: number;
  try {
    const result = await db.insert(buses).values({
      schoolId,
      registrationNumber: data.registrationNumber,
      routeId: data.routeId || null,
      routeName: fetchedRouteName,
      driverName: data.driverName || null,
      driverPhone: data.driverPhone || null,
      capacity: data.capacity || null,
      isActive: true,
      updatedAt: new Date(),
    });
    insertedId = Number(result[0].insertId);
  } catch (err) {
    throw new Error(parseDbError(err));
  }

  await createNotification('Bus Registered', `Bus "${data.registrationNumber}" has been registered.`, 'info', 'medium');
  await logAudit('CREATE_BUS', 'bus', insertedId, `Created bus: ${data.registrationNumber}`, schoolId);

  revalidatePath('/admin/transport');
  revalidatePath('/admin');
}

export async function updateBus(
  id: number,
  data: {
    registrationNumber: string;
    routeId?: number;
    driverName?: string;
    driverPhone?: string;
    driverPassword?: string;
    capacity?: number;
    isActive?: boolean;
  }
) {
  if (!data.registrationNumber) throw new Error('Registration number is required.');

  // Check driver conflict if driver provided
  if (data.driverName && data.driverPhone) {
    const driverConflict = await checkDriverConflict(data.driverName, data.driverPhone, id);
    if (driverConflict) {
      throw new Error("Driver already assigned to another route");
    }
  }

  // Check route conflict if route provided
  if (data.routeId) {
    const routeConflict = await checkRouteConflict(data.routeId, id);
    if (routeConflict) {
      throw new Error("Route already assigned to another bus");
    }
  }

  // Create/Sync/Update Driver User in the users table
  if (data.driverName && data.driverPhone) {
    const existingDriver = await findDriverByPhone(data.driverPhone);

    if (existingDriver) {
      const updateData: any = {
        name: data.driverName,
        isActive: true,
        updatedAt: new Date(),
      };
      if (data.driverPassword) {
        updateData.password = await bcrypt.hash(data.driverPassword, 10);
      }
      await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, existingDriver.id));
    } else {
      if (!data.driverPassword) {
        throw new Error("Password is required for new drivers.");
      }
      const hashedPassword = await bcrypt.hash(data.driverPassword, 10);
      const normalizedPhone = data.driverPhone.replace(/\D/g, '');
      const currentUser = await getCurrentUser();
      const schoolId = currentUser?.school?.id ?? 1;

      await db.insert(users).values({
        email: `driver.${normalizedPhone}@edupredict.com`,
        name: data.driverName,
        password: hashedPassword,
        role: 'driver',
        schoolId,
        phoneNumber: data.driverPhone,
        isActive: true,
      });
    }
  }

  let fetchedRouteName = null;
  if (data.routeId) {
    const [route] = await db
      .select({ name: transportRoutes.routeName })
      .from(transportRoutes)
      .where(eq(transportRoutes.id, data.routeId))
      .limit(1);
    fetchedRouteName = route?.name ?? null;
  }

  try {
    await db
      .update(buses)
      .set({
        registrationNumber: data.registrationNumber,
        routeId: data.routeId || null,
        routeName: fetchedRouteName,
        driverName: data.driverName || null,
        driverPhone: data.driverPhone || null,
        capacity: data.capacity || null,
        isActive: data.isActive ?? true,
        updatedAt: new Date(),
      })
      .where(eq(buses.id, id));
  } catch (err) {
    throw new Error(parseDbError(err));
  }

  await createNotification('Bus Updated', `Bus "${data.registrationNumber}" details have been updated.`, 'info', 'medium');
  await logAudit('UPDATE_BUS', 'bus', id, `Updated bus: ${data.registrationNumber}`);

  revalidatePath('/admin/transport');
  revalidatePath('/admin');
}

export async function deleteBus(id: number) {
  const [bus] = await db.select().from(buses).where(eq(buses.id, id)).limit(1);
  const regNum = bus?.registrationNumber || 'Unknown';

  try {
    await db.delete(buses).where(eq(buses.id, id));
  } catch (err) {
    throw new Error(parseDbError(err));
  }

  await createNotification('Bus Removed', `Bus "${regNum}" has been removed from the system.`, 'info', 'medium');
  await logAudit('DELETE_BUS', 'bus', id, `Deleted bus: ${regNum}`);

  revalidatePath('/admin/transport');
  revalidatePath('/admin');
}

// ==================== ROUTE CRUD ACTIONS ====================

export async function getAllRoutes() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') throw new Error('Unauthorized');
  const schoolId = user.school?.id ?? 1;

  const rows = await db
    .select({
      id: transportRoutes.id,
      schoolId: transportRoutes.schoolId,
      routeName: transportRoutes.routeName,
      type: transportRoutes.type,
      isActive: transportRoutes.isActive,
      createdAt: transportRoutes.createdAt,
      updatedAt: transportRoutes.updatedAt,
      stopCount: sql<number>`COALESCE((SELECT COUNT(*) FROM bus_stops WHERE route_id = transport_routes.id), 0)`,
      assignedBuses: sql<string>`COALESCE((SELECT GROUP_CONCAT(registration_number SEPARATOR ', ') FROM buses WHERE route_id = transport_routes.id AND is_active = true), '')`,
    })
    .from(transportRoutes)
    .where(eq(transportRoutes.schoolId, schoolId));
  return rows;
}

export async function createRoute(data: { routeName: string; type: string }) {
  if (!data.routeName) throw new Error('Route name is required.');
  if (!data.type) throw new Error('Route type is required.');

  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') throw new Error('Unauthorized');
  const schoolId = user.school?.id ?? 1;

  let insertedId: number;
  try {
    const result = await db.insert(transportRoutes).values({
      schoolId,
      routeName: data.routeName,
      type: data.type,
      isActive: true,
    });
    insertedId = Number(result[0].insertId);
  } catch (err) {
    throw new Error(parseDbError(err));
  }

  await createNotification('Route Created', `Route "${data.routeName}" has been created.`, 'info', 'medium');
  await logAudit('CREATE_ROUTE', 'transport_routes', insertedId, `Created route: ${data.routeName}`, schoolId);

  revalidatePath('/admin/transport');
  return { success: true, id: insertedId };
}

export async function updateRoute(id: number, data: { routeName: string; type: string; isActive?: boolean }) {
  if (!data.routeName) throw new Error('Route name is required.');
  if (!data.type) throw new Error('Route type is required.');

  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') throw new Error('Unauthorized');

  try {
    await db
      .update(transportRoutes)
      .set({
        routeName: data.routeName,
        type: data.type,
        isActive: data.isActive ?? true,
        updatedAt: new Date(),
      })
      .where(eq(transportRoutes.id, id));
  } catch (err) {
    throw new Error(parseDbError(err));
  }

  await createNotification('Route Updated', `Route "${data.routeName}" details have been updated.`, 'info', 'medium');
  await logAudit('UPDATE_ROUTE', 'transport_routes', id, `Updated route: ${data.routeName}`);

  revalidatePath('/admin/transport');
  return { success: true };
}

export async function deleteRoute(id: number) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') throw new Error('Unauthorized');

  const [route] = await db.select().from(transportRoutes).where(eq(transportRoutes.id, id)).limit(1);
  const name = route?.routeName || 'Unknown';

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(buses)
        .set({ routeId: null, routeName: null, updatedAt: new Date() })
        .where(eq(buses.routeId, id));

      await tx.delete(busStops).where(eq(busStops.routeId, id));

      await tx
        .update(studentTransportAssignments)
        .set({ isActive: false, routeId: null, pickupStopId: null, dropStopId: null, updatedAt: new Date() })
        .where(eq(studentTransportAssignments.routeId, id));

      await tx.delete(transportRoutes).where(eq(transportRoutes.id, id));
    });
  } catch (err) {
    throw new Error(parseDbError(err));
  }

  await createNotification('Route Removed', `Route "${name}" has been deleted.`, 'info', 'medium');
  await logAudit('DELETE_ROUTE', 'transport_routes', id, `Deleted route: ${name}`);

  revalidatePath('/admin/transport');
  return { success: true };
}

// ==================== STOP CRUD ACTIONS ====================

export async function getAllStops() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') throw new Error('Unauthorized');
  const schoolId = user.school?.id ?? 1;

  const rows = await db
    .select({
      id: busStops.id,
      routeId: busStops.routeId,
      routeName: transportRoutes.routeName,
      stopName: busStops.stopName,
      pickupTime: busStops.pickupTime,
      dropTime: busStops.dropTime,
      sequenceNumber: busStops.sequenceNumber,
      latitude: busStops.latitude,
      longitude: busStops.longitude,
      studentCount: busStops.studentCount,
    })
    .from(busStops)
    .innerJoin(transportRoutes, eq(busStops.routeId, transportRoutes.id))
    .where(eq(transportRoutes.schoolId, schoolId))
    .orderBy(transportRoutes.routeName, busStops.sequenceNumber);
  return rows;
}

export async function getRouteStops(routeId: number) {
  const rows = await db
    .select()
    .from(busStops)
    .where(eq(busStops.routeId, routeId))
    .orderBy(busStops.sequenceNumber);
  return rows;
}

export async function getBusStops(busId: number) {
  // Finds stops via the bus's assigned routeId
  const [bus] = await db.select({ routeId: buses.routeId }).from(buses).where(eq(buses.id, busId)).limit(1);
  if (!bus || !bus.routeId) return [];

  const rows = await db
    .select()
    .from(busStops)
    .where(eq(busStops.routeId, bus.routeId))
    .orderBy(busStops.sequenceNumber);
  return rows;
}

export async function saveBusStops(
  busId: number,
  stops: { stopName: string; pickupTime: string; dropTime: string; sequenceNumber: number; studentCount?: number }[]
) {
  // Retained for backward compatibility
  const [bus] = await db.select({ routeId: buses.routeId }).from(buses).where(eq(buses.id, busId)).limit(1);
  if (!bus || !bus.routeId) throw new Error("No route assigned to this bus.");

  await saveRouteStops(bus.routeId, stops);
}

export async function saveRouteStops(
  routeId: number,
  stopsList: { id?: number; stopName: string; pickupTime: string; dropTime: string; sequenceNumber: number; latitude?: number; longitude?: number }[]
) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') throw new Error('Unauthorized');

  try {
    await db.transaction(async (tx) => {
      await tx.delete(busStops).where(eq(busStops.routeId, routeId));

      if (stopsList.length > 0) {
        await tx.insert(busStops).values(
          stopsList.map((stop) => ({
            routeId,
            stopName: stop.stopName,
            pickupTime: stop.pickupTime,
            dropTime: stop.dropTime,
            sequenceNumber: stop.sequenceNumber,
            latitude: stop.latitude ?? null,
            longitude: stop.longitude ?? null,
            studentCount: 0,
          }))
        );
      }
    });
  } catch (err) {
    throw new Error(parseDbError(err));
  }

  await logAudit('UPDATE_ROUTE_STOPS', 'transport_routes', routeId, `Updated ${stopsList.length} stops for route ID ${routeId}`);
  revalidatePath('/admin/transport');
}

export async function createStop(data: {
  routeId: number;
  stopName: string;
  pickupTime: string;
  dropTime: string;
  latitude?: number;
  longitude?: number;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') throw new Error('Unauthorized');

  const existingStops = await db
    .select({ seq: busStops.sequenceNumber })
    .from(busStops)
    .where(eq(busStops.routeId, data.routeId))
    .orderBy(desc(busStops.sequenceNumber))
    .limit(1);
  const nextSeq = existingStops.length > 0 ? existingStops[0].seq + 1 : 1;

  let insertedId: number;
  try {
    const result = await db.insert(busStops).values({
      routeId: data.routeId,
      stopName: data.stopName,
      pickupTime: data.pickupTime,
      dropTime: data.dropTime,
      sequenceNumber: nextSeq,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      studentCount: 0,
    });
    insertedId = Number(result[0].insertId);
  } catch (err) {
    throw new Error(parseDbError(err));
  }

  await logAudit('CREATE_STOP', 'bus_stops', insertedId, `Created stop: ${data.stopName} on route ${data.routeId}`);
  revalidatePath('/admin/transport');
  return { success: true, id: insertedId };
}

export async function updateStop(
  id: number,
  data: {
    routeId: number;
    stopName: string;
    pickupTime: string;
    dropTime: string;
    latitude?: number;
    longitude?: number;
    sequenceNumber?: number;
  }
) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') throw new Error('Unauthorized');

  try {
    await db
      .update(busStops)
      .set({
        routeId: data.routeId,
        stopName: data.stopName,
        pickupTime: data.pickupTime,
        dropTime: data.dropTime,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        sequenceNumber: data.sequenceNumber,
        updatedAt: new Date(),
      })
      .where(eq(busStops.id, id));
  } catch (err) {
    throw new Error(parseDbError(err));
  }

  await logAudit('UPDATE_STOP', 'bus_stops', id, `Updated stop ID ${id}`);
  revalidatePath('/admin/transport');
  return { success: true };
}

export async function deleteStop(id: number) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') throw new Error('Unauthorized');

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(studentTransportAssignments)
        .set({ pickupStopId: null, isActive: false, updatedAt: new Date() })
        .where(eq(studentTransportAssignments.pickupStopId, id));

      await tx.delete(busStops).where(eq(busStops.id, id));
    });
  } catch (err) {
    throw new Error(parseDbError(err));
  }

  await logAudit('DELETE_STOP', 'bus_stops', id, `Deleted stop ID ${id}`);
  revalidatePath('/admin/transport');
  return { success: true };
}

// ==================== STUDENT TRANSPORT ASSIGNMENT ACTIONS ====================

export async function getStudentsForTransport(filters: {
  classId?: number;
  busId?: number;
  routeId?: number;
  search?: string;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') throw new Error('Unauthorized');

  const baseQuery = db
    .select({
      id: students.id,
      rollNumber: students.rollNumber,
      userId: students.userId,
      name: users.name,
      classId: students.classId,
      className: classes.name,
      classSection: classes.section,
      assignedBusId: studentTransportAssignments.busId,
      assignedBusNumber: buses.registrationNumber,
      routeId: studentTransportAssignments.routeId,
      routeName: transportRoutes.routeName,
      pickupStopId: studentTransportAssignments.pickupStopId,
      pickupStopName: busStops.stopName,
      dropStopId: studentTransportAssignments.dropStopId,
      morningPickupTime: studentTransportAssignments.morningPickupTime,
      returnTime: studentTransportAssignments.returnTime,
    })
    .from(students)
    .innerJoin(users, eq(students.userId, users.id))
    .innerJoin(classes, eq(students.classId, classes.id))
    .leftJoin(
      studentTransportAssignments,
      and(
        eq(studentTransportAssignments.studentId, students.id),
        eq(studentTransportAssignments.isActive, true)
      )
    )
    .leftJoin(buses, eq(studentTransportAssignments.busId, buses.id))
    .leftJoin(transportRoutes, eq(studentTransportAssignments.routeId, transportRoutes.id))
    .leftJoin(busStops, eq(studentTransportAssignments.pickupStopId, busStops.id));

  const whereConditions = [];

  if (filters.classId) {
    whereConditions.push(eq(students.classId, filters.classId));
  }
  if (filters.busId) {
    whereConditions.push(eq(studentTransportAssignments.busId, filters.busId));
  }
  if (filters.routeId) {
    whereConditions.push(eq(studentTransportAssignments.routeId, filters.routeId));
  }
  if (filters.search) {
    whereConditions.push(
      or(
        like(users.name, `%${filters.search}%`),
        like(students.rollNumber, `%${filters.search}%`)
      )
    );
  }

  const query = whereConditions.length > 0
    ? baseQuery.where(and(...whereConditions))
    : baseQuery;

  return query;
}

export async function assignStudentToBus(
  studentId: number,
  busId: number,
  routeId: number,
  pickupStopId?: number | null,
  dropStopId?: number | null,
  morningPickupTime?: string | null,
  returnTime?: string | null
) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') throw new Error('Unauthorized');

  try {
    await db.transaction(async (tx) => {
      // 1. Deactivate existing active assignment for this student (if any)
      await tx
        .update(studentTransportAssignments)
        .set({ isActive: false, updatedAt: new Date() })
        .where(
          and(
            eq(studentTransportAssignments.studentId, studentId),
            eq(studentTransportAssignments.isActive, true)
          )
        );

      // 2. Insert new assignment
      await tx.insert(studentTransportAssignments).values({
        studentId,
        busId,
        routeId,
        pickupStopId: pickupStopId || null,
        dropStopId: dropStopId || null,
        assignedBy: user.id,
        morningPickupTime: morningPickupTime || null,
        returnTime: returnTime || null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    await logAudit('ASSIGN_STUDENT_TRANSPORT', 'student', studentId, `Assigned student ID ${studentId} to bus ID ${busId}, route ID ${routeId}`);
    revalidatePath('/admin/transport');
    return { success: true };
  } catch (err) {
    throw new Error(parseDbError(err));
  }
}

export async function removeStudentFromBus(studentId: number, busId: number) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') throw new Error('Unauthorized');

  try {
    await db
      .update(studentTransportAssignments)
      .set({ isActive: false, updatedAt: new Date() })
      .where(
        and(
          eq(studentTransportAssignments.studentId, studentId),
          eq(studentTransportAssignments.busId, busId),
          eq(studentTransportAssignments.isActive, true)
        )
      );

    await logAudit('REMOVE_STUDENT_TRANSPORT', 'student', studentId, `Removed student ID ${studentId} from bus ID ${busId}`);
    revalidatePath('/admin/transport');
    return { success: true };
  } catch (err) {
    throw new Error(parseDbError(err));
  }
}

export async function bulkAssignStudentsToBus(studentIds: number[], busId: number) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') throw new Error('Unauthorized');

  if (studentIds.length === 0) return { success: true };

  // Fetch routeId assigned to this bus
  const [bus] = await db.select({ routeId: buses.routeId }).from(buses).where(eq(buses.id, busId)).limit(1);
  const routeId = bus?.routeId ?? null;

  try {
    await db.transaction(async (tx) => {
      // Deactivate active assignments for all these students
      await tx
        .update(studentTransportAssignments)
        .set({ isActive: false, updatedAt: new Date() })
        .where(
          and(
            eq(studentTransportAssignments.isActive, true),
            sql`${studentTransportAssignments.studentId} IN (${sql.raw(studentIds.join(','))})`
          )
        );

      // Insert new assignments in bulk
      await tx.insert(studentTransportAssignments).values(
        studentIds.map((studentId) => ({
          studentId,
          busId,
          routeId,
          assignedBy: user.id,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }))
      );
    });

    await logAudit('BULK_ASSIGN_TRANSPORT', 'bus', busId, `Bulk assigned ${studentIds.length} students to bus ID ${busId}`);
    revalidatePath('/admin/transport');
    return { success: true };
  } catch (err) {
    throw new Error(parseDbError(err));
  }
}
