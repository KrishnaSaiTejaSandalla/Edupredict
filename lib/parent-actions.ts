"use server";

import { db } from "./db";
import { parents, studentParents, students, users, classes } from "./schema";
import { eq } from "drizzle-orm";

/**
 * Fetches all student records (children) linked to the given parent user ID.
 */
export async function getParentChildren(parentUserId: number) {
  const [parentRecord] = await db
    .select({ id: parents.id })
    .from(parents)
    .where(eq(parents.userId, parentUserId))
    .limit(1);

  if (!parentRecord) return [];

  const children = await db
    .select({
      studentId: students.id,
      rollNumber: students.rollNumber,
      gender: students.gender,
      name: users.name,
      email: users.email,
      classId: classes.id,
      className: classes.name,
      classSection: classes.section,
    })
    .from(studentParents)
    .innerJoin(students, eq(students.id, studentParents.studentId))
    .innerJoin(users, eq(users.id, students.userId))
    .innerJoin(classes, eq(classes.id, students.classId))
    .where(eq(studentParents.parentId, parentRecord.id));

  return children.map((c) => ({
    ...c,
    displayClass: c.className + (c.classSection ? ` ${c.classSection}` : ""),
  }));
}
