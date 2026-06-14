import { requireRole } from "@/lib/auth";
import { getAllTimetableEntries, getAllTeachers } from "@/lib/timetable-actions";
import { getAllClasses, getAllSubjects } from "@/lib/actions";
import TimetableClient from "@/components/admin/TimetableClient";

export const dynamic = "force-dynamic";

export default async function TimetablePage() {
  await requireRole("admin");

  const [initialEntries, classes, subjects, teachers] = await Promise.all([
    getAllTimetableEntries(),
    getAllClasses(),
    getAllSubjects(),
    getAllTeachers(),
  ]);

  return (
    <main className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8">
      <TimetableClient
        initialEntries={initialEntries}
        classes={classes}
        subjects={subjects}
        teachers={teachers}
      />
    </main>
  );
}
