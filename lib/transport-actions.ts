'use server';

import { db } from './db';
import { buses } from './schema';
import { eq, and, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { createNotification } from './notification-actions';
import { parseDbError } from './db-errors';
import { logAudit } from './audit-utils';
import { getCurrentUser } from './auth';

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
async function checkRouteConflict(routeName: string, excludeBusId?: number) {
  if (!routeName) return null;

  const conditions = [
    eq(buses.isActive, true),
    eq(buses.routeName, routeName),
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
  routeName: string
) {
  if (!driverName) throw new Error('Driver name is required.');
  if (!driverPhone) throw new Error('Driver phone number is required.');
  if (!routeName) throw new Error('Route name is required.');

  // Check driver conflict
  const driverConflict = await checkDriverConflict(driverName, driverPhone, busId);
  if (driverConflict) {
    throw new Error("Driver already assigned to another route");
  }

  // Check route conflict
  const routeConflict = await checkRouteConflict(routeName, busId);
  if (routeConflict) {
    throw new Error("Driver already assigned to another route");
  }

  try {
    await db
      .update(buses)
      .set({
        driverName,
        driverPhone,
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

  await logAudit('UPDATE_BUS_ASSIGNMENT', 'bus', busId, `Assigned driver: ${driverName} (${driverPhone}), route: ${routeName}`);

  revalidatePath('/admin/transport');
  revalidatePath('/admin');
}

export async function getAllBuses() {
  const rows = await db.select().from(buses);
  return rows;
}

export async function createBus(data: {
  registrationNumber: string;
  routeName?: string;
  driverName?: string;
  driverPhone?: string;
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
  if (data.routeName) {
    const routeConflict = await checkRouteConflict(data.routeName);
    if (routeConflict) {
      throw new Error("Driver already assigned to another route");
    }
  }

  let insertedId: number;
  try {
    const result = await db.insert(buses).values({
      schoolId,
      registrationNumber: data.registrationNumber,
      routeName: data.routeName || null,
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

  await createNotification('Bus Added', `Bus "${data.registrationNumber}" has been registered.`, 'info', 'medium');
  await logAudit('CREATE_BUS', 'bus', insertedId, `Created bus: ${data.registrationNumber}`, schoolId);

  revalidatePath('/admin/transport');
  revalidatePath('/admin');
}

export async function updateBus(
  id: number,
  data: {
    registrationNumber: string;
    routeName?: string;
    driverName?: string;
    driverPhone?: string;
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
  if (data.routeName) {
    const routeConflict = await checkRouteConflict(data.routeName, id);
    if (routeConflict) {
      throw new Error("Driver already assigned to another route");
    }
  }

  try {
    await db
      .update(buses)
      .set({
        registrationNumber: data.registrationNumber,
        routeName: data.routeName || null,
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
