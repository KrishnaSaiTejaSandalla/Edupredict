import { requireRole } from "@/lib/auth";
import { getStudentDetails } from "@/lib/student-actions";
import { getTimetableByClass } from "@/lib/timetable-actions";
import StudentTimetableClient from "@/components/student/StudentTimetableClient";

export const dynamic = "force-dynamic";

export default async function StudentTimetablePage() {
  const user = await requireRole("student");
  const student = await getStudentDetails(user.id);

  let timetableEntries: any[] = [];
  if (student?.classId) {
    timetableEntries = await getTimetableByClass(student.classId);
  }

  return (
    <StudentTimetableClient
      timetableEntries={timetableEntries}
      displayClass={student?.displayClass ?? ""}
    />
  );
}
