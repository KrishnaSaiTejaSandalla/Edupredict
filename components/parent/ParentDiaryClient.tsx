"use client";

import { useState, useEffect } from "react";

type DiaryEntry = {
  id: number;
  date: string;
  topicTaught: string;
  homework: string | null;
  subjectName: string;
  teacherName: string;
};

type Props = {
  initialEntries: DiaryEntry[];
  subjectsList: string[];
  teachersList: string[];
};

export default function ParentDiaryClient({ initialEntries, subjectsList, teachersList }: Props) {
  const [entries] = useState<DiaryEntry[]>(initialEntries);

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [teacherFilter, setTeacherFilter] = useState("all");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Selected Entry for Modal
  const [selectedEntry, setSelectedEntry] = useState<DiaryEntry | null>(null);

  // Filter diary list
  const filteredEntries = entries.filter((row) => {
    const matchesSearch =
      row.topicTaught.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (row.homework || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDate = !dateFilter || row.date === dateFilter;
    const matchesSubject = subjectFilter === "all" || row.subjectName === subjectFilter;
    const matchesTeacher = teacherFilter === "all" || row.teacherName === teacherFilter;

    return matchesSearch && matchesDate && matchesSubject && matchesTeacher;
  });

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, dateFilter, subjectFilter, teacherFilter]);

  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage) || 1;
  const paginatedEntries = filteredEntries.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-500 dark:text-cyan-400">
          Academics
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
          Teacher Diary
        </h1>
        <p className="mt-2 text-sm text-secondary">
          Track lessons, syllabus logs, and homework tasks assigned by class teachers.
        </p>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-theme pb-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search box */}
          <div className="relative w-full sm:w-64">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-muted" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.602 10.602Z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search topic or homework..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-xl border border-theme bg-surface pl-9 pr-3 text-xs text-primary outline-none focus:border-cyan-500 placeholder:text-muted transition-all"
            />
          </div>

          {/* Date Picker */}
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="h-10 rounded-xl border border-theme bg-surface px-3 text-xs text-primary outline-none focus:border-cyan-500"
          />

          {/* Subject Dropdown */}
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="h-10 rounded-xl border border-theme bg-surface px-3 text-xs text-primary outline-none focus:border-cyan-500"
          >
            <option value="all">All Subjects</option>
            {subjectsList.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Teacher Dropdown */}
          <select
            value={teacherFilter}
            onChange={(e) => setTeacherFilter(e.target.value)}
            className="h-10 rounded-xl border border-theme bg-surface px-3 text-xs text-primary outline-none focus:border-cyan-500"
          >
            <option value="all">All Teachers</option>
            {teachersList.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Diary Card Grid */}
      {paginatedEntries.length === 0 ? (
        <div className="rounded-2xl border border-theme bg-surface p-12 text-center text-sm font-medium text-muted">
          No teacher diary entries found.
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {paginatedEntries.map((row) => (
            <div
              key={row.id}
              onClick={() => setSelectedEntry(row)}
              className="group rounded-2xl border border-theme bg-surface hover:bg-hover hover:-translate-y-1 p-5 shadow-sm transition duration-200 cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start gap-2">
                  <span className="rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                    {row.subjectName}
                  </span>
                  <span className="text-[10px] text-muted font-semibold">
                    {new Date(row.date).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>

                <h3 className="mt-3 text-sm font-bold text-primary truncate" title={row.topicTaught}>
                  {row.topicTaught}
                </h3>

                {row.homework ? (
                  <p className="mt-2 text-xs text-secondary line-clamp-3 leading-relaxed">
                    {row.homework}
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-muted italic">No homework assigned</p>
                )}
              </div>

              <div className="mt-5 border-t border-subtle pt-3.5 flex justify-between items-center text-[10px] text-muted">
                <span className="font-semibold text-primary truncate max-w-[150px]">
                  By: {row.teacherName}
                </span>
                <span className="text-cyan-400 group-hover:underline font-bold">Open Details →</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs font-semibold text-muted pt-4 border-t border-theme">
          <div>
            {currentPage > 1 && (
              <button
                onClick={() => setCurrentPage((p) => p - 1)}
                className="rounded-xl border border-theme bg-surface px-4 py-2 hover:bg-hover transition"
              >
                ← Previous
              </button>
            )}
          </div>
          <span>
            Page {currentPage} of {totalPages} ({filteredEntries.length} entries)
          </span>
          <div>
            {currentPage < totalPages && (
              <button
                onClick={() => setCurrentPage((p) => p + 1)}
                className="rounded-xl border border-theme bg-surface px-4 py-2 hover:bg-hover transition"
              >
                Next →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Detailed Diary Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm transition-all duration-300">
          <div
            className="w-full max-w-lg rounded-2xl border border-theme bg-surface p-6 shadow-2xl animate-in fade-in duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-start pb-4 border-b border-subtle">
              <div>
                <span className="rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                  {selectedEntry.subjectName}
                </span>
                <h2 className="mt-2 text-base font-bold text-primary">Diary details</h2>
              </div>
              <button
                onClick={() => setSelectedEntry(null)}
                className="rounded-lg p-1.5 hover:bg-hover text-muted hover:text-primary transition"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="mt-6 space-y-4">
              <div>
                <h4 className="text-[10px] uppercase font-bold text-muted tracking-wider">Topic Taught</h4>
                <p className="mt-1 text-xs text-primary font-semibold leading-relaxed">
                  {selectedEntry.topicTaught}
                </p>
              </div>

              <div>
                <h4 className="text-[10px] uppercase font-bold text-muted tracking-wider">Assigned Homework</h4>
                {selectedEntry.homework ? (
                  <div className="mt-1 text-xs text-secondary bg-base rounded-xl p-3 border border-theme leading-relaxed whitespace-pre-wrap">
                    {selectedEntry.homework}
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-muted italic">No homework assigned for this day.</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-subtle pt-4 text-xs">
                <div>
                  <h4 className="text-[10px] uppercase font-bold text-muted tracking-wider">Date</h4>
                  <p className="mt-0.5 text-primary font-semibold">
                    {new Date(selectedEntry.date).toLocaleDateString([], { weekday: "short", month: "long", day: "numeric", year: "numeric" })}
                  </p>
                </div>
                <div>
                  <h4 className="text-[10px] uppercase font-bold text-muted tracking-wider">Instructor</h4>
                  <p className="mt-0.5 text-primary font-semibold">{selectedEntry.teacherName}</p>
                </div>
              </div>
            </div>

            {/* Close Button */}
            <div className="mt-8 flex justify-end">
              <button
                onClick={() => setSelectedEntry(null)}
                className="rounded-xl border border-theme bg-surface px-5 py-2.5 text-xs font-bold text-primary hover:bg-hover transition duration-200"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
