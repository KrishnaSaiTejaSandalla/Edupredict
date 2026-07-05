"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useNotificationStore } from "@/store/useNotificationStore";
import { markNotificationRead, markAllNotificationsRead, deleteNotification } from "@/lib/notification-actions";

interface NotificationItem {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: string;
  priority: string;
  isRead: boolean;
  createdAt: string;
}

type TabType = "all" | "unread" | "attendance" | "marks" | "assignments" | "announcements" | "transport" | "feedback" | "diary";

const getPriorityStyle = (priority: string, isRead: boolean) => {
  if (isRead) return "border border-theme bg-surface/40 opacity-70";
  if (priority === "high")
    return "border-l-4 border-l-rose-500 bg-rose-500/5 border border-theme";
  if (priority === "medium")
    return "border-l-4 border-l-amber-500 bg-amber-500/5 border border-theme";
  return "border-l-4 border-l-cyan-500 bg-cyan-500/5 border border-theme";
};

const getPriorityBadge = (priority: string) => {
  if (priority === "high")
    return (
      <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[9px] font-bold text-rose-400">
        High
      </span>
    );
  if (priority === "medium")
    return (
      <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold text-amber-400">
        Medium
      </span>
    );
  return (
    <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[9px] font-bold text-cyan-400">
      Low
    </span>
  );
};

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
};

export default function ParentNotificationsClient({
  initialItems,
  userId,
  initialUnreadCount,
}: {
  initialItems: NotificationItem[];
  userId: number;
  initialUnreadCount: number;
}) {
  const [items, setItems] = useState<NotificationItem[]>(initialItems);
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const { hydrate, decrement, clearAll } = useNotificationStore();

  useEffect(() => {
    hydrate(initialUnreadCount);
  }, [hydrate, initialUnreadCount]);

  // Sync internal state when initialItems change
  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const handleMarkRead = async (id: number) => {
    const item = items.find((i) => i.id === id);
    if (!item || item.isRead) return;

    // Optimistically update
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, isRead: true } : i))
    );
    decrement(1);

    try {
      await markNotificationRead(id);
      router.refresh();
    } catch {
      // Revert on error
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, isRead: false } : i))
      );
      hydrate(items.filter((i) => !i.isRead).length);
      toast.error("Failed to mark notification as read");
    }
  };

  const handleMarkAllRead = async () => {
    const unreadIds = items.filter((i) => !i.isRead).map((i) => i.id);
    if (unreadIds.length === 0) {
      toast.info("No unread alerts");
      return;
    }

    const snapshot = [...items];
    setItems((prev) => prev.map((i) => ({ ...i, isRead: true })));
    clearAll();

    try {
      await markAllNotificationsRead(userId);
      toast.success("All alerts marked as read");
      router.refresh();
    } catch {
      setItems(snapshot);
      hydrate(snapshot.filter((i) => !i.isRead).length);
      toast.error("Failed to mark all as read");
    }
  };

  const handleDelete = async (id: number) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;

    const snapshot = [...items];
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (!item.isRead) {
      decrement(1);
    }

    try {
      await deleteNotification(id);
      toast.success("Notification deleted");
    } catch {
      setItems(snapshot);
      if (!item.isRead) {
        decrement(-1);
      }
      toast.error("Failed to delete notification");
    }
  };

  // Filter items locally
  const filteredItems = items.filter((item) => {
    // Tab filter
    if (activeTab === "unread") {
      if (item.isRead) return false;
    } else if (activeTab !== "all") {
      const type = item.type?.toLowerCase() || "";
      const tab = activeTab.toLowerCase();
      // Match marks against exam/result/marks
      if (tab === "marks") {
        if (type !== "marks" && type !== "result" && type !== "results" && type !== "exam" && type !== "exams") {
          return false;
        }
      } else if (tab === "assignments") {
        if (type !== "assignments" && type !== "assignment") return false;
      } else if (tab === "announcements") {
        if (type !== "announcements" && type !== "announcement") return false;
      } else {
        if (type !== tab) return false;
      }
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const match =
        item.title?.toLowerCase().includes(query) ||
        item.message?.toLowerCase().includes(query);
      if (!match) return false;
    }

    return true;
  });

  // Pagination bounds
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset page when filter shifts
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery]);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-theme pb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-400">
            Inbox updates
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
            Notifications Center
          </h1>
          <p className="mt-2 text-sm text-secondary">
            Keep track of diary entries, class marks, upcoming events, and attendance warnings.
          </p>
        </div>
        <button
          onClick={handleMarkAllRead}
          className="rounded-xl border border-theme bg-surface px-5 py-3 text-xs font-semibold text-primary shadow-lg hover:bg-hover transition-all duration-200 shrink-0 self-start sm:self-auto"
        >
          Mark All Read
        </button>
      </div>

      <div className="grid gap-6">
        {/* Filter Tabs and Search Row */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-theme bg-surface p-4 shadow-sm">
          {/* Scrollable Filter Categories */}
          <div className="flex flex-wrap gap-2 text-xs font-bold uppercase tracking-wider">
            {[
              { id: "all", label: "All Alerts" },
              { id: "unread", label: "Unread" },
              { id: "attendance", label: "Attendance" },
              { id: "marks", label: "Marks" },
              { id: "assignments", label: "Assignments" },
              { id: "announcements", label: "Announcements" },
              { id: "transport", label: "Transport" },
              { id: "feedback", label: "Feedback" },
              { id: "diary", label: "Diary" },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`rounded-lg px-3 py-2 transition-all border ${isActive
                    ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20 shadow-sm"
                    : "text-secondary hover:bg-hover hover:text-primary border-transparent"
                    }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Search bar */}
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                <path d="M10 4a6 6 0 1 0 3.7 10.7l3.6 3.6 1.4-1.4-3.6-3.6A6 6 0 0 0 10 4Zm0 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full sm:w-60 rounded-xl border border-theme bg-hover pl-10 pr-4 text-xs text-primary outline-none focus:border-cyan-500 transition-all placeholder:text-muted"
            />
          </div>
        </div>

        {/* Notifications Feed */}
        <div className="rounded-2xl border border-theme bg-surface/50 p-6 shadow-sm">
          <div className="space-y-3.5">
            {paginatedItems.map((item) => (
              <article
                key={item.id}
                onClick={() => handleMarkRead(item.id)}
                className={`flex gap-4 rounded-xl p-4 transition-all duration-200 relative group cursor-pointer hover:bg-hover ${getPriorityStyle(
                  item.priority,
                  item.isRead
                )}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <h2 className={`text-sm font-semibold text-primary truncate ${!item.isRead ? 'font-bold' : 'font-medium'}`}>
                        {item.title}
                      </h2>
                      {!item.isRead && (
                        <span className="h-2 w-2 rounded-full bg-cyan-400 shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {getPriorityBadge(item.priority)}
                      <span className="rounded-full bg-hover/60 px-2 py-0.5 text-[9px] font-bold text-secondary uppercase tracking-wider">
                        {item.type}
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-secondary pr-10">
                    {item.message}
                  </p>
                  <div className="mt-3 flex items-center gap-3 text-[10px] text-muted font-semibold">
                    <span>{timeAgo(item.createdAt)}</span>
                    {!item.isRead && (
                      <>
                        <span>·</span>
                        <span className="text-cyan-400 hover:text-cyan-300">Click to read</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Delete button absolute positioned */}
                <button
                  type="button"
                  aria-label="Delete notification"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(item.id);
                  }}
                  className="absolute right-4 bottom-4 p-1.5 rounded-lg text-muted hover:text-rose-400 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-all duration-200"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                  </svg>
                </button>
              </article>
            ))}

            {paginatedItems.length === 0 && (
              <div className="text-center py-16">
                <svg
                  className="mx-auto h-12 w-12 text-muted"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                <p className="mt-4 text-sm font-semibold text-secondary">
                  No notifications found
                </p>
                <p className="mt-1 text-xs text-muted">
                  You are all caught up!
                </p>
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs font-bold text-muted pt-6 mt-6 border-t border-theme">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="rounded-xl border border-theme bg-surface px-4 py-2 hover:bg-hover disabled:opacity-40 transition-opacity"
              >
                ← Previous
              </button>
              <span>
                Page {currentPage} of {totalPages} ({filteredItems.length} notifications)
              </span>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="rounded-xl border border-theme bg-surface px-4 py-2 hover:bg-hover disabled:opacity-40 transition-opacity"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
