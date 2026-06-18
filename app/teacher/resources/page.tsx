import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { teachers } from "@/lib/schema";
import { eq } from "drizzle-orm";
import ResourcesClient from "@/components/teacher/ResourcesClient";

export const dynamic = "force-dynamic";

export default async function TeacherResourcesPage() {
  const user = await requireRole("teacher");

  const [teacher] = await db
    .select({ id: teachers.id, department: teachers.department })
    .from(teachers)
    .where(eq(teachers.userId, user.id))
    .limit(1);

  return (
    <ResourcesClient
      teacherId={teacher?.id ?? null}
      department={teacher?.department ?? null}
    />
  );
}
