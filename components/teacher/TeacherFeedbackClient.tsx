"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { submitFeedback } from "@/lib/feedback-actions";

type PastFeedback = {
  id: number;
  title: string;
  message: string;
  category: string;
  createdAt: Date | string;
};

type Props = {
  initialFeedback: PastFeedback[];
};

const CATEGORIES = ["Academic", "Facilities", "Transport", "Administration", "Other"];

export default function TeacherFeedbackClient({ initialFeedback }: Props) {
  const [feedbackList, setFeedbackList] = useState<PastFeedback[]>(initialFeedback);
  const [activeTab, setActiveTab] = useState<"form" | "history">("form");
  const [isPending, startTransition] = useTransition();

  // Form state
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("Academic");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const reloadData = async () => {
    try {
      const res = await fetch("/api/teacher/feedback");
      if (res.ok) {
        const data = await res.json();
        setFeedbackList(data);
      }
    } catch (err) {
      console.error("Failed to reload feedback list:", err);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error("Please fill in all fields.");
      return;
    }
    if (title.trim().length < 3) {
      toast.error("Title must be at least 3 characters.");
      return;
    }
    if (message.trim().length < 10) {
      toast.error("Message must be at least 10 characters.");
      return;
    }

    startTransition(async () => {
      try {
        await submitFeedback({
          title: title.trim(),
          message: message.trim(),
          category,
        });
        toast.success("Feedback submitted successfully! 📮");
        setTitle("");
        setMessage("");
        setCategory("Academic");
        await reloadData();
        setActiveTab("history");
        setCurrentPage(1);
      } catch (err: any) {
        toast.error(err.message || "Something went wrong.");
      }
    });
  };

  // Stats calculation
  const totalSubmitted = feedbackList.length;
  const academicCount = feedbackList.filter((f) => f.category === "Academic").length;
  const adminCount = feedbackList.filter((f) => f.category === "Administration").length;
  const facilitiesCount = feedbackList.filter((f) => f.category === "Facilities").length;

  // Pagination filtering
  const totalPages = Math.ceil(feedbackList.length / itemsPerPage) || 1;
  const paginatedFeedback = feedbackList.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-violet-500 dark:text-violet-400">
          Faculty Console
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
          Teacher Feedback Hub
        </h1>
        <p className="mt-2 text-sm text-secondary">
          Share your ideas, suggestions, survey responses, or issues directly with the administration.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl p-5 border border-theme bg-surface relative overflow-hidden">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider">Total Submitted</p>
          <p className="mt-2 text-3xl font-black text-violet-400">{totalSubmitted}</p>
          <p className="mt-1 text-xs text-secondary">Your feedback records</p>
        </div>
        <div className="rounded-2xl p-5 border border-theme bg-surface relative overflow-hidden">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider">Academic</p>
          <p className="mt-2 text-3xl font-black text-emerald-400">{academicCount}</p>
          <p className="mt-1 text-xs text-secondary">Syllabus & teaching aids</p>
        </div>
        <div className="rounded-2xl p-5 border border-theme bg-surface relative overflow-hidden">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider">Administrative</p>
          <p className="mt-2 text-3xl font-black text-amber-400">{adminCount}</p>
          <p className="mt-1 text-xs text-secondary">Operations & management</p>
        </div>
        <div className="rounded-2xl p-5 border border-theme bg-surface relative overflow-hidden">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider">Facilities</p>
          <p className="mt-2 text-3xl font-black text-rose-400">{facilitiesCount}</p>
          <p className="mt-1 text-xs text-secondary">Classrooms & campus labs</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-1 rounded-xl border border-subtle bg-hover p-1 w-fit">
        <button
          onClick={() => setActiveTab("form")}
          className={`rounded-lg px-5 py-2.5 text-xs font-semibold transition ${
            activeTab === "form"
              ? "bg-accent-bg text-accent shadow-sm ring-1 ring-accent/30"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Submit Feedback
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`rounded-lg px-5 py-2.5 text-xs font-semibold transition ${
            activeTab === "history"
              ? "bg-accent-bg text-accent shadow-sm ring-1 ring-accent/30"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Submission History ({feedbackList.length})
        </button>
      </div>

      {/* Form View */}
      {activeTab === "form" && (
        <div className="rounded-3xl border border-theme bg-surface p-6 shadow-xl animate-in fade-in duration-300 max-w-2xl">
          <h2 className="text-xs font-extrabold uppercase tracking-widest text-violet-400 mb-6">
            New Feedback Submission
          </h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[10px] font-bold uppercase text-secondary mb-1.5">
                Feedback Title *
              </label>
              <input
                type="text"
                placeholder="Brief summary of your feedback..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full rounded-xl border border-theme bg-hover p-2.5 text-xs text-primary focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-secondary mb-1.5">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-theme bg-hover p-2.5 text-xs text-primary focus:outline-none focus:ring-1 focus:ring-violet-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-secondary mb-1.5">
                Detailed Message (Min. 10 characters) *
              </label>
              <textarea
                placeholder="Explain the suggestion or issue in detail..."
                rows={6}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                className="w-full rounded-xl border border-theme bg-hover p-4 text-xs text-primary focus:outline-none focus:ring-1 focus:ring-violet-500 resize-none transition"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isPending}
                className="rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white px-6 py-2.5 text-xs font-bold disabled:opacity-50 transition shadow-lg shadow-violet-500/20"
              >
                {isPending ? "Submitting..." : "Submit to Administration"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* History View */}
      {activeTab === "history" && (
        <div className="rounded-2xl border border-theme bg-surface overflow-hidden">
          <div className="p-5 border-b border-theme">
            <h2 className="text-sm font-bold text-primary flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-violet-400" />
              Submission History
            </h2>
          </div>

          {paginatedFeedback.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-theme bg-hover/50 text-[10px] font-bold uppercase tracking-wider text-secondary">
                    <th className="py-4 px-6">Submitted On</th>
                    <th className="py-4 px-6">Title</th>
                    <th className="py-4 px-6">Category</th>
                    <th className="py-4 px-6">Message</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme">
                  {paginatedFeedback.map((item) => (
                    <tr key={item.id} className="hover:bg-hover/30 transition-colors">
                      <td className="py-4 px-6 text-xs text-secondary whitespace-nowrap">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-6 text-xs font-bold text-primary">{item.title}</td>
                      <td className="py-4 px-6 text-xs font-semibold text-violet-400 uppercase tracking-wider">
                        {item.category}
                      </td>
                      <td className="py-4 px-6 text-xs text-secondary max-w-sm truncate" title={item.message}>
                        {item.message}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-muted text-sm">
              No feedback submissions logged yet.
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground p-4 border-t border-theme w-full">
              <div>
                {currentPage > 1 && (
                  <button
                    onClick={() => setCurrentPage((p) => p - 1)}
                    className="rounded-xl border border-theme bg-card px-4 py-2.5 hover:bg-hover transition duration-150 text-foreground"
                  >
                    ← Previous
                  </button>
                )}
              </div>
              <span className="tabular-nums">Page {currentPage} of {totalPages} ({feedbackList.length} total entries)</span>
              <div>
                {currentPage < totalPages && (
                  <button
                    onClick={() => setCurrentPage((p) => p + 1)}
                    className="rounded-xl border border-theme bg-card px-4 py-2.5 hover:bg-hover transition duration-150 text-foreground"
                  >
                    Next →
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
