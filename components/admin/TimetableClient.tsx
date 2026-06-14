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

type ClassRow = {
  id: number;
  name: string;
  section: string | null;
};

type SubjectRow = {
  id: number;
  name: string;
  code: string | null;
};

type TeacherRow = {
  id: number;
  name: string;
  employeeId: string | null;
};

type Props = {
  initialEntries: TimetableEntry[];
  classes: ClassRow[];
  subjects: SubjectRow[];
  teachers: TeacherRow[];
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

const inputCls = "input-theme";
const labelCls = "block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5";
const selectCls = "select-theme";

export default function TimetableClient({
  initialEntries,
  classes,
  subjects,
  teachers,
}: Props) {
  const [entries, setEntries] = useState<TimetableEntry[]>(initialEntries);
  const [activeTab, setActiveTab] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>("all");
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState<string>("all");

  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    classId: "",
    subjectId: "",
    teacherId: "",
    dayOfWeek: "Monday",
    startTime: "",
    endTime: "",
    roomNumber: "",
  });

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<{ id: number; detail: string } | null>(null);

  // Filtered teachers based on selected subject
  const [filteredTeachers, setFilteredTeachers] = useState<TeacherRow[]>(teachers);
  const [isLoadingTeachers, setIsLoadingTeachers] = useState(false);

  // When subject changes, fetch teachers assigned to that subject
  const handleSubjectChange = async (subjectId: string) => {
    setFormData((prev) => ({ ...prev, subjectId, teacherId: "" }));

    if (!subjectId) {
      setFilteredTeachers(teachers);
      return;
    }

    setIsLoadingTeachers(true);
    try {
      const res = await fetch(`/api/timetable/teachers?subjectId=${subjectId}`);
      if (res.ok) {
        const data = await res.json();
        setFilteredTeachers(data);
      } else {
        setFilteredTeachers(teachers);
      }
    } catch {
      setFilteredTeachers(teachers);
    } finally {
      setIsLoadingTeachers(false);
    }
  };

  // Reload action logic (since we want instant UI feedback)
  const reloadData = async () => {
    try {
      const res = await fetch("/api/timetable");
      if (res.ok) {
        const data = await res.json();
        setEntries(data);
      }
    } catch (err) {
      console.error("Failed to refresh data:", err);
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFilteredTeachers(teachers);
    setFormData({
      classId: "",
      subjectId: "",
      teacherId: "",
      dayOfWeek: "Monday",
      startTime: "",
      endTime: "",
      roomNumber: "",
    });
  };

  const openCreate = () => {
    setEditingId(null);
    setFilteredTeachers(teachers);
    setFormData({
      classId: "",
      subjectId: "",
      teacherId: "",
      dayOfWeek: "Monday",
      startTime: "",
      endTime: "",
      roomNumber: "",
    });
    setShowForm(true);
  };

  const openEdit = async (entry: TimetableEntry) => {
    setEditingId(entry.id);
    setFormData({
      classId: entry.classId.toString(),
      subjectId: entry.subjectId.toString(),
      teacherId: entry.teacherId.toString(),
      dayOfWeek: entry.dayOfWeek,
      startTime: entry.startTime.slice(0, 5),
      endTime: entry.endTime.slice(0, 5),
      roomNumber: entry.roomNumber,
    });
    setShowForm(true);

    // Pre-load filtered teachers for the entry's subject
    try {
      const res = await fetch(`/api/timetable/teachers?subjectId=${entry.subjectId}`);
      if (res.ok) {
        const data = await res.json();
        setFilteredTeachers(data);
      }
    } catch {
      setFilteredTeachers(teachers);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.classId || !formData.subjectId || !formData.teacherId || !formData.startTime || !formData.endTime || !formData.roomNumber) {
      toast.error("Please fill in all required fields.");
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          classId: Number(formData.classId),
          subjectId: Number(formData.subjectId),
          teacherId: Number(formData.teacherId),
          dayOfWeek: formData.dayOfWeek,
          startTime: formData.startTime + ":00",
          endTime: formData.endTime + ":00",
          roomNumber: formData.roomNumber,
        };

        if (editingId) {
          await updateTimetableEntry(editingId, payload);
          toast.success("Timetable entry updated successfully.");
        } else {
          await createTimetableEntry(payload);
          toast.success("Timetable entry created successfully.");
        }
        closeForm();
        await reloadData();
      } catch (err: any) {
        toast.error(err.message || "An error occurred.");
      }
    });
  };

  const handleDeleteClick = (entry: TimetableEntry) => {
    setEntryToDelete({
      id: entry.id,
      detail: `${entry.className} - ${entry.subjectName} (${entry.dayOfWeek} ${entry.startTime.slice(0, 5)}-${entry.endTime.slice(0, 5)})`,
    });
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!entryToDelete) return;
    setDeleteModalOpen(false);
    startTransition(async () => {
      try {
        await deleteTimetableEntry(entryToDelete.id);
        toast.success("Timetable entry deleted successfully.");
        await reloadData();
      } catch (err: any) {
        toast.error(err.message || "Failed to delete entry.");
      } finally {
        setEntryToDelete(null);
      }
    });
  };

  // Filter entries
  const filteredEntries = entries.filter((entry) => {
    const matchesSearch =
      entry.className.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.subjectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.teacherName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.roomNumber.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesClass =
      selectedClassFilter === "all" || entry.classId.toString() === selectedClassFilter;

    const matchesTeacher =
      selectedTeacherFilter === "all" || entry.teacherId.toString() === selectedTeacherFilter;

    return matchesSearch && matchesClass && matchesTeacher;
  });

  return (
    <div className="space-y-8">
      {/* Header Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-500 dark:text-cyan-400">
            Operations
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
            Timetables
          </h1>
          <p className="mt-2 text-sm text-secondary">
            Manage weekly schedules, resolve timing conflicts, and schedule classroom bookings.
          </p>
        </div>

        <button
          onClick={() => (showForm && !editingId ? closeForm() : openCreate())}
          className="rounded-xl btn-blue px-5 py-3 text-xs font-bold whitespace-nowrap self-start sm:self-auto"
        >
          {showForm && !editingId ? "Close Scheduler" : "+ Create Entry"}
        </button>
      </div>

      {/* Editor Panel */}
      {showForm && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-md animate-in fade-in slide-in-from-bottom-2 duration-300">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-primary mb-6">
            {editingId ? "Modify Timetable Entry" : "Create New Timetable Entry"}
          </h2>
          <form onSubmit={handleSubmit} className="grid gap-5 md:grid-cols-3">
            {/* Class Selection */}
            <div>
              <label className={labelCls}>Class *</label>
              <select
                value={formData.classId}
                onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                className={selectCls}
                required
              >
                <option value="">Select Class</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} {cls.section ? `(${cls.section})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject Selection */}
            <div>
              <label className={labelCls}>Subject *</label>
              <select
                value={formData.subjectId}
                onChange={(e) => handleSubjectChange(e.target.value)}
                className={selectCls}
                required
              >
                <option value="">Select Subject</option>
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name} ({sub.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Teacher Selection — filtered by subject */}
            <div>
              <label className={labelCls}>Teacher *</label>
              <select
                value={formData.teacherId}
                onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                className={selectCls}
                required
                disabled={isLoadingTeachers}
              >
                <option value="">
                  {isLoadingTeachers
                    ? "Loading teachers..."
                    : filteredTeachers.length === 0
                      ? "No teachers available for this subject"
                      : "Select Teacher"}
                </option>
                {filteredTeachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.employeeId})
                  </option>
                ))}
              </select>
              {!isLoadingTeachers && formData.subjectId && filteredTeachers.length === 0 && (
                <p className="mt-1 text-xs text-amber-400">
                  No teachers are assigned to this subject. Assign a teacher in Academics → Subjects first.
                </p>
              )}
            </div>

            {/* Day of Week */}
            <div>
              <label className={labelCls}>Day of Week *</label>
              <select
                value={formData.dayOfWeek}
                onChange={(e) => setFormData({ ...formData, dayOfWeek: e.target.value })}
                className={selectCls}
                required
              >
                {DAYS_OF_WEEK.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </div>

            {/* Timing */}
            <div>
              <label className={labelCls}>Start Time *</label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className={inputCls}
                required
              />
            </div>

            <div>
              <label className={labelCls}>End Time *</label>
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className={inputCls}
                required
              />
            </div>

            {/* Room */}
            <div>
              <label className={labelCls}>Room Number *</label>
              <input
                type="text"
                value={formData.roomNumber}
                onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                className={inputCls}
                placeholder="e.g. Room 104"
                required
              />
            </div>

            {/* Form actions */}
            <div className="md:col-span-3 flex gap-3 mt-2">
              <button
                type="submit"
                disabled={isPending}
                className="rounded-xl btn-emerald px-5 py-2.5 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? "Scheduling..." : editingId ? "Update Entry" : "Save Entry"}
              </button>
              <button
                type="button"
                onClick={closeForm}
                className="rounded-xl border border-theme bg-surface px-5 py-2.5 text-xs font-bold text-primary hover:bg-hover transition duration-200"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Control Filters and Tabs */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-theme pb-4">
        {/* Search & Class/Teacher Filter Group */}
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-muted" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.602 10.602Z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search schedule..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-xl border border-theme bg-surface pl-9 pr-3 text-xs text-primary outline-none focus:border-cyan-500 placeholder:text-muted transition-all"
            />
          </div>

          {/* Class Filter Dropdown */}
          <select
            value={selectedClassFilter}
            onChange={(e) => setSelectedClassFilter(e.target.value)}
            className="h-10 rounded-xl border border-theme bg-surface px-3 text-xs text-primary outline-none focus:border-cyan-500"
          >
            <option value="all">All Classes</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id.toString()}>
                {cls.name} {cls.section ? `(${cls.section})` : ""}
              </option>
            ))}
          </select>

          {/* Teacher Filter Dropdown */}
          <select
            value={selectedTeacherFilter}
            onChange={(e) => setSelectedTeacherFilter(e.target.value)}
            className="h-10 rounded-xl border border-theme bg-surface px-3 text-xs text-primary outline-none focus:border-cyan-500"
          >
            <option value="all">All Teachers</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id.toString()}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex rounded-lg bg-surface border border-theme p-1 self-start md:self-auto shrink-0">
          <button
            onClick={() => setActiveTab("grid")}
            className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition ${
              activeTab === "grid"
                ? "bg-cyan-500/10 text-cyan-400"
                : "text-secondary hover:text-primary"
            }`}
          >
            Daily Grid
          </button>
          <button
            onClick={() => setActiveTab("list")}
            className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition ${
              activeTab === "list"
                ? "bg-cyan-500/10 text-cyan-400"
                : "text-secondary hover:text-primary"
            }`}
          >
            All Entries
          </button>
        </div>
      </div>

      {/* Grid View (Day by Day grouping) */}
      {activeTab === "grid" && (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {DAYS_OF_WEEK.map((day) => {
            const dayEntries = filteredEntries
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
                    {dayEntries.length} {dayEntries.length === 1 ? "Class" : "Classes"}
                  </span>
                </div>

                {dayEntries.length === 0 ? (
                  <p className="text-xs text-muted py-4 text-center">No classes scheduled.</p>
                ) : (
                  <div className="space-y-3">
                    {dayEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="group relative rounded-xl border border-theme bg-surface hover:bg-hover p-3.5 transition duration-150"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-xs font-bold text-primary group-hover:text-cyan-400 transition">
                              {entry.subjectName}
                            </p>
                            <p className="text-[11px] text-secondary mt-1">
                              Class: <span className="font-semibold text-primary">{entry.className}</span>
                            </p>
                            <p className="text-[11px] text-secondary mt-0.5">
                              Teacher: <span className="text-primary">{entry.teacherName}</span>
                            </p>
                          </div>
                          <span className="rounded bg-hover px-1.5 py-0.5 text-[9px] font-semibold text-cyan-400">
                            {entry.roomNumber}
                          </span>
                        </div>

                        {/* Timing Block */}
                        <div className="mt-3 flex items-center gap-1.5 text-[10px] font-semibold text-secondary">
                          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current" strokeWidth="2.5">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 6v6l4 2" />
                          </svg>
                          <span>
                            {entry.startTime.slice(0, 5)} - {entry.endTime.slice(0, 5)}
                          </span>
                        </div>

                        {/* Edit/Delete overlay controls */}
                        <div className="mt-3 flex justify-end gap-2 border-t border-subtle pt-2">
                          <button
                            onClick={() => openEdit(entry)}
                            className="rounded p-1 text-[10px] font-semibold text-secondary hover:text-cyan-400 hover:bg-hover transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteClick(entry)}
                            className="rounded p-1 text-[10px] font-semibold text-rose-500 hover:text-rose-400 hover:bg-hover transition"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* List View Table */}
      {activeTab === "list" && (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-md">
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
            <tbody className="divide-y divide-subtle">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center">
                    <p className="text-sm font-medium text-muted-foreground">No timetable entries found matching filters.</p>
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-hover transition duration-200">
                    <td className="p-4 px-6 font-semibold text-foreground">{entry.className}</td>
                    <td className="p-4 px-6 font-medium text-foreground">{entry.subjectName}</td>
                    <td className="p-4 px-6 text-secondary">{entry.teacherName}</td>
                    <td className="p-4 px-6 text-secondary">{entry.dayOfWeek}</td>
                    <td className="p-4 px-6 text-secondary">
                      {entry.startTime.slice(0, 5)} - {entry.endTime.slice(0, 5)}
                    </td>
                    <td className="p-4 px-6">
                      <span className="rounded bg-hover px-1.5 py-0.5 text-xs font-medium text-cyan-400">
                        {entry.roomNumber}
                      </span>
                    </td>
                    <td className="p-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Edit Button */}
                        <button
                          onClick={() => openEdit(entry)}
                          title="Edit scheduling"
                          className="flex h-8 w-8 items-center justify-center rounded-xl border border-subtle bg-hover text-muted-foreground hover:text-cyan-400 hover:border-cyan-400/30 transition duration-150"
                        >
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z" />
                          </svg>
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDeleteClick(entry)}
                          title="Remove scheduling"
                          className="flex h-8 w-8 items-center justify-center rounded-xl border border-subtle bg-hover text-muted-foreground hover:text-rose-500 hover:border-rose-500/30 transition duration-150"
                        >
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        title="Delete Timetable Entry?"
        message={`Are you sure you want to remove the weekly scheduling for ${entryToDelete?.detail}? This action cannot be undone.`}
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteModalOpen(false);
          setEntryToDelete(null);
        }}
      />
    </div>
  );
}
