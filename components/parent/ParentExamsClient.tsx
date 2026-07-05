"use client";

import { useState, useEffect } from "react";

type ExamRecord = {
  id: number;
  name: string;
  examDate: string;
  startTime: string;
  endTime: string;
  roomNumber: string;
  maxMarks: number;
  syllabus: string | null;
  instructions: string | null;
  subjectName: string;
};

type Props = {
  initialExams: ExamRecord[];
  subjectsList: string[];
  studentName: string;
};

export default function ParentExamsClient({ initialExams, subjectsList, studentName }: Props) {
  const [activeTab, setActiveTab] = useState<"upcoming" | "completed">("upcoming");
  const [searchQuery, setSearchQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [selectedExam, setSelectedExam] = useState<ExamRecord | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const todayStr = new Date().toISOString().split("T")[0];

  // Filter and split exams
  const filteredExams = initialExams.filter((e) => {
    const matchesSearch =
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.instructions || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSubject = subjectFilter === "all" || e.subjectName === subjectFilter;

    // Check tab status
    const isUpcoming = e.examDate >= todayStr;
    const matchesTab = activeTab === "upcoming" ? isUpcoming : !isUpcoming;

    return matchesSearch && matchesSubject && matchesTab;
  });

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, subjectFilter, activeTab]);

  const totalPages = Math.ceil(filteredExams.length / itemsPerPage) || 1;
  const paginatedExams = filteredExams.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 animate-in fade-in duration-300">
      {/* Header Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-theme pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-500 dark:text-cyan-400">
            Academics
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
            Exam Schedules
          </h1>
          <p className="mt-2 text-sm text-secondary">
            View upcoming examinations, room bookings, and rules for {studentName}.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex rounded-xl bg-hover p-1 border border-theme self-start sm:self-auto">
          <button
            onClick={() => setActiveTab("upcoming")}
            className={`rounded-lg px-4 py-2 text-xs font-bold transition duration-150 ${activeTab === "upcoming"
              ? "bg-surface text-cyan-400 shadow-md ring-1 ring-cyan-500/10"
              : "text-muted hover:text-primary"
              }`}
          >
            Upcoming Exams
          </button>
          <button
            onClick={() => setActiveTab("completed")}
            className={`rounded-lg px-4 py-2 text-xs font-bold transition duration-150 ${activeTab === "completed"
              ? "bg-surface text-cyan-400 shadow-md ring-1 ring-cyan-500/10"
              : "text-muted hover:text-primary"
              }`}
          >
            Completed Exams
          </button>
        </div>
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
              placeholder="Search exam name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-xl border border-theme bg-surface pl-9 pr-3 text-xs text-primary outline-none focus:border-cyan-500 placeholder:text-muted transition-all"
            />
          </div>

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
        </div>
      </div>

      {/* Cards List */}
      {paginatedExams.length === 0 ? (
        <div className="rounded-2xl border border-theme bg-surface p-12 text-center text-sm font-medium text-muted">
          No {activeTab === "upcoming" ? "upcoming" : "completed"} exams scheduled.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {paginatedExams.map((row) => (
            <div
              key={row.id}
              className="rounded-2xl border border-theme bg-surface p-4 shadow-sm flex flex-col justify-between hover:border-cyan-500/20 transition-all duration-200"
            >
              <div className="space-y-2">
                <div className="flex justify-between items-start gap-2">
                  <span className="rounded bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-cyan-400">
                    {row.subjectName}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${row.examDate >= todayStr
                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    }`}>
                    {row.examDate >= todayStr ? "Upcoming" : "Completed"}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-primary truncate" title={row.name}>{row.name}</h3>

                <div className="space-y-1.5 text-xs text-secondary font-medium pt-1">
                  <div className="flex items-center gap-1.5">
                    <svg className="h-3.5 w-3.5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>{new Date(row.examDate).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <svg className="h-3.5 w-3.5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{row.startTime.slice(0, 5)} - {row.endTime.slice(0, 5)}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={() => setSelectedExam(row)}
                  className="w-full rounded-xl border border-theme bg-hover hover:bg-surface py-2 text-xs font-bold text-primary transition duration-150"
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/90 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-theme bg-surface p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start">
              <div>
                <span className="rounded bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-cyan-400">
                  {selectedExam.subjectName}
                </span>
                <h3 className="text-lg font-bold text-primary mt-2">{selectedExam.name}</h3>
              </div>
              <button
                onClick={() => setSelectedExam(null)}
                className="rounded-lg p-1.5 text-muted hover:bg-hover hover:text-foreground transition"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-b border-theme py-4 text-xs font-medium text-secondary">
              <div>
                <p className="text-[10px] text-muted uppercase font-bold tracking-wider">Date</p>
                <p className="mt-1 font-semibold text-primary">
                  {new Date(selectedExam.examDate).toLocaleDateString([], {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted uppercase font-bold tracking-wider">Timings</p>
                <p className="mt-1 font-semibold text-primary">
                  {selectedExam.startTime.slice(0, 5)} - {selectedExam.endTime.slice(0, 5)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted uppercase font-bold tracking-wider">Room</p>
                <p className="mt-1 font-semibold text-primary">Room {selectedExam.roomNumber}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted uppercase font-bold tracking-wider">Max Marks</p>
                <p className="mt-1 font-semibold text-primary">{selectedExam.maxMarks} Marks</p>
              </div>
            </div>

            {/* Contextual Instructions */}
            <div className="space-y-2">
              <h4 className="text-[10px] uppercase font-bold text-muted tracking-wider">Instructions</h4>
              <ul className="space-y-1.5 text-xs text-secondary bg-rose-500/5 rounded-xl p-4 border border-rose-500/10 text-rose-300/90 list-disc pl-5">
                {selectedExam.name.toLowerCase().includes("weekly") ||
                  selectedExam.name.toLowerCase().includes("unit") ||
                  selectedExam.name.toLowerCase().includes("class test") ? (
                  <>
                    <li>Bring pen, pencil, eraser and required stationery.</li>
                    <li>Arrive before reporting time.</li>
                    <li>Carry school ID card.</li>
                  </>
                ) : (
                  <>
                    <li>Bring Admit Card.</li>
                    <li>Bring standard school supplies.</li>
                    <li>No electronic devices.</li>
                    <li>Follow school examination guidelines.</li>
                  </>
                )}
              </ul>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setSelectedExam(null)}
                className="w-full rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white py-2.5 text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
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
            Page {currentPage} of {totalPages} ({filteredExams.length} exams)
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
    </div>
  );
}
