import { db } from '@/lib/db';
import { buses, users } from '@/lib/schema';
import { and, eq } from 'drizzle-orm';

export interface DriverPermissions {
  canStartTrip: boolean;
  canMarkAttendance: boolean;
  canViewStudents: boolean;
  canReportIncident: boolean;
}

export interface AssignedBusInfo {
  id: number;
  busNumber: string;
  registrationNumber: string;
  routeName: string | null;
  routeId: number | null;
  capacity: number | null;
  nickname: string | null;
}

export interface DriverSessionInfo {
  id: number;
  name: string;
  phone: string;
  email: string;
  role: string;
  photoUrl: string | null;
  schoolId: number | null;
  assignedBus: AssignedBusInfo | null;
  assignedRoute: string | null;
  permissions: DriverPermissions;
}

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function phonesMatch(a: string, b: string): boolean {
  const normalizedA = normalizePhone(a);
  const normalizedB = normalizePhone(b);
  if (!normalizedA || !normalizedB) return false;
  if (normalizedA === normalizedB) return true;

  const lastA = normalizedA.slice(-10);
  const lastB = normalizedB.slice(-10);
  return lastA.length >= 10 && lastA === lastB;
}

export async function findDriverByPhone(mobileNumber: string) {
  const normalizedInput = normalizePhone(mobileNumber);
  if (!normalizedInput) return null;

  const driverUsers = await db
    .select()
    .from(users)
    .where(and(eq(users.role, 'driver'), eq(users.isActive, true)));

  return driverUsers.find((user) => {
    if (!user.phoneNumber) return false;
    return phonesMatch(user.phoneNumber, mobileNumber);
  }) ?? null;
}

export async function findAssignedBusForDriver(phone: string, schoolId?: number | null) {
  const activeBuses = await db
    .select()
    .from(buses)
    .where(eq(buses.isActive, true));

  const matched = activeBuses.find((bus) => {
    if (!bus.driverPhone) return false;
    if (schoolId && bus.schoolId !== schoolId) return false;
    return phonesMatch(bus.driverPhone, phone);
  });

  if (!matched) return null;

  return {
    id: matched.id,
    busNumber: matched.registrationNumber,
    registrationNumber: matched.registrationNumber,
    routeName: matched.routeName,
    routeId: matched.routeId,
    capacity: matched.capacity,
    nickname: matched.nickname,
  } satisfies AssignedBusInfo;
}

export function buildDriverPermissions(): DriverPermissions {
  return {
    canStartTrip: true,
    canMarkAttendance: true,
    canViewStudents: true,
    canReportIncident: true,
  };
}

export async function buildDriverSessionInfo(userId: number): Promise<DriverSessionInfo | null> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user || user.role !== 'driver' || !user.isActive) return null;

  const phone = user.phoneNumber ?? '';
  const assignedBus = phone ? await findAssignedBusForDriver(phone, user.schoolId) : null;

  return {
    id: user.id,
    name: user.name,
    phone,
    email: user.email,
    role: user.role,
    photoUrl: user.profileImageUrl ?? null,
    schoolId: user.schoolId,
    assignedBus,
    assignedRoute: assignedBus?.routeName ?? null,
    permissions: buildDriverPermissions(),
  };
}
