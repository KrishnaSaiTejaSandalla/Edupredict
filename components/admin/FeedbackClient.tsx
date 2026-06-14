"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import DeleteConfirmModal from "@/components/ui/DeleteConfirmModal";
import { deleteFeedback } from "@/lib/feedback-actions";

type FeedbackItem = {
  id: number;
  userId: number;
  schoolId: number;
  title: string;
  message: string;
  category: string;
  createdAt: Date | string;
  userName: string;
  userRole: string;
};

type Props = {
  initialFeedback: FeedbackItem[];
};

export default function FeedbackClient({ initialFeedback }: Props) {
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>(initialFeedback);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const [isPending, startTransition] = useTransition();

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [feedbackToDelete, setFeedbackToDelete] = useState<{ id: number; title: string } | null>(null);

  const reloadData = async () => {
    try {
      const res = await fetch("/api/feedback");
      if (res.ok) {
        const data = await res.json();
        setFeedbackList(data);
      }
    } catch (err) {
      console.error("Failed to refresh feedback:", err);
    }
  };

  const handleDeleteClick = (item: FeedbackItem) => {
    setFeedbackToDelete({ id: item.id, title: item.title });
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!feedbackToDelete) return;
    setDeleteModalOpen(false);
    startTransition(async () => {
      try {
        await deleteFeedback(feedbackToDelete.id);
        toast.success(`Feedback "${feedbackToDelete.title}" deleted successfully.`);
        await reloadData();
      } catch (err: any) {
        toast.error(err.message || "Failed to delete feedback.");
      } finally {
        setFeedbackToDelete(null);
      }
    });
  };

  // Calculate statistics
  const totalCount = feedbackList.length;
  const academicCount = feedbackList.filter((f) => f.category === "Academic").length;
  const transportCount = feedbackList.filter((f) => f.category === "Transport").length;
  const facilitiesCount = feedbackList.filter((f) => f.category === "Facilities").length;

  // Filter items
  const filteredFeedback = feedbackList.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.userName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    const matchesRole = roleFilter === "all" || item.userRole.toLowerCase() === roleFilter;

    return matchesSearch && matchesCategory && matchesRole;
  });

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "Academic":
        return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
      case "Transport":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      case "Facilities":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "Administration":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/20";
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-500 dark:text-cyan-400">
          Operations
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
          Feedback Viewer
        </h1>
        <p className="mt-2 text-sm text-secondary">
          Monitor operational reviews, suggestions, and academic feedback sent by parents and students.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {/* Total */}
        <div className="rounded-2xl border border-theme bg-surface p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Total Submissions</p>
          <p className="mt-2 text-3xl font-bold text-primary">{totalCount}</p>
        </div>

        {/* Academic */}
        <div className="rounded-2xl border border-theme bg-surface p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-500">Academic</p>
          <p className="mt-2 text-3xl font-bold text-cyan-400">{academicCount}</p>
        </div>

        {/* Transport */}
        <div className="rounded-2xl border border-theme bg-surface p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-purple-500">Transport</p>
          <p className="mt-2 text-3xl font-bold text-purple-400">{transportCount}</p>
        </div>

        {/* Facilities */}
        <div className="rounded-2xl border border-theme bg-surface p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-500">Facilities</p>
          <p className="mt-2 text-3xl font-bold text-amber-400">{facilitiesCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-theme pb-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-muted" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.602 10.602Z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search reviews..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-xl border border-theme bg-surface pl-9 pr-3 text-xs text-primary outline-none focus:border-cyan-500 placeholder:text-muted transition-all"
            />
          </div>

          {/* Category filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-10 rounded-xl border border-theme bg-surface px-3 text-xs text-primary outline-none focus:border-cyan-500"
          >
            <option value="all">All Categories</option>
            <option value="Academic">Academic</option>
            <option value="Facilities">Facilities</option>
            <option value="Transport">Transport</option>
            <option value="Administration">Administration</option>
            <option value="Other">Other</option>
          </select>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-10 rounded-xl border border-theme bg-surface px-3 text-xs text-primary outline-none focus:border-cyan-500"
          >
            <option value="all">All Roles</option>
            <option value="parent">Parent</option>
            <option value="student">Student</option>
          </select>
        </div>
      </div>

      {/* Feedback Card Layout */}
      {filteredFeedback.length === 0 ? (
        <div className="rounded-2xl border border-theme bg-surface p-12 text-center text-sm font-medium text-muted">
          No feedback entries found.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {filteredFeedback.map((item) => {
            const roleBadge =
              item.userRole === "parent"
                ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";

            return (
              <div
                key={item.id}
                className="group relative rounded-2xl border border-theme bg-surface hover:bg-hover p-6 shadow-sm transition duration-150 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start gap-4">
                    <div className="min-w-0">
                      <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${getCategoryBadge(item.category)}`}>
                        {item.category}
                      </span>
                      <h3 className="text-sm font-bold text-primary mt-2 group-hover:text-cyan-400 transition truncate" title={item.title}>
                        {item.title}
                      </h3>
                    </div>

                    <button
                      onClick={() => handleDeleteClick(item)}
                      title="Delete Feedback"
                      className="opacity-0 group-hover:opacity-100 flex h-7 w-7 items-center justify-center rounded-lg border border-subtle bg-background text-muted hover:text-rose-500 hover:border-rose-500/30 transition duration-150 shrink-0"
                    >
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6" />
                      </svg>
                    </button>
                  </div>

                  <p className="mt-4 text-xs text-secondary leading-relaxed whitespace-pre-wrap">
                    {item.message}
                  </p>
                </div>

                <div className="mt-6 border-t border-subtle pt-4 flex items-center justify-between text-[11px] text-muted">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-semibold text-primary truncate max-w-[120px]">
                      {item.userName}
                    </span>
                    <span className={`rounded px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider ${roleBadge}`}>
                      {item.userRole}
                    </span>
                  </div>

                  <span>
                    {new Date(item.createdAt).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        title="Delete Feedback?"
        message={`Are you sure you want to delete feedback "${feedbackToDelete?.title}"? This will remove it permanently from the dashboard.`}
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteModalOpen(false);
          setFeedbackToDelete(null);
        }}
      />
    </div>
  );
}
