"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Calculator,
  BookOpen,
  FlaskConical,
  History,
  Globe,
  Music,
  Palette,
  Dumbbell,
  BrainCircuit,
  Volume2,
  FileText,
  Clock,
  MapPin,
  User,
  Calendar,
  Layers,
  GraduationCap
} from "lucide-react";

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

type Props = {
  timetableEntries: TimetableEntry[];
  displayClass: string;
};

const SUBJECT_COLORS = [
  "bg-cyan-500/10 border-cyan-500/20 text-cyan-600 dark:text-cyan-400 dark:border-cyan-500/30 hover:bg-cyan-500/15",
  "bg-violet-500/10 border-violet-500/20 text-violet-600 dark:text-violet-400 dark:border-violet-500/30 hover:bg-violet-500/15",
  "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 dark:border-emerald-500/30 hover:bg-emerald-500/15",
  "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400 dark:border-amber-500/30 hover:bg-amber-500/15",
  "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400 dark:border-rose-500/30 hover:bg-rose-500/15",
  "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400 dark:border-blue-500/30 hover:bg-blue-500/15",
  "bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400 dark:border-orange-500/30 hover:bg-orange-500/15",
  "bg-teal-500/10 border-teal-500/20 text-teal-600 dark:text-teal-400 dark:border-teal-500/30 hover:bg-teal-500/15",
];

function getSubjectColor(subjectId: number): string {
  return SUBJECT_COLORS[subjectId % SUBJECT_COLORS.length] || SUBJECT_COLORS[0];
}

function getSubjectIcon(subjectName: string) {
  const name = subjectName.toLowerCase();
  if (name.includes("math") || name.includes("algebra") || name.includes("geometry") || name.includes("arithmetic")) {
    return Calculator;
  }
  if (name.includes("sci") || name.includes("phys") || name.includes("chem") || name.includes("bio") || name.includes("lab")) {
    return FlaskConical;
  }
  if (name.includes("eng") || name.includes("lit") || name.includes("read") || name.includes("write")) {
    return BookOpen;
  }
  if (name.includes("hist") || name.includes("civic") || name.includes("social")) {
    return History;
  }
  if (name.includes("geog") || name.includes("world") || name.includes("env")) {
    return Globe;
  }
  if (name.includes("art") || name.includes("draw") || name.includes("paint") || name.includes("craft")) {
    return Palette;
  }
  if (name.includes("mus") || name.includes("sing") || name.includes("instrument")) {
    return Music;
  }
  if (name.includes("pe") || name.includes("phys") || name.includes("sport") || name.includes("gym")) {
    return Dumbbell;
  }
  if (name.includes("comp") || name.includes("code") || name.includes("prog") || name.includes("tech") || name.includes("ai")) {
    return BrainCircuit;
  }
  if (name.includes("lang") || name.includes("french") || name.includes("spanish") || name.includes("german") || name.includes("hindi")) {
    return Volume2;
  }
  return FileText;
}

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function StudentTimetableClient({ timetableEntries, displayClass }: Props) {
  const [currentTime, setCurrentTime] = useState("");
  const [currentDay, setCurrentDay] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<TimetableEntry | null>(null);

  // Week range tracking states
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Monday
    return new Date(today.setDate(diff));
  });

  const currentWeekEnd = useMemo(() => {
    const end = new Date(currentWeekStart);
    end.setDate(currentWeekStart.getDate() + 5); // Saturday
    return end;
  }, [currentWeekStart]);

  const formatWeekRange = () => {
    const optionsStart: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    const optionsEnd: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
    return `${currentWeekStart.toLocaleDateString("en-US", optionsStart)} - ${currentWeekEnd.toLocaleDateString("en-US", optionsEnd)}`;
  };

  const handlePrevWeek = () => {
    setCurrentWeekStart((prev) => {
      const next = new Date(prev);
      next.setDate(prev.getDate() - 7);
      return next;
    });
  };

  const handleNextWeek = () => {
    setCurrentWeekStart((prev) => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + 7);
      return next;
    });
  };

  const handleTodayWeek = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    setCurrentWeekStart(new Date(today.setDate(diff)));
  };

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

  const isCurrentPeriod = (dayOfWeek: string, start: string, end: string) => {
    if (dayOfWeek !== currentDay) return false;
    const startStr = start.slice(0, 5);
    const endStr = end.slice(0, 5);
    return currentTime >= startStr && currentTime <= endStr;
  };

  const totalPeriods = timetableEntries.length;
  const studyHours = useMemo(() => {
    return timetableEntries.reduce((sum, e) => {
      const sHour = Number(e.startTime.split(":")[0]);
      const eHour = Number(e.endTime.split(":")[0]);
      return sum + Math.max(1, eHour - sHour);
    }, 0);
  }, [timetableEntries]);

  const activeDaysCount = useMemo(() => {
    return new Set(timetableEntries.map((e) => e.dayOfWeek)).size;
  }, [timetableEntries]);

  // Today's Scheduled classes
  const todaysClasses = useMemo(() => {
    return timetableEntries
      .filter((e) => e.dayOfWeek === currentDay)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [timetableEntries, currentDay]);

  const currentActivePeriod = useMemo(() => {
    return timetableEntries.find((e) => isCurrentPeriod(e.dayOfWeek, e.startTime, e.endTime));
  }, [timetableEntries, currentDay, currentTime]);

  // Dynamically extract all unique sorted time slots (e.g. "09:30 - 10:30", etc.)
  const timeSlots = useMemo(() => {
    const slots = new Set<string>();
    // Guarantee our default periods exist as placeholders even if empty
    slots.add("09:30 - 10:30");
    slots.add("10:30 - 11:30");
    slots.add("11:30 - 12:30");
    
    timetableEntries.forEach((entry) => {
      const start = entry.startTime.slice(0, 5);
      const end = entry.endTime.slice(0, 5);
      slots.add(`${start} - ${end}`);
    });
    
    return Array.from(slots).sort((a, b) => a.localeCompare(b));
  }, [timetableEntries]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 animate-in fade-in duration-300">
      {/* Header section */}
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

        {displayClass && (
          <div className="inline-flex items-center gap-2 rounded-full border border-theme bg-surface px-4 py-2 text-xs font-bold text-primary">
            <GraduationCap className="h-4 w-4 text-cyan-500" />
            Class: <span className="text-cyan-500 dark:text-cyan-400">{displayClass}</span>
          </div>
        )}
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Weekly Classes", value: totalPeriods, color: "text-cyan-500 dark:text-cyan-400", bg: "bg-cyan-500/5 border-cyan-500/10" },
          { label: "Study Hours", value: `${studyHours} hrs`, color: "text-violet-500 dark:text-violet-400", bg: "bg-violet-500/5 border-violet-500/10" },
          { label: "Active Days", value: `${activeDaysCount} / 5`, color: "text-emerald-500 dark:text-emerald-400", bg: "bg-emerald-500/5 border-emerald-500/10" },
          { label: "Active Now", value: currentActivePeriod ? currentActivePeriod.subjectName : "None", color: currentActivePeriod ? "text-amber-500" : "text-secondary", bg: currentActivePeriod ? "bg-amber-500/5 border-amber-500/10" : "bg-muted/10 border-border" },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`rounded-2xl border p-4 shadow-sm hover:shadow-md transition ${bg}`}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className={`mt-2 text-xl font-black truncate ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Today's Schedule horizontal strip */}
      {todaysClasses.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-primary">Today's Schedule</h2>
          <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide">
            {todaysClasses.map((entry) => {
              const active = isCurrentPeriod(entry.dayOfWeek, entry.startTime, entry.endTime);
              const colorCls = getSubjectColor(entry.subjectId);
              const Icon = getSubjectIcon(entry.subjectName);
              return (
                <div
                  key={entry.id}
                  onClick={() => setSelectedEntry(entry)}
                  className={`flex-shrink-0 rounded-2xl border bg-card p-4 cursor-pointer transition min-w-[220px] relative overflow-hidden group ${colorCls} ${
                    active ? "ring-2 ring-cyan-500 shadow-lg scale-[1.02]" : "hover:border-cyan-500/50"
                  }`}
                >
                  <Icon className="absolute w-24 h-24 -right-4 -bottom-4 opacity-5 pointer-events-none group-hover:scale-110 transition duration-300" />
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono font-bold tracking-tight">
                      {entry.startTime.slice(0, 5)} - {entry.endTime.slice(0, 5)}
                    </span>
                    {active && (
                      <span className="text-[8px] font-black text-cyan-400 bg-cyan-500/15 px-2 py-0.5 rounded animate-pulse">
                        LIVE
                      </span>
                    )}
                  </div>
                  <h4 className="mt-3 font-bold text-foreground text-sm truncate">{entry.subjectName}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{entry.teacherName}</p>
                  <div className="mt-3 flex items-center gap-1 text-[10px] font-medium">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    <span>Room {entry.roomNumber}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Weekly Schedule Layout (Grid View) */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-theme pb-4">
          <div>
            <h2 className="text-xl font-bold text-primary">Weekly Timetable</h2>
            <p className="text-xs text-muted-foreground mt-1 font-semibold">
              Week: <span className="text-cyan-500 dark:text-cyan-400">{formatWeekRange()}</span>
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-3xl border border-border bg-card shadow-md">
          <table className="w-full border-collapse text-left min-w-[800px]">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground w-36 border-r border-border/50 text-center">TIME</th>
                {DAYS_OF_WEEK.map((day) => (
                  <th key={day} className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-center min-w-[150px] border-r border-border/50 last:border-r-0">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {timeSlots.map((slot) => (
                <tr key={slot} className="hover:bg-muted/5 transition duration-150">
                  {/* Time cell */}
                  <td className="p-4 font-mono text-xs font-bold text-center text-secondary border-r border-border/50 bg-muted/5">
                    {slot}
                  </td>
                  {/* Day cells */}
                  {DAYS_OF_WEEK.map((day) => {
                    const entry = timetableEntries.find(
                      (e) =>
                        e.dayOfWeek === day &&
                        `${e.startTime.slice(0, 5)} - ${e.endTime.slice(0, 5)}` === slot
                    );
                    
                    const active = entry ? isCurrentPeriod(entry.dayOfWeek, entry.startTime, entry.endTime) : false;
                    const colorCls = entry ? getSubjectColor(entry.subjectId) : "";
                    const Icon = entry ? getSubjectIcon(entry.subjectName) : null;

                    return (
                      <td key={day} className="p-3 border-r border-border/50 last:border-r-0">
                        {entry ? (
                          <div
                            onClick={() => setSelectedEntry(entry)}
                            className={`group rounded-2xl border p-4 cursor-pointer relative overflow-hidden transition-all duration-300 ${colorCls} ${
                              active ? "ring-2 ring-cyan-500 shadow-md scale-[1.02]" : "hover:border-cyan-500/50"
                            }`}
                          >
                            {Icon && <Icon className="absolute w-20 h-20 -right-4 -bottom-4 opacity-5 pointer-events-none group-hover:scale-110 transition duration-300" />}
                            <div className="flex justify-between items-start gap-2">
                              <span className="text-[9px] font-mono font-bold tracking-tight opacity-75">
                                {entry.startTime.slice(0, 5)} - {entry.endTime.slice(0, 5)}
                              </span>
                              {active && <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />}
                            </div>
                            <h4 className="mt-2 font-bold text-foreground text-xs truncate">{entry.subjectName}</h4>
                            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{entry.teacherName}</p>
                            <div className="mt-2.5 flex items-center justify-between text-[9px] font-semibold text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <MapPin className="h-2.5 w-2.5" />
                                Room {entry.roomNumber}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-6 text-center opacity-45 bg-muted/5 rounded-2xl border border-dashed border-border/40">
                            <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">No Class</span>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Details Dialog */}
      {selectedEntry && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
          onClick={() => setSelectedEntry(null)}
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-xl relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Decortive absolute icon */}
            {(() => {
              const ModalIcon = getSubjectIcon(selectedEntry.subjectName);
              return (
                <ModalIcon className="absolute w-40 h-40 -right-6 -bottom-6 opacity-5 pointer-events-none text-cyan-500" />
              );
            })()}

            <div className="flex justify-between items-start mb-5">
              <div>
                <span className="text-[9px] font-bold uppercase tracking-widest text-cyan-500 dark:text-cyan-400">Class Period Info</span>
                <h3 className="text-lg font-black text-foreground mt-0.5">{selectedEntry.subjectName}</h3>
              </div>
              <button
                onClick={() => setSelectedEntry(null)}
                className="text-muted-foreground hover:text-foreground p-1 hover:bg-hover rounded-lg transition"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between border-b border-subtle pb-2.5">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" /> Instructor
                </span>
                <span className="font-semibold text-foreground">{selectedEntry.teacherName}</span>
              </div>
              <div className="flex justify-between border-b border-subtle pb-2.5">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" /> Room Number
                </span>
                <span className="font-semibold text-foreground">Room {selectedEntry.roomNumber}</span>
              </div>
              <div className="flex justify-between border-b border-subtle pb-2.5">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" /> Day
                </span>
                <span className="font-semibold text-foreground">{selectedEntry.dayOfWeek}</span>
              </div>
              <div className="flex justify-between border-b border-subtle pb-2.5">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> Class Timing
                </span>
                <span className="font-semibold text-foreground">
                  {selectedEntry.startTime.slice(0, 5)} - {selectedEntry.endTime.slice(0, 5)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
