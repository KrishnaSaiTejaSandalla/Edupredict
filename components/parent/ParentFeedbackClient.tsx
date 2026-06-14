"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import DeleteConfirmModal from "@/components/ui/DeleteConfirmModal";
import { submitFeedback, deleteFeedback } from "@/lib/feedback-actions";

type FeedbackHistory = {
  id: number;
  userId: number;
  schoolId: number;
  title: string;
  message: string;
  category: string;
  createdAt: Date | string;
};

type Props = {
  initialHistory: FeedbackHistory[];
};

const inputCls = "input-theme";
const labelCls = "block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5";
const selectCls = "select-theme";

export default function ParentFeedbackClient({ initialHistory }: Props) {
  const [history, setHistory] = useState<FeedbackHistory[]>(initialHistory);
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    category: "Academic",
    message: "",
  });

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [feedbackToDelete, setFeedbackToDelete] = useState<{ id: number; title: string } | null>(null);

  const reloadData = async () => {
    try {
      const res = await fetch("/api/feedback/my-feedback");
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error("Failed to refresh feedback history:", err);
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setFormData({
      title: "",
      category: "Academic",
      message: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.message) {
      toast.error("Please fill in all required fields.");
      return;
    }

    startTransition(async () => {
      try {
        await submitFeedback({
          title: formData.title,
          category: formData.category,
          message: formData.message,
        });
        toast.success("Feedback submitted successfully.");
        closeForm();
        await reloadData();
      } catch (err: any) {
        toast.error(err.message || "Failed to submit feedback.");
      }
    });
  };

  const handleDeleteClick = (item: FeedbackHistory) => {
    setFeedbackToDelete({ id: item.id, title: item.title });
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!feedbackToDelete) return;
    setDeleteModalOpen(false);
    startTransition(async () => {
      try {
        await deleteFeedback(feedbackToDelete.id);
        toast.success("Feedback deleted successfully.");
        await reloadData();
      } catch (err: any) {
        toast.error(err.message || "Failed to delete feedback.");
      } finally {
        setFeedbackToDelete(null);
      }
    });
  };

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
      {/* Header Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-500 dark:text-cyan-400">
            Parent Portal
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
            My Feedback
          </h1>
          <p className="mt-2 text-sm text-secondary">
            Share suggestions, concerns, or appreciation about academic courses, transit, or facilities.
          </p>
        </div>

        <button
          onClick={() => (showForm ? closeForm() : setShowForm(true))}
          className="rounded-xl btn-blue px-5 py-3 text-xs font-bold whitespace-nowrap self-start sm:self-auto"
        >
          {showForm ? "Close Panel" : "+ Submit Feedback"}
        </button>
      </div>

      {/* Form Card */}
      {showForm && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-md animate-in fade-in slide-in-from-bottom-2 duration-300">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-primary mb-6">
            Share New Feedback
          </h2>
          <form onSubmit={handleSubmit} className="grid gap-5 md:grid-cols-2">
            {/* Title */}
            <div>
              <label className={labelCls}>Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className={inputCls}
                placeholder="e.g. Bus Route #4 Delay"
              />
            </div>

            {/* Category */}
            <div>
              <label className={labelCls}>Category *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className={selectCls}
                required
              >
                <option value="Academic">Academic</option>
                <option value="Facilities">Facilities</option>
                <option value="Transport">Transport</option>
                <option value="Administration">Administration</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Message */}
            <div className="md:col-span-2">
              <label className={labelCls}>Your Message *</label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Detail your feedback (minimum 10 characters)..."
                className="w-full min-h-[100px] p-3 rounded-xl border border-theme bg-background text-sm text-primary outline-none focus:border-cyan-500 transition placeholder:text-muted"
                required
              />
            </div>

            {/* Actions */}
            <div className="md:col-span-2 flex gap-3 mt-2">
              <button
                type="submit"
                disabled={isPending}
                className="rounded-xl btn-emerald px-5 py-2.5 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? "Submitting..." : "Send Feedback"}
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

      {/* History Feed */}
      {history.length === 0 ? (
        <div className="rounded-2xl border border-theme bg-surface p-12 text-center text-sm font-medium text-muted">
          No feedback records submitted yet. Click + Submit Feedback to share one.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 animate-in fade-in duration-300">
          {history.map((item) => (
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
                <span>Submitted</span>
                <span>
                  {new Date(item.createdAt).toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        title="Delete Your Feedback?"
        message={`Are you sure you want to permanently remove your feedback submission "${feedbackToDelete?.title}"?`}
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteModalOpen(false);
          setFeedbackToDelete(null);
        }}
      />
    </div>
  );
}
