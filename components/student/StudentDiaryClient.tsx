"use client";

import { useState, useTransition, useEffect } from "react";
import PageHeader from "@/components/shared/PageHeader";
import { toast } from "sonner";
import { toggleHomeworkCompleted } from "@/lib/student-actions";
import { createPortal } from "react-dom";

type EntryType = {
  id: number;
  topicTaught: string;
  homework: string | null;
  date: string;
  subjectId: number;
  subjectName: string | null;
  teacherName: string | null;
};

type ProgressType = {
  diaryId: number;
  isCompleted: boolean;
};

type Props = {
  initialEntries: EntryType[];
  initialProgress: ProgressType[];
};

// ── Detail Modal ──────────────────────────────────────────────────────────────
function DiaryDetailModal({
  entry,
  isCompleted,
  isPending,
  onToggle,
  onClose,
}: {
  entry: EntryType;
  isCompleted: boolean;
  isPending: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  if (typeof window === "undefined") return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl border border-theme bg-surface p-6 shadow-2xl space-y-5 mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="inline-block text-[10px] font-extrabold px-2.5 py-0.5 rounded-lg bg-violet-500/15 text-violet-400 uppercase tracking-widest border border-violet-500/10">
              {entry.subjectName}
            </span>
            <p className="mt-2 text-base font-black text-primary leading-tight">{entry.topicTaught}</p>
            <p className="mt-1 text-xs text-muted">
              {new Date(entry.date).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-xl border border-theme bg-hover hover:bg-surface w-8 h-8 flex items-center justify-center text-secondary text-lg leading-none transition"
          >
            ×
          </button>
        </div>

        {/* Topic */}
        <div className="rounded-2xl bg-hover/40 p-4 border border-theme space-y-1">
          <p className="text-[9px] font-bold text-secondary uppercase tracking-widest">Topic Taught</p>
          <p className="text-sm font-semibold text-primary leading-relaxed">{entry.topicTaught}</p>
        </div>

        {/* Homework */}
        <div className="rounded-2xl bg-hover/40 p-4 border border-theme space-y-1">
          <p className="text-[9px] font-bold text-secondary uppercase tracking-widest">Homework Assigned</p>
          <p className="text-xs text-primary leading-relaxed whitespace-pre-wrap">
            {entry.homework || "No homework assigned for this lesson."}
          </p>
        </div>

        {/* Teacher */}
        <div className="flex items-center justify-between border-t border-theme pt-4">
          <span className="text-[10px] text-muted">👩‍🏫 {entry.teacherName || "Class Teacher"}</span>
          {entry.homework && (
            <button
              onClick={onToggle}
              disabled={isPending}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all duration-200 border ${
                isCompleted
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                  : "bg-violet-500/10 text-violet-400 border-violet-500/20 hover:bg-violet-500/20"
              }`}
            >
              {isCompleted ? "✓ Completed" : "Mark as Done"}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function StudentDiaryClient({ initialEntries, initialProgress }: Props) {
  const [progress, setProgress] = useState<ProgressType[]>(initialProgress);
  const [filter, setFilter] = useState<"all" | "incomplete" | "completed">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedEntry, setSelectedEntry] = useState<EntryType | null>(null);
  const itemsPerPage = 12;
  const [isPending, startTransition] = useTransition();

  // Reset page when filters/search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchQuery, dateFilter]);

  const handleToggle = (diaryId: number, currentDone: boolean) => {
    const nextDone = !currentDone;

    setProgress((prev) => {
      const idx = prev.findIndex((p) => p.diaryId === diaryId);
      if (idx > -1) {
        return prev.map((p, i) => (i === idx ? { ...p, isCompleted: nextDone } : p));
      } else {
        return [...prev, { diaryId, isCompleted: nextDone }];
      }
    });

    startTransition(async () => {
      try {
        await toggleHomeworkCompleted(diaryId, nextDone);
        toast.success(nextDone ? "Homework marked done! 🎉" : "Homework unmarked");
      } catch (e: any) {
        toast.error(e.message || "Failed to update progress");
        setProgress((prev) =>
          prev.map((p) => (p.diaryId === diaryId ? { ...p, isCompleted: currentDone } : p))
        );
      }
    });
  };

  const filteredEntries = initialEntries.filter((e) => {
    const isCompleted = progress.find((p) => p.diaryId === e.id)?.isCompleted || false;

    const matchesSearch =
      (e.subjectName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.topicTaught.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.homework || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.teacherName || "").toLowerCase().includes(searchQuery.toLowerCase());

    let matchesStatus = true;
    if (filter === "completed") matchesStatus = isCompleted && !!e.homework;
    else if (filter === "incomplete") matchesStatus = !isCompleted && !!e.homework;

    const matchesDate = !dateFilter || e.date === dateFilter;

    return matchesSearch && matchesStatus && matchesDate;
  });

  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage) || 1;
  const paginatedEntries = filteredEntries.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Stats
  const totalHomework = initialEntries.filter((e) => e.homework).length;
  const doneHomework = initialEntries.filter(
    (e) => e.homework && progress.find((p) => p.diaryId === e.id)?.isCompleted
  ).length;
  const completionRate = totalHomework > 0 ? Math.round((doneHomework / totalHomework) * 100) : 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      <PageHeader
        tag="Student Portal"
        title="Student Diary"
        description="Daily log of topics taught and assigned homework."
      />

      {initialEntries.length > 0 ? (
        <div className="space-y-6">
          {/* KPI Row */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Total Entries", value: initialEntries.length, color: "text-violet-400", icon: "📓" },
              { label: "With Homework", value: totalHomework, color: "text-amber-400", icon: "📝" },
              { label: "Completed", value: doneHomework, color: "text-emerald-400", icon: "✅" },
              { label: "Completion Rate", value: `${completionRate}%`, color: "text-fuchsia-400", icon: "📊" },
            ].map((kpi) => (
              <div
                key={kpi.label}
                className="rounded-2xl border border-theme bg-surface p-4 relative overflow-hidden shadow-sm"
              >
                <p className="text-[10px] font-semibold text-muted uppercase tracking-wider">{kpi.label}</p>
                <p className={`mt-1.5 text-2xl font-black ${kpi.color}`}>{kpi.value}</p>
                <span className="absolute top-2 right-2 text-3xl opacity-10">{kpi.icon}</span>
              </div>
            ))}
          </div>

          {/* Controls */}
          <div className="flex flex-col gap-3 bg-surface border border-theme p-4 rounded-2xl shadow-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            {/* Search */}
            <input
              type="text"
              placeholder="Search topics, subjects, homework…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64 rounded-xl border border-theme bg-hover p-2.5 text-xs text-primary focus:outline-none focus:ring-1 focus:ring-violet-500"
            />

            {/* Date filter */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-secondary uppercase tracking-widest shrink-0">Date:</span>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="rounded-xl border border-theme bg-hover px-3 py-2 text-xs text-primary focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
              {dateFilter && (
                <button
                  onClick={() => setDateFilter("")}
                  className="text-[10px] text-rose-400 hover:text-rose-300 font-bold transition"
                >
                  ✕ Clear
                </button>
              )}
            </div>

            {/* Status filter */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-secondary uppercase tracking-widest shrink-0">
                Homework:
              </span>
              <div className="flex rounded-xl bg-hover p-1 border border-theme">
                {(["all", "incomplete", "completed"] as const).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setFilter(opt)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
                      filter === opt
                        ? "bg-violet-500/20 text-violet-400 border border-violet-500/30"
                        : "text-secondary hover:text-primary"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Compact card grid */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {paginatedEntries.map((e) => {
              const isCompleted = progress.find((p) => p.diaryId === e.id)?.isCompleted || false;
              return (
                <button
                  key={e.id}
                  onClick={() => setSelectedEntry(e)}
                  className={`text-left rounded-2xl border p-4 transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 ${
                    isCompleted
                      ? "border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10"
                      : "border-theme bg-surface hover:bg-hover"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-extrabold text-violet-400 uppercase tracking-widest truncate max-w-[70%]">
                      {e.subjectName}
                    </span>
                    {e.homework && (
                      <span
                        className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                          isCompleted
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        {isCompleted ? "✓ Done" : "HW"}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-bold text-primary leading-snug line-clamp-2">{e.topicTaught}</p>
                  <p className="mt-2 text-[10px] text-muted">
                    {new Date(e.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </button>
              );
            })}
          </div>

          {filteredEntries.length === 0 && (
            <div className="rounded-2xl border border-dashed border-theme p-10 text-center text-muted">
              No diary records match your filters.
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border border-theme bg-surface rounded-2xl text-xs shadow-sm">
              <span className="text-xs text-secondary font-medium">
                Page {currentPage} of {totalPages} ({filteredEntries.length} entries)
              </span>
              <div className="flex gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="rounded-xl border border-theme bg-hover disabled:opacity-40 px-3 py-1.5 text-xs font-bold transition"
                >
                  Previous
                </button>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded-xl border border-theme bg-hover disabled:opacity-40 px-3 py-1.5 text-xs font-bold transition"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-theme p-12 text-center max-w-md mx-auto">
          <p className="text-4xl mb-3">📅</p>
          <p className="text-sm font-bold text-primary">Diary is Empty</p>
          <p className="text-xs text-muted mt-1">
            Your class diary does not have any lessons logged by teachers yet.
          </p>
        </div>
      )}

      {/* Detail Modal */}
      {selectedEntry && (
        <DiaryDetailModal
          entry={selectedEntry}
          isCompleted={progress.find((p) => p.diaryId === selectedEntry.id)?.isCompleted || false}
          isPending={isPending}
          onToggle={() => {
            const current = progress.find((p) => p.diaryId === selectedEntry.id)?.isCompleted || false;
            handleToggle(selectedEntry.id, current);
          }}
          onClose={() => setSelectedEntry(null)}
        />
      )}
    </div>
  );
}
