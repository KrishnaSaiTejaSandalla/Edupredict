"use client";

import { useState, useTransition, useEffect } from "react";
import PageHeader from "@/components/shared/PageHeader";
import { toast } from "sonner";
import { toggleHomeworkCompleted } from "@/lib/student-actions";

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

export default function StudentDiaryClient({ initialEntries, initialProgress }: Props) {
  const [progress, setProgress] = useState<ProgressType[]>(initialProgress);
  const [filter, setFilter] = useState<"all" | "incomplete" | "completed">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [isPending, startTransition] = useTransition();

  // Reset page when filters/search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchQuery]);

  const handleToggle = (diaryId: number, currentDone: boolean) => {
    const nextDone = !currentDone;

    // Optimistic update
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
        toast.success(nextDone ? "Marked homework completed! 🎉" : "Unmarked homework");
      } catch (e: any) {
        toast.error(e.message || "Failed to update progress");
        // Revert optimistic update
        setProgress((prev) => prev.map((p) => p.diaryId === diaryId ? { ...p, isCompleted: currentDone } : p));
      }
    });
  };

  // Filtering
  const filteredEntries = initialEntries.filter((e) => {
    const isCompleted = progress.find((p) => p.diaryId === e.id)?.isCompleted || false;
    
    // Search match
    const matchesSearch = 
      (e.subjectName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.topicTaught.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.homework || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.teacherName || "").toLowerCase().includes(searchQuery.toLowerCase());

    // Status filter match
    let matchesStatus = true;
    if (filter === "completed") {
      matchesStatus = isCompleted && !!e.homework;
    } else if (filter === "incomplete") {
      matchesStatus = !isCompleted && !!e.homework;
    }

    return matchesSearch && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage) || 1;
  const paginatedEntries = filteredEntries.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      <PageHeader tag="Student Portal" title="Student Diary" description="Daily log of topics taught and assigned homework." />

      {initialEntries.length > 0 ? (
        <div className="space-y-6">
          {/* Controls */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-surface border border-theme p-4 rounded-2xl shadow-sm">
            {/* Search */}
            <div className="w-full md:w-72">
              <input
                type="text"
                placeholder="Search diary logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-theme bg-hover p-2.5 text-xs text-primary focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">Filter Homework:</span>
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

          {/* Entries list */}
          <div className="space-y-4">
            {paginatedEntries.map((e) => {
              const isCompleted = progress.find((p) => p.diaryId === e.id)?.isCompleted || false;
              return (
                <div
                  key={e.id}
                  className={`rounded-2xl border transition-all duration-300 p-5 ${
                    isCompleted
                      ? "border-emerald-500/20 bg-emerald-500/5"
                      : "border-theme bg-surface hover:bg-hover"
                  } shadow-md`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-3 flex-1">
                      {/* Meta */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-lg bg-violet-500/15 text-violet-400 uppercase tracking-widest border border-violet-500/10">
                          {e.subjectName}
                        </span>
                        <span className="text-xs text-muted">
                          {new Date(e.date).toLocaleDateString("en-US", {
                            weekday: "short",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>

                      {/* Content block */}
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <span className="block text-[9px] font-bold text-secondary uppercase tracking-widest mb-0.5">Topic Taught</span>
                          <p className="text-sm font-semibold text-primary">{e.topicTaught}</p>
                        </div>
                        <div>
                          <span className="block text-[9px] font-bold text-secondary uppercase tracking-widest mb-0.5">Homework Assigned</span>
                          <p className="text-xs text-primary leading-relaxed whitespace-pre-wrap">{e.homework || "None assigned"}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 border-t border-theme/40 pt-2 text-[10px] text-muted">
                        <span>👩‍🏫 Teacher: {e.teacherName || "Class Teacher"}</span>
                      </div>
                    </div>

                    {e.homework && (
                      <div className="shrink-0 flex items-center md:self-center">
                        <button
                          onClick={() => handleToggle(e.id, isCompleted)}
                          disabled={isPending}
                          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all duration-200 border ${
                            isCompleted
                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-sm"
                              : "bg-violet-500/10 text-violet-400 border-violet-500/20 hover:bg-violet-500/20"
                          }`}
                        >
                          {isCompleted ? "✓ Completed" : "Mark as Done"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredEntries.length === 0 && (
              <div className="rounded-2xl border border-dashed border-theme p-10 text-center text-muted">
                No matching diary records found.
              </div>
            )}
          </div>

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border border-theme bg-surface rounded-2xl text-xs shadow-sm">
              <span className="text-xs text-secondary font-medium">Page {currentPage} of {totalPages} ({filteredEntries.length} total entries)</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="rounded-xl border border-theme bg-hover disabled:opacity-40 px-3 py-1.5 text-xs font-bold transition"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
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
          <p className="text-xs text-muted mt-1">Your class diary does not have any lessons logged by teachers yet.</p>
        </div>
      )}
    </div>
  );
}
