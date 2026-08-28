import { requireRole } from "@/lib/auth";
import { getParentTrackingSnapshot } from "@/lib/bus-tracking.service";
import { getParentChildren } from "@/lib/parent-actions";
import ParentBusTrackingClient from "@/components/parent/ParentBusTrackingClient";

export const dynamic = "force-dynamic";

export default async function ParentBusTrackingPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const user = await requireRole("parent");
  const params = await searchParams;
  const studentId = params?.studentId ? Number(params.studentId) : undefined;
  
  const [snapshot, children] = await Promise.all([
    getParentTrackingSnapshot(
      user.id,
      Number.isFinite(studentId) ? studentId : undefined,
    ),
    getParentChildren(user.id),
  ]);

  return (
    <ParentBusTrackingClient
      initialSnapshot={snapshot}
      childrenList={children}
    />
  );
}
