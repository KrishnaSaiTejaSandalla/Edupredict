"use client";

import React, { useState, useEffect, useMemo } from "react";

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

function getSubjectColor(subjectId: number): string {
  return SUBJECT_COLORS[subjectId % SUBJECT_COLORS.length] || SUBJECT_COLORS[0];
}

function getTodayName(): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[new Date().getDay()];
}

export default function ParentTimetableClient({ childrenList, childTimetables }: Props) {
  const [selectedChildId, setSelectedChildId] = useState<number | null>(
    childrenList[0]?.studentId || null
  );

  const [currentTime, setCurrentTime] = useState("");
  const [currentDay, setCurrentDay] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<TimetableEntry | null>(null);

  useEffect(() => {
    const today = new Date();
    const dayName = today.toLocaleDateString("en-US", { weekday: "long" });
    setCurrentDay(dayName);

    const tick = () => {
      const d = new Date();
      const h = String(d.getHours()).padStart(2, "0");
      const m = String(d.getMinutes()).padStart(2, "0");
      setCurrentTime(`${h}:${m}`);
    };
    tick();
    const interval = setInterval(tick, 60000);
    return () => clearInterval(interval);
  }, []);

  const selectedChild = childrenList.find((c) => c.studentId === selectedChildId);
  const selectedList = useMemo(() => {
    return childTimetables.find((t) => t.studentId === selectedChildId)?.list || [];
  }, [childTimetables, selectedChildId]);

  const days = useMemo(() => {
    return Array.from(new Set(selectedList.map(e => e.dayOfWeek))).sort((a, b) => {
      const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
      return dayOrder.indexOf(a) - dayOrder.indexOf(b);
    });
  }, [selectedList]);

  const timeSlots = useMemo(() => {
    return Array.from(new Set(selectedList.map(e => `${e.startTime}-${e.endTime}`)))
      .sort((a, b) => a.localeCompare(b));
  }, [selectedList]);

  const totalClasses = selectedList.length;
  const studyHours = useMemo(() => {
    return selectedList.reduce((sum, e) => sum + getTimeDuration(e.startTime, e.endTime), 0);
  }, [selectedList]);

  const totalPeriods = days.length * timeSlots.length;
  const freePeriods = totalPeriods - totalClasses;

  const todaysDay = useMemo(() => getTodayName(), []);
  const todaysClasses = useMemo(() => {
    return selectedList
      .filter((e) => e.dayOfWeek === todaysDay)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [selectedList, todaysDay]);

  const isCurrentPeriod = (dayOfWeek: string, start: string, end: string) => {
    if (dayOfWeek !== currentDay) return false;
    const startStr = start.slice(0, 5);
    const endStr = end.slice(0, 5);
    return currentTime >= startStr && currentTime <= endStr;
  };

  const gridData = useMemo(() => {
    const grid = timeSlots.map((timeSlot) => ({
      timeSlot,
      time: timeSlot.split("-")[0],
      ...Object.fromEntries(days.map(d => [d, null as TimetableEntry | null])),
    }));

    selectedList.forEach((entry) => {
      const slotKey = `${entry.startTime}-${entry.endTime}`;
      const slotIndex = grid.findIndex((g) => g.timeSlot === slotKey);
      if (slotIndex !== -1 && days.includes(entry.dayOfWeek)) {
        (grid[slotIndex] as any)[entry.dayOfWeek] = entry;
      }
    });

    return grid;
  }, [selectedList, days, timeSlots]);

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

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 animate-in fade-in duration-300">
      {/* Header Row */}
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
                className={`rounded-lg px-4 py-2 text-xs font-bold transition duration-200 ${selectedChildId === child.studentId
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

        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Slots", value: totalClasses, color: "text-cyan-500 dark:text-cyan-400" },
            { label: "Study Hours", value: studyHours, color: "text-violet-500 dark:text-violet-400" },
            { label: "Free Periods", value: freePeriods >= 0 ? freePeriods : 0, color: "text-emerald-500 dark:text-emerald-400" },
            { label: "Active Days", value: days.length, color: "text-amber-500 dark:text-amber-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-2xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
              <p className={`mt-1.5 text-2xl font-black ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {selectedList.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-16 text-center shadow-sm max-w-lg mx-auto">
            <div className="mx-auto h-12 w-12 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-500">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            </div>
            <h3 className="mt-4 text-sm font-bold text-foreground">No Classes Scheduled</h3>
            <p className="mt-2 text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
              Their timetable will appear here once classes are scheduled.
            </p>
          </div>
        ) : (
          <>
            {/* Today's Schedule */}
            {todaysClasses.length > 0 && (
              <div>
                <h2 className="text-base font-bold text-primary mb-3">Today&apos;s Schedule</h2>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                  {todaysClasses.map((entry) => {
                    const active = isCurrentPeriod(entry.dayOfWeek, entry.startTime, entry.endTime);
                    const colorCls = getSubjectColor(entry.subjectId);
                    const textCls = colorCls.split(" ").filter(c => c.startsWith("text-"))[0] || "text-cyan-400";
                    return (
                      <div
                        key={entry.id}
                        onClick={() => setSelectedEntry(entry)}
                        className={`flex-shrink-0 rounded-xl border bg-card p-3 cursor-pointer transition min-w-[200px] ${colorCls} ${active ? "ring-2 ring-cyan-500 shadow-lg" : "hover:border-cyan-500"
                          }`}
                      >
                        <div className="flex justify-between items-center">
                          <p className={`text-xs font-bold ${textCls}`}>{entry.startTime.slice(0, 5)} - {entry.endTime.slice(0, 5)}</p>
                          {active && (
                            <span className="text-[9px] font-bold text-cyan-400 animate-pulse bg-cyan-500/10 px-1.5 py-0.5 rounded">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-foreground mt-1">{entry.subjectName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{entry.teacherName}</p>
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
                    <div className="p-3 text-xs font-mono text-secondary">{timeSlot.split("-").map(t => t.slice(0, 5)).join(" - ")}</div>
                    {days.map((day) => {
                      const entry = (gridData.find((g) => g.timeSlot === timeSlot) as any)?.[day] as TimetableEntry | undefined;
                      if (!entry) {
                        return (
                          <div key={day} className="p-2 min-h-[60px] flex items-center justify-center">
                            <div className="w-full h-full rounded-xl bg-secondary/10" />
                          </div>
                        );
                      }
                      const colorCls = getSubjectColor(entry.subjectId);
                      const active = isCurrentPeriod(entry.dayOfWeek, entry.startTime, entry.endTime);
                      return (
                        <div key={day} className="p-2 min-h-[60px] flex items-center justify-center">
                          <div
                            onClick={() => setSelectedEntry(entry)}
                            className={`w-full rounded-xl border p-2 cursor-pointer transition ${colorCls} ${active ? "ring-2 ring-cyan-500 shadow-md scale-[1.02]" : "hover:border-cyan-500"
                              }`}
                          >
                            <div className="flex justify-between items-center gap-1">
                              <p className={`text-xs font-bold truncate ${colorCls.split(" ").filter(c => c.startsWith("text-")).join(" ")}`}>{entry.subjectName}</p>
                              {active && <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping shrink-0" />}
                            </div>
                            <p className="text-[10px] text-foreground mt-0.5 truncate">{entry.teacherName}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Room {entry.roomNumber}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal Details Dialog */}
      {selectedEntry && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4" onClick={() => setSelectedEntry(null)}>
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-foreground">{selectedEntry.subjectName}</h3>
              <button onClick={() => setSelectedEntry(null)} className="text-muted-foreground hover:text-foreground">
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>
              </button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Teacher</span><span className="font-medium text-foreground">{selectedEntry.teacherName}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Room</span><span className="font-medium text-foreground">{selectedEntry.roomNumber}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Day</span><span className="font-medium text-foreground">{selectedEntry.dayOfWeek}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Time</span><span className="font-medium text-foreground">{selectedEntry.startTime.slice(0, 5)} - {selectedEntry.endTime.slice(0, 5)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Duration</span><span className="font-medium text-foreground">{getTimeDuration(selectedEntry.startTime, selectedEntry.endTime)} hrs</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
