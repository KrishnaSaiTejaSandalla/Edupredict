import { requireRole } from "@/lib/auth";
import { getStudentDetails } from "@/lib/student-actions";
import { getTimetableByClass } from "@/lib/timetable-actions";

export const dynamic = "force-dynamic";

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export default async function StudentTimetablePage() {
  const user = await requireRole("student");
  const student = await getStudentDetails(user.id);

  let timetableEntries: any[] = [];
  if (student?.classId) {
    timetableEntries = await getTimetableByClass(student.classId);
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-theme pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-500 dark:text-cyan-400">
            Student Portal
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
            My Timetable
          </h1>
          <p className="mt-2 text-sm text-secondary">
            Your weekly schedule of lectures and class periods.
          </p>
        </div>

        {student && (
          <div className="text-xs font-semibold text-secondary">
            Class: <span className="text-cyan-400">{student.displayClass}</span>
          </div>
        )}
      </div>

      {/* Grid Layout grouped by day */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {DAYS_OF_WEEK.map((day) => {
          const dayEntries = timetableEntries
            .filter((e) => e.dayOfWeek === day)
            .sort((a, b) => a.startTime.localeCompare(b.startTime));

          return (
            <div
              key={day}
              className="rounded-2xl border border-theme bg-surface/50 p-5 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-theme pb-2.5">
                <h3 className="text-sm font-bold text-primary">{day}</h3>
                <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold text-cyan-400">
                  {dayEntries.length} {dayEntries.length === 1 ? "Period" : "Periods"}
                </span>
              </div>

              {dayEntries.length === 0 ? (
                <p className="text-xs text-muted py-4 text-center">No periods scheduled.</p>
              ) : (
                <div className="space-y-3">
                  {dayEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="group rounded-xl border border-theme bg-surface hover:bg-hover p-4 transition duration-150"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs font-bold text-primary group-hover:text-cyan-400 transition">
                            {entry.subjectName}
                          </p>
                          <p className="text-[11px] text-secondary mt-1">
                            Teacher: <span className="text-primary font-medium">{entry.teacherName}</span>
                          </p>
                        </div>
                        <span className="rounded bg-hover px-2 py-0.5 text-[10px] font-semibold text-cyan-400">
                          {entry.roomNumber}
                        </span>
                      </div>

                      {/* Timing */}
                      <div className="mt-4 flex items-center gap-1.5 text-[11px] font-semibold text-secondary">
                        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2.5">
                          <circle cx="12" cy="12" r="10" />
                          <path d="M12 6v6l4 2" />
                        </svg>
                        <span>
                          {entry.startTime.slice(0, 5)} - {entry.endTime.slice(0, 5)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
