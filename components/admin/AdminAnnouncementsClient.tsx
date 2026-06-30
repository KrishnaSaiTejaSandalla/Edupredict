"use client";

import { useState, useTransition, useEffect } from "react";
import { toast } from "sonner";
import DeleteConfirmModal from "@/components/ui/DeleteConfirmModal";
import { createAnnouncement, deleteAnnouncement } from "@/lib/announcement-actions";

type Announcement = {
  id: number;
  announcementId: string;
  title: string;
  message: string;
  priority: string;
  createdAt: Date | string;
  attachmentUrl?: string;
};

type Props = {
  initialAnnouncements: Announcement[];
};

export default function AdminAnnouncementsClient({ initialAnnouncements }: Props) {
  const [announcementsList, setAnnouncementsList] = useState<Announcement[]>(initialAnnouncements);
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    priority: "medium",
    attachmentUrl: "",
  });

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [annToDelete, setAnnToDelete] = useState<Announcement | null>(null);

  // Reset page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, priorityFilter]);

  const reloadData = async () => {
    try {
      const res = await fetch("/api/announcements");
      if (res.ok) {
        const data = await res.json();
        setAnnouncementsList(data);
      }
    } catch (err) {
      console.error("Failed to refresh announcements:", err);
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setFormData({
      title: "",
      message: "",
      priority: "medium",
      attachmentUrl: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.message.trim()) {
      toast.error("Title and message are required.");
      return;
    }

    startTransition(async () => {
      try {
        await createAnnouncement({
          title: formData.title,
          message: formData.message,
          priority: formData.priority,
          attachmentUrl: formData.attachmentUrl.trim() || undefined,
        });
        toast.success("Announcement published successfully.");
        closeForm();
        await reloadData();
      } catch (err: any) {
        toast.error(err.message || "An error occurred.");
      }
    });
  };

  const handleDeleteClick = (ann: Announcement) => {
    setAnnToDelete(ann);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!annToDelete) return;
    setDeleteModalOpen(false);
    startTransition(async () => {
      try {
        await deleteAnnouncement(annToDelete.announcementId);
        toast.success(`Announcement "${annToDelete.title}" removed.`);
        await reloadData();
      } catch (err: any) {
        toast.error(err.message || "Failed to remove announcement.");
      } finally {
        setAnnToDelete(null);
      }
    });
  };

  // Stats calculation
  const totalCount = announcementsList.length;
  const highCount = announcementsList.filter((a) => a.priority === "high").length;
  const mediumCount = announcementsList.filter((a) => a.priority === "medium").length;
  const lowCount = announcementsList.filter((a) => a.priority === "low").length;

  // Filter items
  const filteredAnnouncements = announcementsList.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.message.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPriority = priorityFilter === "all" || item.priority === priorityFilter;

    return matchesSearch && matchesPriority;
  });

  const totalPages = Math.ceil(filteredAnnouncements.length / itemsPerPage) || 1;
  const paginatedAnnouncements = filteredAnnouncements.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      case "medium":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "low":
        return "bg-slate-500/10 text-slate-400 border-slate-500/20";
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
            Operations
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
            Announcement Manager
          </h1>
          <p className="mt-2 text-sm text-secondary">
            Broadcast emergency alerts, general news, or notifications to all school members.
          </p>
        </div>

        <button
          onClick={() => (showForm ? closeForm() : setShowForm(true))}
          className="rounded-xl btn-cyan px-5 py-3 text-xs font-bold whitespace-nowrap self-start sm:self-auto transition duration-200"
        >
          {showForm ? "Close Panel" : "+ Publish Announcement"}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {/* Total */}
        <div className="rounded-2xl border border-theme bg-surface p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Total Broadcasts</p>
          <p className="mt-2 text-3xl font-bold text-primary">{totalCount}</p>
        </div>

        {/* High */}
        <div className="rounded-2xl border border-theme bg-surface p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-rose-500">Critical / High</p>
          <p className="mt-2 text-3xl font-bold text-rose-400">{highCount}</p>
        </div>

        {/* Medium */}
        <div className="rounded-2xl border border-theme bg-surface p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-500">Standard / Medium</p>
          <p className="mt-2 text-3xl font-bold text-amber-400">{mediumCount}</p>
        </div>

        {/* Low */}
        <div className="rounded-2xl border border-theme bg-surface p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Low / General</p>
          <p className="mt-2 text-3xl font-bold text-slate-400">{lowCount}</p>
        </div>
      </div>

      {/* Editor Panel */}
      {showForm && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-md animate-in fade-in slide-in-from-bottom-2 duration-300">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-primary mb-6">
            Publish New Announcement
          </h2>
          <form onSubmit={handleSubmit} className="grid gap-5 md:grid-cols-2">
            {/* Title */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Broadcast Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="input-theme"
                placeholder="e.g. Annual Sports Meet Schedule Released"
              />
            </div>

            {/* Description / Message */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Broadcast Message *
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                required
                rows={5}
                className="input-theme"
                placeholder="Enter full details here..."
              />
            </div>

            {/* Priority */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="select-theme"
              >
                <option value="high">High (Urgent Alerts)</option>
                <option value="medium">Medium (General Updates)</option>
                <option value="low">Low (General Information)</option>
              </select>
            </div>

            {/* Attachment Link */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Attachment URL (Optional)
              </label>
              <input
                type="text"
                value={formData.attachmentUrl}
                onChange={(e) => setFormData({ ...formData, attachmentUrl: e.target.value })}
                className="input-theme"
                placeholder="e.g. https://example.com/handout.pdf"
              />
            </div>

            {/* Form actions */}
            <div className="md:col-span-2 flex gap-3 mt-2">
              <button
                type="submit"
                disabled={isPending}
                className="rounded-xl btn-cyan px-5 py-2.5 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? "Publishing..." : "Publish Broadcast"}
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

      {/* Control Filters */}
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
              placeholder="Search announcements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-xl border border-theme bg-surface pl-9 pr-3 text-xs text-primary outline-none focus:border-cyan-500 placeholder:text-muted transition-all"
            />
          </div>

          {/* Priority filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-10 rounded-xl border border-theme bg-surface px-3 text-xs text-primary outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="all">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Announcements Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-md">
        <table className="w-full text-left text-sm text-foreground animate-in fade-in duration-300">
          <thead className="border-b border-border bg-background/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="p-4 px-6">Published On</th>
              <th className="p-4 px-6">Broadcast Title</th>
              <th className="p-4 px-6">Message / Details</th>
              <th className="p-4 px-6">Priority</th>
              <th className="p-4 px-6">Attachment</th>
              <th className="p-4 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-subtle">
            {paginatedAnnouncements.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-12 text-center text-sm font-medium text-muted-foreground">
                  No announcements published yet.
                </td>
              </tr>
            ) : (
              paginatedAnnouncements.map((ann) => (
                <tr key={ann.announcementId} className="hover:bg-hover transition duration-200">
                  <td className="p-4 px-6 text-xs text-secondary whitespace-nowrap">
                    {new Date(ann.createdAt).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td className="p-4 px-6 font-semibold text-primary">{ann.title}</td>
                  <td className="p-4 px-6 text-xs text-secondary max-w-xs truncate" title={ann.message}>
                    {ann.message}
                  </td>
                  <td className="p-4 px-6">
                    <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${getPriorityBadge(ann.priority)}`}>
                      {ann.priority}
                    </span>
                  </td>
                  <td className="p-4 px-6 text-xs font-medium text-cyan-400">
                    {ann.attachmentUrl ? (
                      <a href={ann.attachmentUrl} target="_blank" rel="noreferrer" className="hover:underline">
                        📎 View File
                      </a>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="p-4 px-6 text-right">
                    <button
                      onClick={() => handleDeleteClick(ann)}
                      title="Delete Broadcast"
                      className="flex h-8 w-8 items-center justify-center rounded-xl border border-subtle bg-hover text-muted-foreground hover:text-rose-500 hover:border-rose-500/30 transition duration-150 ml-auto"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground pt-4 border-t border-border mt-4 w-full">
          <div>
            {currentPage > 1 && (
              <button
                onClick={() => setCurrentPage((p) => p - 1)}
                className="rounded-xl border border-border bg-card px-4 py-2.5 hover:bg-hover transition duration-150 text-foreground"
              >
                ← Previous
              </button>
            )}
          </div>
          <span className="tabular-nums">Page {currentPage} of {totalPages} ({filteredAnnouncements.length} total announcements)</span>
          <div>
            {currentPage < totalPages && (
              <button
                onClick={() => setCurrentPage((p) => p + 1)}
                className="rounded-xl border border-border bg-card px-4 py-2.5 hover:bg-hover transition duration-150 text-foreground"
              >
                Next →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        title="Delete Announcement?"
        message={`Are you sure you want to permanently delete announcement "${annToDelete?.title}"? This will remove it from all user dashboards.`}
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteModalOpen(false);
          setAnnToDelete(null);
        }}
      />
    </div>
  );
}
