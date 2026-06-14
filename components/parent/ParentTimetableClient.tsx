"use client";

import { useState } from "react";

type TimetableEntry = {
  id: number;
  classId: number;
  subjectId: number;
  teacherId: number;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  roomNumber: string;
  subjectName: string;
  teacherName: string;
};

type Child = {
  studentId: number;
  rollNumber: string | null;
  name: string;
  displayClass: string;
};

type ChildTimetable = {
  studentId: number;
  list: TimetableEntry[];
};

type Props = {
  childrenList: Child[];
  childTimetables: ChildTimetable[];
};

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export default function ParentTimetableClient({ childrenList, childTimetables }: Props) {
  const [selectedChildId, setSelectedChildId] = useState<number | null>(
    childrenList[0]?.studentId || null
  );

  const selectedChild = childrenList.find((c) => c.studentId === selectedChildId);
  const selectedList =
    childTimetables.find((t) => t.studentId === selectedChildId)?.list || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-theme pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-500 dark:text-cyan-400">
            Parent Portal
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
            Student Timetables
          </h1>
          <p className="mt-2 text-sm text-secondary">
            Weekly class schedule, subject periods, and classroom bookings for your children.
          </p>
        </div>

        {/* Child Selector Tabs */}
        {childrenList.length > 1 && (
          <div className="flex flex-wrap gap-2 p-1 bg-surface border border-theme rounded-xl">
            {childrenList.map((child) => (
              <button
                key={child.studentId}
                onClick={() => setSelectedChildId(child.studentId)}
                className={`rounded-lg px-4 py-2 text-xs font-bold transition duration-200 ${
                  selectedChildId === child.studentId
                    ? "bg-cyan-500/10 text-cyan-400"
                    : "text-secondary hover:text-primary hover:bg-hover"
                }`}
              >
                {child.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {childrenList.length === 0 ? (
        <div className="rounded-2xl border border-theme bg-surface p-12 text-center text-sm font-medium text-muted">
          No children are linked to this parent account.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Selected Child Info */}
          <div className="rounded-2xl border border-theme bg-surface p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm">
            <div>
              <p className="text-xs text-muted">Viewing schedule for</p>
              <h2 className="text-sm font-bold text-primary mt-0.5">{selectedChild?.name}</h2>
            </div>
            <div className="flex gap-4 text-xs font-medium text-secondary">
              <div>
                Class: <span className="text-primary font-semibold">{selectedChild?.displayClass}</span>
              </div>
              <div>
                Roll No: <span className="text-primary font-semibold">{selectedChild?.rollNumber || "—"}</span>
              </div>
            </div>
          </div>

          {/* Daily Schedule Grid */}
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {DAYS_OF_WEEK.map((day) => {
              const dayEntries = selectedList
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
      )}
    </div>
  );
}
