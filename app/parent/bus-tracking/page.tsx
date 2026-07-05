import { requireRole } from "@/lib/auth";
import { getParentChildren } from "@/lib/parent-actions";
import { db } from "@/lib/db";
import { students, buses } from "@/lib/schema";
import { eq } from "drizzle-orm";
import ParentBusTrackingClient from "@/components/parent/ParentBusTrackingClient";

export const dynamic = "force-dynamic";

export default async function ParentBusTrackingPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const user = await requireRole("parent");
  const childrenList = await getParentChildren(user.id);

  if (childrenList.length === 0) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 text-center text-muted">
        <div className="max-w-md mx-auto rounded-2xl border border-theme bg-surface p-8 space-y-4">
          <h2 className="text-lg font-bold text-primary">No Linked Profiles</h2>
          <p className="text-xs text-secondary leading-relaxed">
            No student profiles are currently linked to your parent account. Please contact the school administration to map your children.
          </p>
        </div>
      </div>
    );
  }

  const params = await searchParams;
  const studentIdParam = params?.studentId;
  const selectedStudent = studentIdParam
    ? childrenList.find((c) => c.studentId === Number(studentIdParam)) || childrenList[0]
    : childrenList[0];

  const studentId = selectedStudent.studentId;

  // 1. Fetch active bus details
  const [busRecord] = await db
    .select({
      registrationNumber: buses.registrationNumber,
      routeName: buses.routeName,
      driverName: buses.driverName,
      driverPhone: buses.driverPhone,
      capacity: buses.capacity,
    })
    .from(buses)
    .where(eq(buses.isActive, true))
    .limit(1);

  return (
    <ParentBusTrackingClient bus={busRecord || null} />
  );
}
