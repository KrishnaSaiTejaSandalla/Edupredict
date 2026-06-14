import { requireRole } from "@/lib/auth";
import { getParentChildren } from "@/lib/parent-actions";
import { getTimetableByClass } from "@/lib/timetable-actions";
import ParentTimetableClient from "@/components/parent/ParentTimetableClient";

export const dynamic = "force-dynamic";

export default async function ParentTimetablePage() {
  const user = await requireRole("parent");
  const children = await getParentChildren(user.id);

  // Fetch timetables for all children in parallel
  const childTimetables = await Promise.all(
    children.map(async (c) => {
      const list = await getTimetableByClass(c.classId);
      return {
        studentId: c.studentId,
        list,
      };
    })
  );

  return (
    <main className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8">
      <ParentTimetableClient
        childrenList={children}
        childTimetables={childTimetables}
      />
    </main>
  );
}
