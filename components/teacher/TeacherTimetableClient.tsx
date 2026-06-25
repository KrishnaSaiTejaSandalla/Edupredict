"use client";

import React, { useState, useMemo } from "react";

type TimetableEntry = {
  id: number;
  subjectId: number;
  classId: number;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  roomNumber: string;
  className: string;
  subjectName: string;
  teacherRole: "class_teacher" | "subject_teacher" | null;
};

type Props = {
  entries: TimetableEntry[];
};

// Distinct subject colors for visual differentiation (matching admin)
const SUBJECT_COLORS = [
  "bg-cyan-500/10 border-cyan-500/25 text-cyan-600 dark:text-cyan-400",
  "bg-violet-500/10 border-violet-500/25 text-violet-600 dark:text-violet-400",
  "bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400",
  "bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-400",
  "bg-rose-500/10 border-rose-500/25 text-rose-600 dark:text-rose-400",
  "bg-blue-500/10 border-blue-500/25 text-blue-600 dark:text-blue-400",
  "bg-orange-500/10 border-orange-500/25 text-orange-600 dark:text-orange-400",
  "bg-teal-500/10 border-teal-500/25 text-teal-600 dark:text-teal-400",
];

function getTimeDuration(start: string, end: string): number {
  const s = Number(start.split(":")[0]);
  const e = Number(end.split(":")[0]);
  return e - s;
}

function getSubjectColor(subjectId: number, subjectName: string): string {
  return SUBJECT_COLORS[subjectId % SUBJECT_COLORS.length] || SUBJECT_COLORS[0];
}

function getTodayName(): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[new Date().getDay()];
}

export default function TeacherTimetableClient({ entries }: Props) {
  const [selectedEntry, setSelectedEntry] = useState<TimetableEntry | null>(null);

  const MONTH_YEAR = useMemo(() => new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }), []);

  const days = useMemo(() => {
    return Array.from(new Set(entries.map(e => e.dayOfWeek))).sort((a, b) => {
      const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
      return dayOrder.indexOf(a) - dayOrder.indexOf(b);
    });
  }, [entries]);

  const timeSlots = useMemo(() => {
    return Array.from(new Set(entries.map(e => `${e.startTime}-${e.endTime}`)))
      .sort((a, b) => a.localeCompare(b));
  }, [entries]);

  const totalClasses = entries.length;
  const teachingHours = useMemo(() => {
    return entries.reduce((sum, e) => sum + getTimeDuration(e.startTime, e.endTime), 0);
  }, [entries]);

  const gridData = useMemo(() => {
    const grid = timeSlots.map((timeSlot) => ({
      timeSlot,
      time: timeSlot.split("-")[0],
      ...Object.fromEntries(days.map(d => [d, null as TimetableEntry | null])),
    }));

    entries.forEach((entry) => {
      const slotKey = `${entry.startTime}-${entry.endTime}`;
      const slotIndex = grid.findIndex((g) => g.timeSlot === slotKey);
      if (slotIndex !== -1 && days.includes(entry.dayOfWeek)) {
        (grid[slotIndex] as any)[entry.dayOfWeek] = entry;
      }
    });

    return grid;
  }, [entries, days, timeSlots]);

  const totalPeriods = days.length * timeSlots.length;
  const freePeriods = totalPeriods - totalClasses;

  const todaysDay = useMemo(() => getTodayName(), []);
  const todaysClasses = entries.filter((e) => e.dayOfWeek === todaysDay).sort((a, b) => a.startTime.localeCompare(b.startTime));

  const upcomingClasses = useMemo(() => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentTime = `${currentHour.toString().padStart(2, "0")}:00`;
    
    return entries
      .filter((e) => {
        if (e.startTime >= currentTime && days.includes(e.dayOfWeek)) return true;
        return false;
      })
      .sort((a, b) => {
        const dayDiff = days.indexOf(a.dayOfWeek) - days.indexOf(b.dayOfWeek);
        if (dayDiff !== 0) return dayDiff;
        return a.startTime.localeCompare(b.startTime);
      })
      .slice(0, 3);
  }, [entries, days, todaysDay]);

  if (entries.length === 0) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-500 dark:text-cyan-400">
            Faculty Portal
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Schedule
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Weekly timetable — {MONTH_YEAR}
          </p>
        </div>

        {/* Empty State - Admin style */}
        <div className="rounded-2xl border border-dashed border-border bg-card p-16 text-center shadow-sm max-w-lg mx-auto">
          <div className="mx-auto h-12 w-12 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-500">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
          </div>
          <h3 className="mt-4 text-sm font-bold text-foreground">No Classes Scheduled</h3>
          <p className="mt-2 text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
            Your timetable will appear here once classes are assigned to your schedule.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Header Row - Admin style */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-500 dark:text-cyan-400">
            Faculty Portal
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Schedule
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Weekly timetable — {MONTH_YEAR}
          </p>
        </div>
      </div>

      {/* KPI Strip - Admin style */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Slots", value: totalClasses, color: "text-cyan-500 dark:text-cyan-400" },
          { label: "Teaching Hours", value: teachingHours, color: "text-violet-500 dark:text-violet-400" },
          { label: "Free Periods", value: freePeriods, color: "text-emerald-500 dark:text-emerald-400" },
          { label: "Active Days", value: days.length, color: "text-amber-500 dark:text-amber-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className={`mt-1.5 text-2xl font-black ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Today's Schedule */}
      {todaysClasses.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">Today&apos;s Schedule</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {todaysClasses.map((entry) => {
              const colorCls = getSubjectColor(entry.subjectId, entry.subjectName);
              const textCls = colorCls.split(" ").filter(c => c.startsWith("text-"))[0] || "text-cyan-400";
              return (
                <div
                  key={entry.id}
                  onClick={() => setSelectedEntry(entry)}
                  className={`flex-shrink-0 rounded-xl border bg-card p-3 cursor-pointer transition min-w-[200px] ${colorCls} hover:border-accent`}
                >
                  <p className={`text-xs font-bold ${textCls}`}>{entry.startTime} - {entry.endTime}</p>
                  <p className="text-sm font-semibold text-foreground mt-1">{entry.subjectName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{entry.className}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Grid Timetable */}
      <div className="rounded-3xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto" style={{ minWidth: "800px" }}>
          <div className={`grid border-b border-border bg-hover/30`} style={{ gridTemplateColumns: `repeat(${days.length + 1}, minmax(0, 1fr))` }}>
            <div className="p-3 text-xs font-semibold text-muted-foreground uppercase">Time</div>
            {days.map((day) => (
              <div key={day} className="p-3 text-xs font-semibold text-muted-foreground uppercase text-center">{day}</div>
            ))}
          </div>
          {timeSlots.map((timeSlot, idx) => (
            <div key={timeSlot} className={`grid border-b border-border/50 last:border-0 ${idx % 2 ? "bg-hover/10" : ""}`} style={{ gridTemplateColumns: `repeat(${days.length + 1}, minmax(0, 1fr))` }}>
              <div className="p-3 text-xs font-mono text-secondary">{timeSlot}</div>
              {days.map((day) => {
                const entry = (gridData.find((g) => g.timeSlot === timeSlot) as any)?.[day] as TimetableEntry | undefined;
                if (!entry) {
                  return (
                    <div key={day} className="p-2 min-h-[60px] flex items-center justify-center">
                      <div className="w-full h-full rounded-xl bg-secondary/20" />
                    </div>
                  );
                }
                const colorCls = getSubjectColor(entry.subjectId, entry.subjectName);
                return (
                  <div key={day} className="p-2 min-h-[60px] flex items-center justify-center">
                    <div
                      onClick={() => setSelectedEntry(entry)}
                      className={`w-full rounded-xl border p-2 cursor-pointer transition ${colorCls} hover:border-accent`}
                    >
                      <p className={`text-xs font-bold truncate ${colorCls.split(" ").filter(c => c.startsWith("text-")).join(" ")}`}>{entry.subjectName}</p>
                      <p className="text-[10px] text-foreground mt-0.5 truncate">{entry.className}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Room {entry.roomNumber}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming Classes */}
      {upcomingClasses.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">Upcoming Classes</h2>
          <div className="space-y-2">
            {upcomingClasses.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
                <span className="text-xs font-medium text-foreground">
                  {entry.startTime} {entry.subjectName} - {entry.className}
                </span>
                <span className="text-xs text-muted-foreground">{entry.roomNumber}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onClick={() => setSelectedEntry(null)}>
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-foreground">{selectedEntry.subjectName}</h3>
              <button onClick={() => setSelectedEntry(null)} className="text-muted-foreground hover:text-foreground">
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
              </button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Class</span><span className="font-medium text-foreground">{selectedEntry.className}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Room</span><span className="font-medium text-foreground">{selectedEntry.roomNumber}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Day</span><span className="font-medium text-foreground">{selectedEntry.dayOfWeek}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Time</span><span className="font-medium text-foreground">{selectedEntry.startTime} - {selectedEntry.endTime}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Duration</span><span className="font-medium text-foreground">{getTimeDuration(selectedEntry.startTime, selectedEntry.endTime)} hrs</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}