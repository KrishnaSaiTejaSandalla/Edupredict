"use server";

import { db } from "./db";
import { students, classes } from "./schema";
import { eq } from "drizzle-orm";

/**
 * Fetches the student profile information (including class and section) for a given user ID.
 */
export async function getStudentDetails(userId: number) {
  const [row] = await db
    .select({
      studentId: students.id,
      rollNumber: students.rollNumber,
      gender: students.gender,
      classId: students.classId,
      className: classes.name,
      classSection: classes.section,
    })
    .from(students)
    .leftJoin(classes, eq(classes.id, students.classId))
    .where(eq(students.userId, userId))
    .limit(1);

  if (!row) return null;

  return {
    ...row,
    displayClass: row.className + (row.classSection ? ` ${row.classSection}` : ""),
  };
}
