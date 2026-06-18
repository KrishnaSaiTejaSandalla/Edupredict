"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import DeleteConfirmModal from "@/components/ui/DeleteConfirmModal";
import {
  createTimetableEntry,
  updateTimetableEntry,
  deleteTimetableEntry,
} from "@/lib/timetable-actions";

type TimetableEntry = {
  id: number;
  classId: number;
  subjectId: number;
  teacherId: number;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  roomNumber: string;
  className: string;
  subjectName: string;
  teacherName: string;
};

type ClassRow = { id: number; name: string; section: string | null };
type SubjectRow = { id: number; name: string; code: string | null };
type TeacherRow = { id: number; name: string; employeeId: string | null };

type Props = {
  initialEntries: TimetableEntry[];
  classes: ClassRow[];
  subjects: SubjectRow[];
  teachers: TeacherRow[];
};

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_ABBR: Record<string, string> = {
  Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed",
  Thursday: "Thu", Friday: "Fri", Saturday: "Sat",
};

// Distinct subject colors for visual differentiation
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

const inputCls = "input-theme";
const labelCls = "block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5";
const selectCls = "select-theme";

export default function TimetableClient({ initialEntries, classes, subjects, teachers }: Props) {
  const [entries, setEntries] = useState<TimetableEntry[]>(initialEntries);
  const [activeView, setActiveView] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClassFilter, setSelectedClassFilter] = useState("");
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState("all");

  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    classId: "", subjectId: "", teacherId: "",
    dayOfWeek: "Monday", startTime: "", endTime: "", roomNumber: "",
  });

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<{ id: number; detail: string } | null>(null);
  const [filteredTeachers, setFilteredTeachers] = useState<TeacherRow[]>(teachers);
  const [isLoadingTeachers, setIsLoadingTeachers] = useState(false);

  // Subject → color map (stable across renders)
  const subjectColorMap = (() => {
    const map: Record<number, string> = {};
    subjects.forEach((s, i) => { map[s.id] = SUBJECT_COLORS[i % SUBJECT_COLORS.length]; });
    return map;
  })();

  const handleSubjectChange = async (subjectId: string) => {
    setFormData((prev) => ({ ...prev, subjectId, teacherId: "" }));
    if (!subjectId) { setFilteredTeachers(teachers); return; }
    setIsLoadingTeachers(true);
    try {
      const res = await fetch(`/api/timetable/teachers?subjectId=${subjectId}`);
      setFilteredTeachers(res.ok ? await res.json() : teachers);
    } catch { setFilteredTeachers(teachers); }
    finally { setIsLoadingTeachers(false); }
  };

  const reloadData = async () => {
    try {
      const res = await fetch("/api/timetable");
      if (res.ok) setEntries(await res.json());
    } catch (err) { console.error("Failed to refresh data:", err); }
  };

  const closeForm = () => {
    setShowForm(false); setEditingId(null); setFilteredTeachers(teachers);
    setFormData({ classId: "", subjectId: "", teacherId: "", dayOfWeek: "Monday", startTime: "", endTime: "", roomNumber: "" });
  };

  const openCreate = () => {
    setEditingId(null); setFilteredTeachers(teachers);
    setFormData({ classId: selectedClassFilter, subjectId: "", teacherId: "", dayOfWeek: "Monday", startTime: "", endTime: "", roomNumber: "" });
    setShowForm(true);
  };

  const openEdit = async (entry: TimetableEntry) => {
    setEditingId(entry.id);
    setFormData({
      classId: entry.classId.toString(), subjectId: entry.subjectId.toString(),
      teacherId: entry.teacherId.toString(), dayOfWeek: entry.dayOfWeek,
      startTime: entry.startTime.slice(0, 5), endTime: entry.endTime.slice(0, 5),
      roomNumber: entry.roomNumber,
    });
    setShowForm(true);
    try {
      const res = await fetch(`/api/timetable/teachers?subjectId=${entry.subjectId}`);
      setFilteredTeachers(res.ok ? await res.json() : teachers);
    } catch { setFilteredTeachers(teachers); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.classId || !formData.subjectId || !formData.teacherId || !formData.startTime || !formData.endTime || !formData.roomNumber) {
      toast.error("Please fill in all required fields."); return;
    }
    startTransition(async () => {
      try {
        const payload = {
          classId: Number(formData.classId), subjectId: Number(formData.subjectId),
          teacherId: Number(formData.teacherId), dayOfWeek: formData.dayOfWeek,
          startTime: formData.startTime + ":00", endTime: formData.endTime + ":00",
          roomNumber: formData.roomNumber,
        };
        if (editingId) {
          await updateTimetableEntry(editingId, payload);
          toast.success("Timetable entry updated successfully.");
        } else {
          await createTimetableEntry(payload);
          toast.success("Timetable entry created successfully.");
        }
        closeForm(); await reloadData();
      } catch (err: any) { toast.error(err.message || "An error occurred."); }
    });
  };

  const handleDeleteClick = (entry: TimetableEntry) => {
    setEntryToDelete({ id: entry.id, detail: `${entry.className} — ${entry.subjectName} (${entry.dayOfWeek} ${entry.startTime.slice(0, 5)}–${entry.endTime.slice(0, 5)})` });
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!entryToDelete) return;
    setDeleteModalOpen(false);
    startTransition(async () => {
      try {
        await deleteTimetableEntry(entryToDelete.id);
        toast.success("Timetable entry deleted.");
        await reloadData();
      } catch (err: any) { toast.error(err.message || "Failed to delete entry."); }
      finally { setEntryToDelete(null); }
    });
  };

  const filteredEntries = entries.filter((entry) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || entry.className.toLowerCase().includes(q) ||
      entry.subjectName.toLowerCase().includes(q) || entry.teacherName.toLowerCase().includes(q) ||
      entry.roomNumber.toLowerCase().includes(q);
    const matchesClass = !selectedClassFilter || entry.classId.toString() === selectedClassFilter;
    const matchesTeacher = selectedTeacherFilter === "all" || entry.teacherId.toString() === selectedTeacherFilter;
    return matchesSearch && matchesClass && matchesTeacher;
  });

  // KPI calculations
  const totalSlots = filteredEntries.length;
  const activeDays = new Set(filteredEntries.map(e => e.dayOfWeek)).size;
  const uniqueTeachers = new Set(filteredEntries.map(e => e.teacherId)).size;
  const uniqueSubjects = new Set(filteredEntries.map(e => e.subjectId)).size;

  // Time-slotted grid: unique slots sorted chronologically, lookup by slot→day→entry
  const timeSlots = Array.from(
    new Set(filteredEntries.map(e => `${e.startTime.slice(0, 5)}-${e.endTime.slice(0, 5)}`))
  ).sort();

  const slotDayMap = new Map<string, Map<string, TimetableEntry>>();
  for (const entry of filteredEntries) {
    const slot = `${entry.startTime.slice(0, 5)}-${entry.endTime.slice(0, 5)}`;
    if (!slotDayMap.has(slot)) slotDayMap.set(slot, new Map());
    slotDayMap.get(slot)!.set(entry.dayOfWeek, entry);
  }

  return (
    <div className="space-y-8">
      {/* Header Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-500 dark:text-cyan-400">Operations</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Timetables</h1>
          <p className="mt-2 text-sm text-muted-foreground">Manage weekly schedules, resolve timing conflicts, and book classrooms.</p>
        </div>
        <button
          onClick={() => (showForm && !editingId ? closeForm() : openCreate())}
          className="rounded-xl btn-blue px-5 py-3 text-xs font-bold whitespace-nowrap self-start sm:self-auto"
        >
          {showForm && !editingId ? "✕ Close Scheduler" : "+ Create Entry"}
        </button>
      </div>

      {/* Editor Panel */}
      {showForm && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-md animate-in fade-in slide-in-from-bottom-2 duration-300">
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground mb-6 flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-cyan-500"></span>
            {editingId ? "Modify Timetable Entry" : "Create New Timetable Entry"}
          </h2>
          <form onSubmit={handleSubmit} className="grid gap-5 md:grid-cols-3">
            <div>
              <label className={labelCls}>Class *</label>
              <select value={formData.classId} onChange={(e) => setFormData({ ...formData, classId: e.target.value })} className={selectCls} required>
                <option value="">Select Class</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>{cls.name} {cls.section ? `(${cls.section})` : ""}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelCls}>Subject *</label>
              <select value={formData.subjectId} onChange={(e) => handleSubjectChange(e.target.value)} className={selectCls} required>
                <option value="">Select Subject</option>
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>{sub.name} ({sub.code})</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelCls}>Teacher *</label>
              <select value={formData.teacherId} onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })} className={selectCls} required disabled={isLoadingTeachers}>
                <option value="">{isLoadingTeachers ? "Loading..." : filteredTeachers.length === 0 ? "No teachers for subject" : "Select Teacher"}</option>
                {filteredTeachers.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} ({t.employeeId})</option>
                ))}
              </select>
              {!isLoadingTeachers && formData.subjectId && filteredTeachers.length === 0 && (
                <p className="mt-1 text-xs text-amber-500">No teachers assigned to this subject.</p>
              )}
            </div>

            <div>
              <label className={labelCls}>Day of Week *</label>
              <select value={formData.dayOfWeek} onChange={(e) => setFormData({ ...formData, dayOfWeek: e.target.value })} className={selectCls} required>
                {DAYS_OF_WEEK.map((day) => <option key={day} value={day}>{day}</option>)}
              </select>
            </div>

            <div>
              <label className={labelCls}>Start Time *</label>
              <input type="time" value={formData.startTime} onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} className={inputCls} required />
            </div>

            <div>
              <label className={labelCls}>End Time *</label>
              <input type="time" value={formData.endTime} onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} className={inputCls} required />
            </div>

            <div>
              <label className={labelCls}>Room Number *</label>
              <input type="text" value={formData.roomNumber} onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })} className={inputCls} placeholder="e.g. Room 104" required />
            </div>

            <div className="md:col-span-3 flex gap-3 mt-2">
              <button type="submit" disabled={isPending} className="rounded-xl btn-emerald px-5 py-2.5 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed">
                {isPending ? "Saving..." : editingId ? "Update Entry" : "Save Entry"}
              </button>
              <button type="button" onClick={closeForm} className="rounded-xl border border-border bg-card px-5 py-2.5 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-hover transition duration-200">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters + View Switcher */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border pb-5">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search */}
          <div className="relative w-full sm:w-60">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.602 10.602Z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search schedule..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-xs text-foreground outline-none focus:border-cyan-500 placeholder:text-muted-foreground/50 transition-all"
            />
          </div>

          <select
            value={selectedClassFilter}
            onChange={(e) => { setSelectedClassFilter(e.target.value); setFormData((p) => ({ ...p, classId: e.target.value })); }}
            className="h-10 rounded-xl border border-border bg-card px-3 text-xs text-foreground outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="">All Classes</option>
            {classes.map((cls) => <option key={cls.id} value={cls.id.toString()}>{cls.name} {cls.section ? `(${cls.section})` : ""}</option>)}
          </select>

          <select
            value={selectedTeacherFilter}
            onChange={(e) => setSelectedTeacherFilter(e.target.value)}
            className="h-10 rounded-xl border border-border bg-card px-3 text-xs text-foreground outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="all">All Teachers</option>
            {teachers.map((t) => <option key={t.id} value={t.id.toString()}>{t.name}</option>)}
          </select>
        </div>

        {/* View Switcher */}
        <div className="flex rounded-xl bg-card border border-border p-1 self-start md:self-auto shrink-0">
          {(["grid", "list"] as const).map((view) => (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              className={`rounded-lg px-4 py-1.5 text-xs font-bold transition ${
                activeView === view ? "bg-cyan-500/10 text-cyan-500 dark:text-cyan-400" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {view === "grid" ? "Weekly Grid" : "All Entries"}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Strip */}
      {selectedClassFilter && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Slots", value: totalSlots, color: "text-cyan-500 dark:text-cyan-400" },
            { label: "Active Days", value: activeDays, color: "text-violet-500 dark:text-violet-400" },
            { label: "Subjects", value: uniqueSubjects, color: "text-emerald-500 dark:text-emerald-400" },
            { label: "Teachers", value: uniqueTeachers, color: "text-amber-500 dark:text-amber-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-2xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
              <p className={`mt-1.5 text-2xl font-black ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {!selectedClassFilter ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 p-16 text-center shadow-sm max-w-lg mx-auto">
          <div className="mx-auto h-12 w-12 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-500">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
          </div>
          <h3 className="mt-4 text-sm font-bold text-foreground">No Class Selected</h3>
          <p className="mt-2 text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
            Select a class from the filter above to view and manage its weekly timetable schedule.
          </p>
        </div>
      ) : (
        <>
          {/* ─── WEEKLY GRID VIEW (time-slotted) ─── */}
          {activeView === "grid" && (
            <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
              {filteredEntries.length === 0 ? (
                <div className="p-16 text-center">
                  <p className="text-sm font-medium text-muted-foreground">No entries match the current filters.</p>
                </div>
              ) : (
                <table className="w-full border-collapse" style={{ minWidth: "700px" }}>
                  <thead>
                    <tr className="border-b border-border bg-background/50">
                      <th className="w-[104px] p-3 border-r border-border text-left align-bottom shrink-0">
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Time</p>
                      </th>
                      {DAYS_OF_WEEK.map((day) => {
                        const dayCount = filteredEntries.filter(e => e.dayOfWeek === day).length;
                        return (
                          <th key={day} className="p-3 border-r last:border-r-0 border-border text-center min-w-[130px]">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{DAY_ABBR[day]}</p>
                            <p className="text-xs font-bold text-foreground mt-0.5">{day}</p>
                            <span className="mt-1.5 inline-flex items-center rounded-full bg-cyan-500/10 px-2 py-0.5 text-[9px] font-bold text-cyan-500 dark:text-cyan-400">
                              {dayCount} slot{dayCount !== 1 ? "s" : ""}
                            </span>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {timeSlots.map((slot) => {
                      const [slotStart, slotEnd] = slot.split("-");
                      return (
                        <tr key={slot} className="group/row hover:bg-hover/40 transition-colors duration-150">
                          {/* Time label cell */}
                          <td className="p-3 border-r border-border bg-background/30 align-middle w-[104px] shrink-0">
                            <p className="text-[11px] font-bold text-foreground tabular-nums">{slotStart}</p>
                            <p className="text-[9px] text-muted-foreground tabular-nums leading-relaxed">→ {slotEnd}</p>
                          </td>
                          {/* Day cells */}
                          {DAYS_OF_WEEK.map((day) => {
                            const entry = slotDayMap.get(slot)?.get(day);
                            const colorCls = entry ? (subjectColorMap[entry.subjectId] || SUBJECT_COLORS[0]) : "";
                            return (
                              <td key={day} className="p-2 border-r last:border-r-0 border-border align-top">
                                {entry ? (
                                  <div className={`group rounded-xl border p-2.5 cursor-pointer transition hover:shadow-md ${colorCls}`}>
                                    <p className="text-[10px] font-black truncate">{entry.subjectName}</p>
                                    <p className="text-[9px] font-semibold opacity-70 mt-0.5 truncate">{entry.teacherName}</p>
                                    <span className="mt-1.5 inline-block text-[9px] font-bold opacity-60 bg-white/10 rounded px-1.5 py-0.5">
                                      {entry.roomNumber}
                                    </span>
                                    {/* Edit / Delete on hover */}
                                    <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                      <button
                                        type="button"
                                        onClick={() => openEdit(entry)}
                                        className="flex-1 rounded-lg bg-white/10 py-0.5 text-[9px] font-bold hover:bg-white/20 transition"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteClick(entry)}
                                        className="flex-1 rounded-lg bg-rose-500/20 text-rose-500 dark:text-rose-400 py-0.5 text-[9px] font-bold hover:bg-rose-500/30 transition"
                                      >
                                        Del
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="h-full min-h-[72px] flex items-center justify-center">
                                    <span className="text-[10px] text-muted-foreground/25 opacity-0 group-hover/row:opacity-100 transition-opacity duration-150">—</span>
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ─── LIST VIEW TABLE ─── */}
          {activeView === "list" && (
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <table className="w-full text-left text-sm text-foreground">
                <thead className="border-b border-border bg-background/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="p-4 px-6">Class</th>
                    <th className="p-4 px-6">Subject</th>
                    <th className="p-4 px-6">Teacher</th>
                    <th className="p-4 px-6">Day</th>
                    <th className="p-4 px-6">Time Slot</th>
                    <th className="p-4 px-6">Room</th>
                    <th className="p-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredEntries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center">
                        <p className="text-sm font-medium text-muted-foreground">No timetable entries match your filters.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredEntries.map((entry) => {
                      const colorCls = subjectColorMap[entry.subjectId] || SUBJECT_COLORS[0];
                      return (
                        <tr key={entry.id} className="hover:bg-hover transition duration-200">
                          <td className="p-4 px-6 font-bold text-foreground">{entry.className}</td>
                          <td className="p-4 px-6">
                            <span className={`inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-bold ${colorCls}`}>
                              {entry.subjectName}
                            </span>
                          </td>
                          <td className="p-4 px-6 text-muted-foreground text-xs">{entry.teacherName}</td>
                          <td className="p-4 px-6 text-muted-foreground text-xs font-medium">{entry.dayOfWeek}</td>
                          <td className="p-4 px-6 text-muted-foreground text-xs font-semibold tabular-nums">
                            {entry.startTime.slice(0, 5)} – {entry.endTime.slice(0, 5)}
                          </td>
                          <td className="p-4 px-6">
                            <span className="rounded-lg bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                              {entry.roomNumber}
                            </span>
                          </td>
                          <td className="p-4 px-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => openEdit(entry)}
                                title="Edit"
                                className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-hover text-muted-foreground hover:text-cyan-500 hover:border-cyan-500/30 transition"
                              >
                                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteClick(entry)}
                                title="Delete"
                                className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-hover text-muted-foreground hover:text-rose-500 hover:border-rose-500/30 transition"
                              >
                                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        title="Delete Timetable Entry?"
        message={`Are you sure you want to remove the scheduling for ${entryToDelete?.detail}? This cannot be undone.`}
        onConfirm={confirmDelete}
        onCancel={() => { setDeleteModalOpen(false); setEntryToDelete(null); }}
      />
    </div>
  );
}
