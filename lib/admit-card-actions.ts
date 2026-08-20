'use server';

import { db } from './db';
import { students, users, classes, schools, studentTransportAssignments, buses, transportRoutes, busStops } from './schema';
import { eq, and, or, like, sql, inArray } from 'drizzle-orm';
import crypto from 'crypto';

export interface AdmitCardClassOption {
  id: number;
  name: string;
  section: string | null;
  displayName: string;
}

export interface AdmitCardStudentRecord {
  id: number;
  userId: number;
  studentName: string;
  email: string;
  rollNumber: string | null;
  classId: number;
  className: string;
  classSection: string | null;
  classDisplayName: string;
  gender: string | null;
  dateOfBirth: string | null;
  phoneNumber: string | null;
  profileImageUrl: string | null;
  qrToken: string;
  admissionDate: string | null;
}

export interface StudentAdmitCardDetails {
  student: {
    id: number;
    userId: number;
    name: string;
    email: string;
    rollNumber: string | null;
    gender: string | null;
    dateOfBirth: string | null;
    phoneNumber: string | null;
    profileImageUrl: string | null;
    qrToken: string;
    admissionDate: string | null;
  };
  classInfo: {
    id: number;
    name: string;
    section: string | null;
    displayName: string;
    academicYear: string | null;
  };
  school: {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    pincode: string | null;
    principalName: string | null;
    affiliationBoard: string | null;
    registrationNumber: string | null;
    udiseCode: string | null;
    logoUrl: string | null;
    website: string | null;
  } | null;
}

export interface VerifiedStudentInfo {
  isValid: boolean;
  student?: {
    id: number;
    userId: number;
    name: string;
    email: string;
    rollNumber: string | null;
    gender: string | null;
    dateOfBirth: string | null;
    phoneNumber: string | null;
    profileImageUrl: string | null;
    classDisplayName: string;
    schoolName: string;
  };
  transport?: {
    busNumber: string;
    routeName: string;
    pickupStop: string | null;
    morningPickupTime: string | null;
    returnTime: string | null;
  } | null;
  message?: string;
}

/**
 * Ensures a student has a secure, unique, persistent QR token.
 */
export async function ensureStudentQrToken(studentId: number): Promise<string> {
  const [row] = await db
    .select({ id: students.id, qrToken: students.qrToken })
    .from(students)
    .where(eq(students.id, studentId))
    .limit(1);

  if (!row) {
    throw new Error(`Student with ID ${studentId} not found`);
  }

  if (row.qrToken && row.qrToken.trim().length > 0) {
    return row.qrToken;
  }

  const generatedToken = 'STU-QR-' + crypto.randomBytes(16).toString('hex').toUpperCase();
  await db
    .update(students)
    .set({ qrToken: generatedToken })
    .where(eq(students.id, studentId));

  return generatedToken;
}

/**
 * Fetch all available classes from the database for the class filter.
 */
export async function getClassesForAdmitCards(schoolId?: number): Promise<AdmitCardClassOption[]> {
  try {
    const conditions = [];
    if (schoolId) {
      conditions.push(eq(classes.schoolId, schoolId));
    }

    const rows = await db
      .select({
        id: classes.id,
        name: classes.name,
        section: classes.section,
      })
      .from(classes)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(classes.name, classes.section);

    return rows.map((c) => ({
      id: c.id,
      name: c.name,
      section: c.section,
      displayName: c.section ? `${c.name}-${c.section}` : c.name,
    }));
  } catch (error) {
    console.error('Error fetching classes for admit cards:', error);
    return [];
  }
}

/**
 * Fetch students list filtered by class and/or search term.
 */
export async function getStudentsForAdmitCards(options: {
  schoolId?: number;
  classId?: number;
  search?: string;
}): Promise<AdmitCardStudentRecord[]> {
  try {
    const conditions = [];

    if (options.schoolId) {
      conditions.push(eq(students.schoolId, options.schoolId));
    }

    if (options.classId) {
      conditions.push(eq(students.classId, options.classId));
    }

    if (options.search && options.search.trim()) {
      const q = `%${options.search.trim()}%`;
      conditions.push(
        or(
          like(users.name, q),
          like(users.email, q),
          like(students.rollNumber, q),
          sql`CAST(${students.id} AS CHAR) LIKE ${q}`
        )
      );
    }

    const rows = await db
      .select({
        id: students.id,
        userId: students.userId,
        studentName: users.name,
        email: users.email,
        rollNumber: students.rollNumber,
        classId: students.classId,
        className: classes.name,
        classSection: classes.section,
        gender: students.gender,
        dateOfBirth: students.dateOfBirth,
        phoneNumber: students.phoneNumber,
        profileImageUrl: users.profileImageUrl,
        qrToken: students.qrToken,
        admissionDate: students.admissionDate,
      })
      .from(students)
      .innerJoin(users, eq(students.userId, users.id))
      .innerJoin(classes, eq(students.classId, classes.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(classes.name, classes.section, students.rollNumber, users.name);

    // Ensure all returned students have persistent QR tokens
    const result: AdmitCardStudentRecord[] = [];
    for (const r of rows) {
      let finalQrToken = r.qrToken;
      if (!finalQrToken || !finalQrToken.trim()) {
        finalQrToken = await ensureStudentQrToken(r.id);
      }
      result.push({
        id: r.id,
        userId: r.userId,
        studentName: r.studentName,
        email: r.email,
        rollNumber: r.rollNumber,
        classId: r.classId,
        className: r.className,
        classSection: r.classSection,
        classDisplayName: r.classSection ? `${r.className}-${r.classSection}` : r.className,
        gender: r.gender,
        dateOfBirth: r.dateOfBirth ? String(r.dateOfBirth) : null,
        phoneNumber: r.phoneNumber,
        profileImageUrl: r.profileImageUrl,
        qrToken: finalQrToken,
        admissionDate: r.admissionDate ? String(r.admissionDate) : null,
      });
    }

    return result;
  } catch (error) {
    console.error('Error fetching students for admit cards:', error);
    return [];
  }
}

/**
 * Fetch full admit card details for an individual student.
 */
export async function getStudentAdmitCard(studentId: number): Promise<StudentAdmitCardDetails | null> {
  try {
    const [row] = await db
      .select({
        id: students.id,
        userId: students.userId,
        name: users.name,
        email: users.email,
        rollNumber: students.rollNumber,
        gender: students.gender,
        dateOfBirth: students.dateOfBirth,
        phoneNumber: students.phoneNumber,
        profileImageUrl: users.profileImageUrl,
        qrToken: students.qrToken,
        admissionDate: students.admissionDate,
        schoolId: students.schoolId,
        classId: students.classId,
        className: classes.name,
        classSection: classes.section,
        academicYear: classes.academicYear,
        schoolName: schools.name,
        schoolEmail: schools.email,
        schoolPhone: schools.phone,
        schoolAddress: schools.address,
        schoolCity: schools.city,
        schoolState: schools.state,
        schoolPincode: schools.pincode,
        schoolPrincipalName: schools.principalName,
        schoolAffiliationBoard: schools.affiliationBoard,
        schoolRegistrationNumber: schools.registrationNumber,
        schoolUdiseCode: schools.udiseCode,
        schoolLogoUrl: schools.logoUrl,
        schoolWebsite: schools.website,
      })
      .from(students)
      .innerJoin(users, eq(students.userId, users.id))
      .innerJoin(classes, eq(students.classId, classes.id))
      .leftJoin(schools, eq(students.schoolId, schools.id))
      .where(eq(students.id, studentId))
      .limit(1);

    if (!row) return null;

    let finalQrToken = row.qrToken;
    if (!finalQrToken || !finalQrToken.trim()) {
      finalQrToken = await ensureStudentQrToken(row.id);
    }

    return {
      student: {
        id: row.id,
        userId: row.userId,
        name: row.name,
        email: row.email,
        rollNumber: row.rollNumber,
        gender: row.gender,
        dateOfBirth: row.dateOfBirth ? String(row.dateOfBirth) : null,
        phoneNumber: row.phoneNumber,
        profileImageUrl: row.profileImageUrl,
        qrToken: finalQrToken,
        admissionDate: row.admissionDate ? String(row.admissionDate) : null,
      },
      classInfo: {
        id: row.classId,
        name: row.className,
        section: row.classSection,
        displayName: row.classSection ? `${row.className}-${row.classSection}` : row.className,
        academicYear: row.academicYear,
      },
      school: row.schoolId
        ? {
            id: row.schoolId,
            name: row.schoolName ?? 'EduPredict School',
            email: row.schoolEmail,
            phone: row.schoolPhone,
            address: row.schoolAddress,
            city: row.schoolCity,
            state: row.schoolState,
            pincode: row.schoolPincode,
            principalName: row.schoolPrincipalName,
            affiliationBoard: row.schoolAffiliationBoard,
            registrationNumber: row.schoolRegistrationNumber,
            udiseCode: row.schoolUdiseCode,
            logoUrl: row.schoolLogoUrl,
            website: row.schoolWebsite,
          }
        : null,
    };
  } catch (error) {
    console.error('Error fetching student admit card:', error);
    return null;
  }
}

/**
 * Verify a student's QR token and return verified database info.
 */
export async function verifyStudentQr(qrToken: string): Promise<VerifiedStudentInfo> {
  if (!qrToken || typeof qrToken !== 'string' || !qrToken.trim()) {
    return {
      isValid: false,
      message: 'Invalid or missing QR code identifier.',
    };
  }

  const cleanToken = qrToken.trim();

  try {
    const [row] = await db
      .select({
        id: students.id,
        userId: students.userId,
        name: users.name,
        email: users.email,
        rollNumber: students.rollNumber,
        gender: students.gender,
        dateOfBirth: students.dateOfBirth,
        phoneNumber: students.phoneNumber,
        profileImageUrl: users.profileImageUrl,
        className: classes.name,
        classSection: classes.section,
        schoolName: schools.name,
      })
      .from(students)
      .innerJoin(users, eq(students.userId, users.id))
      .innerJoin(classes, eq(students.classId, classes.id))
      .leftJoin(schools, eq(students.schoolId, schools.id))
      .where(eq(students.qrToken, cleanToken))
      .limit(1);

    if (!row) {
      return {
        isValid: false,
        message: 'Invalid or unrecognized student QR code.',
      };
    }

    // Optional transport info
    const [transportRow] = await db
      .select({
        busNumber: buses.registrationNumber,
        routeName: transportRoutes.routeName,
        pickupStopName: busStops.stopName,
        morningPickupTime: studentTransportAssignments.morningPickupTime,
        returnTime: studentTransportAssignments.returnTime,
      })
      .from(studentTransportAssignments)
      .innerJoin(buses, eq(studentTransportAssignments.busId, buses.id))
      .leftJoin(transportRoutes, eq(studentTransportAssignments.routeId, transportRoutes.id))
      .leftJoin(busStops, eq(studentTransportAssignments.pickupStopId, busStops.id))
      .where(and(eq(studentTransportAssignments.studentId, row.id), eq(studentTransportAssignments.isActive, true)))
      .limit(1);

    return {
      isValid: true,
      student: {
        id: row.id,
        userId: row.userId,
        name: row.name,
        email: row.email,
        rollNumber: row.rollNumber,
        gender: row.gender,
        dateOfBirth: row.dateOfBirth ? String(row.dateOfBirth) : null,
        phoneNumber: row.phoneNumber,
        profileImageUrl: row.profileImageUrl,
        classDisplayName: row.classSection ? `${row.className}-${row.classSection}` : row.className,
        schoolName: row.schoolName || 'EduPredict School',
      },
      transport: transportRow
        ? {
            busNumber: transportRow.busNumber,
            routeName: transportRow.routeName || 'Assigned Route',
            pickupStop: transportRow.pickupStopName,
            morningPickupTime: transportRow.morningPickupTime,
            returnTime: transportRow.returnTime,
          }
        : null,
    };
  } catch (error) {
    console.error('Error verifying student QR code:', error);
    return {
      isValid: false,
      message: 'Failed to verify QR code due to server error.',
    };
  }
}
