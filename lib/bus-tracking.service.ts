import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from './db';
import {
  buses,
  busLiveLocations,
  busLocations,
  busStops,
  parents,
  studentParents,
  students,
  studentTransportAssignments,
  users,
  transportRoutes,
} from './schema';
import { buildDriverSessionInfo } from './driver-auth';
import { broadcastBusLocation } from './realtime';
import { createNotificationForUser } from './notification-actions';

export type LiveTripStatus =
  | 'waiting_at_school'
  | 'trip_started'
  | 'arriving'
  | 'reached_stop'
  | 'trip_completed';

export type BusLocationInput = {
  driverId: number;
  busId: number;
  routeId?: string | null;
  tripId: string;
  latitude: number;
  longitude: number;
  speed?: number | null;
  heading?: number | null;
  accuracy?: number | null;
  timestamp?: string | number | Date | null;
  status?: LiveTripStatus;
  currentStopId?: number | null;
  nextStopId?: number | null;
  remainingStops?: number | null;
};

export type BusTrackingSnapshot = {
  schoolId: number | null;
  busId: number;
  registrationNumber: string;
  routeName: string | null;
  driverName: string | null;
  driverPhone: string | null;
  capacity: number | null;
  nickname: string | null;
  status: LiveTripStatus | 'offline';
  latitude: number | null;
  longitude: number | null;
  speed: number | null;
  heading: number | null;
  accuracy: number | null;
  tripId: string | null;
  currentStop: string | null;
  nextStop: string | null;
  remainingStops: number | null;
  lastUpdatedAt: string | null;
  stops: {
    id: number;
    stopName: string;
    sequenceNumber: number;
    studentCount: number;
    latitude: number | null;
    longitude: number | null;
  }[];
};

type ParentTransportScope = {
  studentId: number;
  studentName: string | null;
  busId: number;
  routeId?: number | null;
  pickupStopId?: number | null;
  dropStopId?: number | null;
};

declare global {
  // eslint-disable-next-line no-var
  var transportNotificationDedupe: Set<string> | undefined;
}

const notifiedKeys = global.transportNotificationDedupe ?? new Set<string>();

if (process.env.NODE_ENV !== 'production') {
  global.transportNotificationDedupe = notifiedKeys;
}

function toDate(value: BusLocationInput['timestamp']): Date {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date(value);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeStatus(status: string | null | undefined): LiveTripStatus {
  const allowed: LiveTripStatus[] = [
    'waiting_at_school',
    'trip_started',
    'arriving',
    'reached_stop',
    'trip_completed',
  ];
  return allowed.includes(status as LiveTripStatus) ? (status as LiveTripStatus) : 'waiting_at_school';
}

function statusTitle(status: LiveTripStatus): string {
  switch (status) {
    case 'waiting_at_school':
      return 'Bus Waiting at School';
    case 'trip_started':
      return 'Bus Started';
    case 'arriving':
      return 'Bus Near Stop';
    case 'reached_stop':
      return 'Bus Reached Stop';
    case 'trip_completed':
      return 'Trip Finished';
  }
}

function statusMessage(status: LiveTripStatus, busNumber: string): string {
  switch (status) {
    case 'waiting_at_school':
      return `${busNumber} is waiting at school.`;
    case 'trip_started':
      return `${busNumber} has started today's transport trip.`;
    case 'arriving':
      return `${busNumber} is approaching the next stop.`;
    case 'reached_stop':
      return `${busNumber} has reached a route stop.`;
    case 'trip_completed':
      return `${busNumber} has completed the trip.`;
  }
}

function mapSnapshot(row: {
  busId: number;
  schoolId: number | null;
  registrationNumber: string;
  routeName: string | null;
  driverName: string | null;
  driverPhone: string | null;
  capacity: number | null;
  nickname: string | null;
  status: string | null;
  latitude: number | null;
  longitude: number | null;
  speed: number | null;
  heading: number | null;
  accuracy: number | null;
  tripId: string | null;
  currentStopName: string | null;
  nextStopName: string | null;
  remainingStops: number | null;
  lastUpdatedAt: Date | string | null;
  stops: BusTrackingSnapshot['stops'];
}): BusTrackingSnapshot {
  return {
    busId: row.busId,
    schoolId: row.schoolId,
    registrationNumber: row.registrationNumber,
    routeName: row.routeName,
    driverName: row.driverName,
    driverPhone: row.driverPhone,
    capacity: row.capacity,
    nickname: row.nickname,
    status: row.status ? normalizeStatus(row.status) : 'offline',
    latitude: toNumberOrNull(row.latitude),
    longitude: toNumberOrNull(row.longitude),
    speed: toNumberOrNull(row.speed),
    heading: toNumberOrNull(row.heading),
    accuracy: toNumberOrNull(row.accuracy),
    tripId: row.tripId,
    currentStop: row.currentStopName,
    nextStop: row.nextStopName,
    remainingStops: row.remainingStops,
    lastUpdatedAt: row.lastUpdatedAt ? new Date(row.lastUpdatedAt).toISOString() : null,
    stops: row.stops,
  };
}

async function getStops(busId: number): Promise<BusTrackingSnapshot['stops']> {
  const [bus] = await db.select({ routeId: buses.routeId }).from(buses).where(eq(buses.id, busId)).limit(1);
  if (!bus || !bus.routeId) return [];

  return db
    .select({
      id: busStops.id,
      stopName: busStops.stopName,
      sequenceNumber: busStops.sequenceNumber,
      studentCount: busStops.studentCount,
      latitude: busStops.latitude,
      longitude: busStops.longitude,
    })
    .from(busStops)
    .where(eq(busStops.routeId, bus.routeId))
    .orderBy(busStops.sequenceNumber);
}

async function getParentScopes(parentUserId: number): Promise<ParentTransportScope[]> {
  const rows = await db
    .select({
      studentId: students.id,
      studentName: users.name,
      busId: studentTransportAssignments.busId,
      routeId: studentTransportAssignments.routeId,
      pickupStopId: studentTransportAssignments.pickupStopId,
      dropStopId: studentTransportAssignments.dropStopId,
    })
    .from(parents)
    .innerJoin(studentParents, eq(studentParents.parentId, parents.id))
    .innerJoin(students, eq(students.id, studentParents.studentId))
    .innerJoin(users, eq(students.userId, users.id))
    .innerJoin(
      studentTransportAssignments,
      and(
        eq(studentTransportAssignments.studentId, students.id),
        eq(studentTransportAssignments.isActive, true),
      ),
    )
    .innerJoin(buses, eq(buses.id, studentTransportAssignments.busId))
    .where(and(eq(parents.userId, parentUserId), eq(buses.isActive, true)));

  return rows.map((row) => ({
    studentId: row.studentId,
    studentName: row.studentName,
    busId: row.busId,
    routeId: row.routeId,
    pickupStopId: row.pickupStopId,
    dropStopId: row.dropStopId,
  }));
}

export async function getAllowedParentBusIds(parentUserId: number): Promise<number[]> {
  const scopes = await getParentScopes(parentUserId);
  return [...new Set(scopes.map((scope) => scope.busId))];
}

async function getSnapshotByBusId(busId: number): Promise<BusTrackingSnapshot | null> {
  const [row] = await db
    .select({
      busId: buses.id,
      schoolId: buses.schoolId,
      registrationNumber: buses.registrationNumber,
      routeName: buses.routeName,
      driverName: buses.driverName,
      driverPhone: buses.driverPhone,
      capacity: buses.capacity,
      nickname: buses.nickname,
      status: busLiveLocations.status,
      latitude: busLiveLocations.latitude,
      longitude: busLiveLocations.longitude,
      speed: busLiveLocations.speed,
      heading: busLiveLocations.heading,
      accuracy: busLiveLocations.accuracy,
      tripId: busLiveLocations.tripId,
      currentStopName: sql<string | null>`current_stop.stop_name`,
      nextStopName: sql<string | null>`next_stop.stop_name`,
      remainingStops: busLiveLocations.remainingStops,
      lastUpdatedAt: busLiveLocations.lastUpdatedAt,
    })
    .from(buses)
    .leftJoin(busLiveLocations, eq(busLiveLocations.busId, buses.id))
    .leftJoin(sql`bus_stops current_stop`, sql`current_stop.id = ${busLiveLocations.currentStopId}`)
    .leftJoin(sql`bus_stops next_stop`, sql`next_stop.id = ${busLiveLocations.nextStopId}`)
    .where(and(eq(buses.id, busId), eq(buses.isActive, true)))
    .limit(1);

  if (!row) return null;
  return mapSnapshot({ ...row, stops: await getStops(busId) });
}

export async function getParentTrackingSnapshot(parentUserId: number, studentId?: number) {
  const scopes = await getParentScopes(parentUserId);
  const selectedScope = studentId
    ? scopes.find((scope) => scope.studentId === studentId) ?? null
    : scopes[0] ?? null;

  if (!selectedScope) {
    return {
      student: null,
      bus: null,
      allowedBusIds: [],
    };
  }

  let routeName = null;
  if (selectedScope.routeId) {
    const [route] = await db
      .select({ name: transportRoutes.routeName })
      .from(transportRoutes)
      .where(eq(transportRoutes.id, selectedScope.routeId))
      .limit(1);
    routeName = route?.name ?? null;
  }

  let stopName = null;
  if (selectedScope.pickupStopId) {
    const [stop] = await db
      .select({ name: busStops.stopName })
      .from(busStops)
      .where(eq(busStops.id, selectedScope.pickupStopId))
      .limit(1);
    stopName = stop?.name ?? null;
  }

  const busSnapshot = await getSnapshotByBusId(selectedScope.busId);

  return {
    student: {
      id: selectedScope.studentId,
      name: selectedScope.studentName,
      busId: selectedScope.busId,
      routeId: selectedScope.routeId ?? null,
      routeName,
      pickupStopId: selectedScope.pickupStopId ?? null,
      pickupStopName: stopName,
      dropStopId: selectedScope.dropStopId ?? null,
    },
    bus: busSnapshot,
    allowedBusIds: [...new Set(scopes.map((scope) => scope.busId))],
  };
}

export async function getAdminTrackingSnapshots(schoolId?: number | null): Promise<BusTrackingSnapshot[]> {
  const conditions = [eq(buses.isActive, true)];
  if (schoolId) conditions.push(eq(buses.schoolId, schoolId));

  const rows = await db
    .select({
      busId: buses.id,
      schoolId: buses.schoolId,
      registrationNumber: buses.registrationNumber,
      routeName: buses.routeName,
      driverName: buses.driverName,
      driverPhone: buses.driverPhone,
      capacity: buses.capacity,
      nickname: buses.nickname,
      status: busLiveLocations.status,
      latitude: busLiveLocations.latitude,
      longitude: busLiveLocations.longitude,
      speed: busLiveLocations.speed,
      heading: busLiveLocations.heading,
      accuracy: busLiveLocations.accuracy,
      tripId: busLiveLocations.tripId,
      currentStopName: sql<string | null>`current_stop.stop_name`,
      nextStopName: sql<string | null>`next_stop.stop_name`,
      remainingStops: busLiveLocations.remainingStops,
      lastUpdatedAt: busLiveLocations.lastUpdatedAt,
    })
    .from(buses)
    .leftJoin(busLiveLocations, eq(busLiveLocations.busId, buses.id))
    .leftJoin(sql`bus_stops current_stop`, sql`current_stop.id = ${busLiveLocations.currentStopId}`)
    .leftJoin(sql`bus_stops next_stop`, sql`next_stop.id = ${busLiveLocations.nextStopId}`)
    .where(and(...conditions))
    .orderBy(desc(busLiveLocations.lastUpdatedAt));

  return Promise.all(rows.map(async (row) => mapSnapshot({ ...row, stops: await getStops(row.busId) })));
}

async function notifyParentsForStatus(busId: number, status: LiveTripStatus, tripId: string, busNumber: string) {
  if (!['trip_started', 'arriving', 'reached_stop', 'trip_completed'].includes(status)) return;

  const key = `${tripId}:${busId}:${status}`;
  if (notifiedKeys.has(key)) return;
  notifiedKeys.add(key);

  const rows = await db
    .select({ userId: parents.userId })
    .from(studentTransportAssignments)
    .innerJoin(students, eq(students.id, studentTransportAssignments.studentId))
    .innerJoin(studentParents, eq(studentParents.studentId, students.id))
    .innerJoin(parents, eq(parents.id, studentParents.parentId))
    .where(
      and(
        eq(studentTransportAssignments.busId, busId),
        eq(studentTransportAssignments.isActive, true),
      ),
    );

  const userIds = [...new Set(rows.map((row) => row.userId))];
  await Promise.all(
    userIds.map((userId) =>
      createNotificationForUser(
        userId,
        statusTitle(status),
        statusMessage(status, busNumber),
        'transport',
        status === 'arriving' ? 'high' : 'medium',
        '/parent/bus-tracking',
      ),
    ),
  );
}

export async function saveDriverLocation(input: BusLocationInput): Promise<BusTrackingSnapshot> {
  const driver = await buildDriverSessionInfo(input.driverId);
  if (!driver || !driver.assignedBus || driver.assignedBus.id !== input.busId) {
    throw new Error('DRIVER_BUS_SCOPE_VIOLATION');
  }

  const status = normalizeStatus(input.status);
  const timestamp = toDate(input.timestamp);
  const schoolId = driver.schoolId ?? 1;
  const routeId = input.routeId ?? driver.assignedRoute ?? driver.assignedBus.routeName ?? null;

  await db.insert(busLocations).values({
    schoolId,
    busId: input.busId,
    driverId: input.driverId,
    routeId,
    tripId: input.tripId,
    latitude: input.latitude,
    longitude: input.longitude,
    speed: input.speed ?? null,
    heading: input.heading ?? null,
    accuracy: input.accuracy ?? null,
    status,
    currentStopId: input.currentStopId ?? null,
    nextStopId: input.nextStopId ?? null,
    remainingStops: input.remainingStops ?? null,
    timestamp,
  });

  await db
    .insert(busLiveLocations)
    .values({
      schoolId,
      busId: input.busId,
      driverId: input.driverId,
      routeId,
      tripId: input.tripId,
      latitude: input.latitude,
      longitude: input.longitude,
      speed: input.speed ?? null,
      heading: input.heading ?? null,
      accuracy: input.accuracy ?? null,
      status,
      currentStopId: input.currentStopId ?? null,
      nextStopId: input.nextStopId ?? null,
      remainingStops: input.remainingStops ?? null,
      lastUpdatedAt: timestamp,
    })
    .onDuplicateKeyUpdate({
      set: {
        schoolId,
        driverId: input.driverId,
        routeId,
        tripId: input.tripId,
        latitude: input.latitude,
        longitude: input.longitude,
        speed: input.speed ?? null,
        heading: input.heading ?? null,
        accuracy: input.accuracy ?? null,
        status,
        currentStopId: input.currentStopId ?? null,
        nextStopId: input.nextStopId ?? null,
        remainingStops: input.remainingStops ?? null,
        lastUpdatedAt: timestamp,
      },
    });

  const snapshot = await getSnapshotByBusId(input.busId);
  if (!snapshot) {
    throw new Error('BUS_NOT_FOUND');
  }

  broadcastBusLocation(snapshot);
  await notifyParentsForStatus(input.busId, status, input.tripId, snapshot.registrationNumber);

  return snapshot;
}

export async function getRecentBusHistory(busId: number, limit = 200) {
  return db
    .select({
      id: busLocations.id,
      latitude: busLocations.latitude,
      longitude: busLocations.longitude,
      speed: busLocations.speed,
      heading: busLocations.heading,
      accuracy: busLocations.accuracy,
      timestamp: busLocations.timestamp,
    })
    .from(busLocations)
    .where(eq(busLocations.busId, busId))
    .orderBy(desc(busLocations.timestamp))
    .limit(limit);
}

export function filterSnapshotsByBusIds(snapshots: BusTrackingSnapshot[], busIds: number[]) {
  const allowed = new Set(busIds);
  return snapshots.filter((snapshot) => allowed.has(snapshot.busId));
}
