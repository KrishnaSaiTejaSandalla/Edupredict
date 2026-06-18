"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";

type ClassInfo = { id: number; name: string; section: string };
type Student = {
  id: number;
  name: string;
  rollNumber: string;
  gender: string;
  profileImageUrl: string | null;
  classId: number;
};

type Props = {
  teacherId: number | null;
  myClasses: ClassInfo[];
  initialStudents: Student[];
  defaultClassId: number | null;
};

type AssignmentItem = {
  id: number;
  title: string;
  dueDate: string | null;
  maxMarks: number;
  totalStudents: number;
  submitted: number;
  submissionPct: number;
};

export default function MyClassesClient({ teacherId, myClasses, initialStudents, defaultClassId }: Props) {
  const [selectedClassId, setSelectedClassId] = useState<number | null>(defaultClassId);
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "boys" | "girls">("all");

  useEffect(() => {
    if (!selectedClassId) return;
    fetch(`/api/teacher/attendance?classId=${selectedClassId}`)
      .then((r) => r.json())
      .then((data) => setStudents(data.students || []))
      .catch(() => {});
  }, [selectedClassId]);

  const selectedClass = myClasses.find((c) => c.id === selectedClassId);

  const filtered = students.filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.rollNumber.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "all" || (filter === "boys" && s.gender === "male") || (filter === "girls" && s.gender === "female");
    return matchSearch && matchFilter;
  });

  if (myClasses.length === 0) {
    return (
      <main className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8 space-y-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-500 dark:text-cyan-400">
            Faculty Portal
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">My Classes</h1>
        </div>
        <div className="rounded-2xl border-2 border-dashed border-theme bg-surface p-16 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-hover text-muted">
            <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
              <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2ZM6 4h5v8l-2.5-1.5L6 12V4Z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-primary">No Class Assigned</h3>
          <p className="mt-2 mx-auto max-w-md text-sm text-secondary">
            You are not yet assigned as a Class Teacher. Contact the administrator to assign you as a Class Teacher for a class.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8 space-y-8 transition-colors duration-200">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-500 dark:text-cyan-400">
          Faculty Portal · Class Teacher
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">My Classes</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage your assigned class, view student profiles, and track progress.
        </p>
      </div>

      {/* Class Selector (if multiple classes) */}
      {myClasses.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {myClasses.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedClassId(c.id)}
              className={`rounded-xl px-4 py-2 text-xs font-semibold border transition ${
                selectedClassId === c.id
                  ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
                  : "text-secondary border-subtle hover:bg-hover"
              }`}
            >
              {c.name} {c.section}
            </button>
          ))}
        </div>
      )}

      {/* Class Info Card */}
      {selectedClass && (
        <div className="rounded-2xl border border-border bg-gradient-to-r from-cyan-500/5 to-blue-500/5 p-5 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/15 text-cyan-500 shrink-0">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">{selectedClass.name} {selectedClass.section}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {students.length} Students
            </p>
          </div>
          <div className="ml-auto flex gap-3">
            <div className="text-right">
              <p className="text-2xl font-bold text-foreground">{students.length}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Students</p>
            </div>
          </div>
        </div>
      )}

      {/* Search + Filter */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search by name or roll number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-theme max-w-[280px] py-2 text-xs flex-1"
        />
        <div className="flex gap-1 rounded-xl border border-subtle bg-hover p-1">
          {(["all", "boys", "girls"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
                filter === f ? "bg-cyan-500/20 text-cyan-400" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">{filtered.length} of {students.length}</span>
      </div>

      {/* Student Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-theme p-12 text-center">
          <p className="text-sm text-secondary">
            {students.length === 0 ? "No students enrolled in this class." : "No students match your search."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((student) => (
            <div
              key={student.id}
              className="group rounded-2xl border border-border bg-card hover:border-cyan-500/30 hover:-translate-y-1 transition-all duration-300 p-5 cursor-pointer shadow-sm hover:shadow-lg"
            >
              <div className="flex items-center gap-3">
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-300 text-sm font-bold text-slate-950 overflow-hidden">
                  {student.profileImageUrl ? (
                    <img src={student.profileImageUrl} alt={student.name} className="h-full w-full object-cover" />
                  ) : (
                    student.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-foreground group-hover:text-cyan-400 transition truncate">{student.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Roll {student.rollNumber}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold capitalize ${
                  student.gender === "female"
                    ? "bg-pink-500/10 text-pink-400 border-pink-500/20"
                    : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                }`}>
                  {student.gender || "N/A"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
