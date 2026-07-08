"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import {
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  saveNotificationPreferences,
  type NotificationPreferences,
} from "@/lib/notification-actions";
import { useNotificationStore, type NotificationItem } from "@/store/useNotificationStore";

type PriorityFilter = "all" | "high" | "medium" | "low";
type TabType = "all" | "unread" | "read";

const PREF_FILTERS = [
  { key: "attendance", label: "Attendance Alerts" },
  { key: "assignments", label: "Assignments" },
  { key: "messages", label: "Messages" },
  { key: "diary", label: "Diary" },
  { key: "feedback", label: "Feedback" },
  { key: "leaves", label: "Leaves" },
  { key: "announcements", label: "Announcements" },
  { key: "transport", label: "Transport Alerts" },
  { key: "general", label: "General Alerts" },
] as const;

type PrefKey = (typeof PREF_FILTERS)[number]["key"];

// Map notification types to preference categories
function matchesCategory(item: NotificationItem, category: string): boolean {
  const t = item.type?.toLowerCase() ?? "";
  const title = item.title?.toLowerCase() ?? "";
  const msg = item.message?.toLowerCase() ?? "";

  switch (category) {
    case "attendance":
      return t === "attendance" || title.includes("attendance") || title.includes("absent") || msg.includes("attendance") || msg.includes("absent");
    case "assignments":
      return t === "assignment" || t === "assignments" || title.includes("assignment") || msg.includes("assignment");
    case "messages":
      return t === "message" || t === "messages" || t === "chat" || title.includes("message") || title.includes("chat") || msg.includes("message") || msg.includes("chat");
    case "diary":
      return t === "diary" || title.includes("diary") || msg.includes("diary");
    case "feedback":
      return t === "feedback" || title.includes("feedback") || msg.includes("feedback");
    case "leaves":
      return t === "leave" || t === "leaves" || title.includes("leave") || msg.includes("leave");
    case "announcements":
      return t === "announcement" || t === "announcements" || title.includes("announcement") || msg.includes("announcement");
    case "transport":
      return t === "transport" || t === "bus" || t === "buslocation" || title.includes("transport") || title.includes("bus") || msg.includes("transport") || msg.includes("bus");
    case "general":
      return (
        t === "general" ||
        t === "info" ||
        t === "academic" ||
        t === "marks" ||
        t === "exam" ||
        t === "exams" ||
        (!["attendance", "assignment", "assignments", "message", "messages", "chat", "diary", "feedback", "leave", "leaves", "announcement", "announcements", "transport"].includes(t))
      );
    default:
      return true;
  }
}

function getPriorityStyle(priority: string) {
  if (priority === "high")
    return "border-l-4 border-l-rose-500 bg-rose-500/5 border border-theme";
  if (priority === "medium")
    return "border-l-4 border-l-amber-500 bg-amber-500/5 border border-theme";
  return "border-l-4 border-l-accent bg-accent-bg border border-theme";
}

function getPriorityBadge(priority: string) {
  if (priority === "high")
    return (
      <span className="rounded-full bg-rose-500/10 dark:bg-rose-500/20 px-2.5 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400">
        High
      </span>
    );
  if (priority === "medium")
    return (
      <span className="rounded-full bg-amber-500/10 dark:bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
        Medium
      </span>
    );
  return (
    <span className="rounded-full bg-accent-bg px-2.5 py-0.5 text-[10px] font-bold text-accent">
      Low
    </span>
  );
}

function getGroup(dateStr: string): "Today" | "Yesterday" | "This Week" | "Older" {
  const d = new Date(dateStr);
  const now = new Date();
  
  const dMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  
  const oneDay = 24 * 60 * 60 * 1000;
  
  if (dMidnight === nowMidnight) return "Today";
  if (nowMidnight - dMidnight === oneDay) return "Yesterday";
  if (nowMidnight - dMidnight < 7 * oneDay) return "This Week";
  return "Older";
}

export default function SharedNotificationsClient({
  initialItems,
  userId,
  initialPrefs,
}: {
  initialItems: NotificationItem[];
  userId: number;
  initialUnreadCount: number;
  initialPrefs?: NotificationPreferences;
}) {
  const notifications = useNotificationStore((s) => s.notifications);
  const setNotifications = useNotificationStore((s) => s.setNotifications);
  const storeMarkRead = useNotificationStore((s) => s.markRead);
  const storeMarkAllRead = useNotificationStore((s) => s.markAllRead);
  const storeDelete = useNotificationStore((s) => s.deleteNotification);

  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [activePrefs, setActivePrefs] = useState<Record<PrefKey, boolean>>({
    attendance: initialPrefs?.attendance ?? true,
    assignments: initialPrefs?.assignments ?? true,
    messages: initialPrefs?.messages ?? true,
    diary: initialPrefs?.diary ?? true,
    feedback: initialPrefs?.feedback ?? true,
    leaves: initialPrefs?.leaves ?? true,
    announcements: initialPrefs?.announcements ?? true,
    transport: initialPrefs?.transport ?? true,
    general: initialPrefs?.general ?? true,
  });

  // Sync server items with store on mount & when database gets updated
  useEffect(() => {
    setNotifications(initialItems);
  }, [initialItems, setNotifications]);

  // Debounce search
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedSearch(val), 300);
  };

  // Filter items based on active tabs, priority, search query, and category preferences
  const filteredItems = notifications.filter((item) => {
    // Tab filter
    if (activeTab === "unread" && item.isRead) return false;
    if (activeTab === "read" && !item.isRead) return false;
    // "all" tab shows everything — no read/unread filter

    // Priority filter
    if (priorityFilter !== "all") {
      const p = item.priority?.toLowerCase();
      if (priorityFilter === "low") {
        if (p !== "low" && p !== "info") return false;
      } else {
        if (p !== priorityFilter) return false;
      }
    }

    // Preferences category UI filter
    const enabledPrefs = (Object.keys(activePrefs) as PrefKey[]).filter((k) => activePrefs[k]);
    if (enabledPrefs.length === 0) return false;
    if (!enabledPrefs.some((k) => matchesCategory(item, k))) return false;

    // Search query
    const q = debouncedSearch.toLowerCase();
    if (q) {
      const titleMatch = item.title?.toLowerCase().includes(q);
      const msgMatch = item.message?.toLowerCase().includes(q);
      if (!titleMatch && !msgMatch) return false;
    }

    return true;
  });

  // Group notifications
  const groups: Record<"Today" | "Yesterday" | "This Week" | "Older", NotificationItem[]> = {
    Today: [],
    Yesterday: [],
    "This Week": [],
    Older: [],
  };

  filteredItems.forEach((item) => {
    const groupName = getGroup(item.createdAt);
    groups[groupName].push(item);
  });

  // Mark single notification as read optimistically
  const handleMarkRead = async (id: number) => {
    storeMarkRead(id);
    try {
      await markNotificationRead(id);
    } catch {
      toast.error("Failed to update read status on server");
    }
  };

  // Mark all notifications read optimistically
  const handleMarkAllRead = async () => {
    const hasUnread = notifications.some(n => !n.isRead);
    if (!hasUnread) {
      toast.info("No unread notifications");
      return;
    }
    storeMarkAllRead();
    try {
      await markAllNotificationsRead(userId);
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to mark all as read on server");
    }
  };

  // Delete notification optimistically
  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering mark read on click
    storeDelete(id);
    try {
      await deleteNotification(id);
      toast.success("Notification deleted");
    } catch {
      toast.error("Failed to delete notification on server");
    }
  };

  // Save UI preferences on click
  const togglePref = async (key: PrefKey) => {
    const updated = { ...activePrefs, [key]: !activePrefs[key] };
    setActivePrefs(updated);
    try {
      await saveNotificationPreferences(userId, updated as any);
      toast.success("Preferences updated successfully");
    } catch {
      toast.error("Failed to save notification preferences");
    }
  };

  const activeUnreadCount = notifications.filter(n => !n.isRead).length;
  const activeReadCount = notifications.filter(n => n.isRead).length;
  const activeTotalCount = notifications.length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-theme pb-6">
        <div>
          <span className="inline-flex items-center rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-[10px] font-bold text-cyan-400 uppercase tracking-wider border border-cyan-500/10">
            Realtime Updates
          </span>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
            Notification Center
          </h1>
          <p className="mt-2 text-sm leading-6 text-secondary">
            School updates, alerts, and system messages synchronized instantly.
          </p>
        </div>
        <button
          onClick={handleMarkAllRead}
          className="rounded-xl border border-theme bg-surface px-5 py-3 text-xs font-semibold text-primary shadow-lg hover:bg-hover active:scale-[0.98] transition-all duration-200"
        >
          Mark All Read
        </button>
      </div>

      {/* Main Grid */}
      <section className="grid gap-8 xl:grid-cols-[1fr_320px]">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Controls Menu */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-theme bg-surface/50 p-4 shadow-md backdrop-blur-md">
            {/* Tabs & Priority Filters */}
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <button
                onClick={() => setActiveTab("all")}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 transition duration-200 ${
                  activeTab === "all"
                    ? "bg-cyan-500/10 text-cyan-400 ring-1 ring-cyan-500/15"
                    : "text-secondary hover:bg-hover"
                }`}
              >
                All
                <span className="rounded-full bg-hover px-2 py-0.5 text-[10px] font-bold text-secondary">
                  {activeTotalCount}
                </span>
              </button>
              <button
                onClick={() => setActiveTab("unread")}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 transition duration-200 ${
                  activeTab === "unread"
                    ? "bg-cyan-500/10 text-cyan-400 ring-1 ring-cyan-500/15"
                    : "text-secondary hover:bg-hover"
                }`}
              >
                Unread
                <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-500">
                  {activeUnreadCount}
                </span>
              </button>
              <button
                onClick={() => setActiveTab("read")}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 transition duration-200 ${
                  activeTab === "read"
                    ? "bg-cyan-500/10 text-cyan-400 ring-1 ring-cyan-500/15"
                    : "text-secondary hover:bg-hover"
                }`}
              >
                Read History
                <span className="rounded-full bg-hover px-2 py-0.5 text-[10px] font-bold text-secondary">
                  {activeReadCount}
                </span>
              </button>

              <div className="h-6 w-px bg-theme self-center mx-1" />

              {/* Priority Filter */}
              {(["all", "high", "medium", "low"] as PriorityFilter[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPriorityFilter(p)}
                  className={`capitalize rounded-xl px-3 py-2.5 transition ${
                    priorityFilter === p
                      ? "bg-hover text-primary ring-1 ring-theme"
                      : "text-secondary hover:text-primary"
                  }`}
                >
                  {p === "all" ? "All Priorities" : p}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 fill-current">
                  <path d="M10 4a6 6 0 1 0 3.7 10.7l3.6 3.6 1.4-1.4-3.6-3.6A6 6 0 0 0 10 4Zm0 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z" />
                </svg>
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search alerts..."
                className="input-theme h-10 w-full sm:w-60 pl-9 focus:ring-cyan-500/20"
              />
            </div>
          </div>

          {/* Grouped Feed */}
          <div className="rounded-2xl border border-theme bg-surface/50 p-6 shadow-xl backdrop-blur-md space-y-8">
            {(["Today", "Yesterday", "This Week", "Older"] as const).map((groupName) => {
              const list = groups[groupName];
              if (list.length === 0) return null;

              return (
                <div key={groupName} className="space-y-3.5 animate-in fade-in duration-300">
                  <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest px-1">
                    {groupName}
                  </h3>
                  <div className="space-y-3">
                    {list.map((item) => (
                      <article
                        key={item.id}
                        onClick={() => item.isRead ? null : handleMarkRead(item.id)}
                        className={`flex gap-4 rounded-xl p-4 transition-all duration-200 hover:bg-hover/40 relative group border border-transparent ${
                          item.isRead ? "bg-hover/10" : getPriorityStyle(item.priority)
                        } ${!item.isRead ? "cursor-pointer hover:border-cyan-500/20" : ""}`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <h2 className="text-sm font-semibold text-primary truncate">
                                {item.title}
                              </h2>
                              {!item.isRead && (
                                <span className="h-2 w-2 rounded-full bg-rose-500 shadow-lg shadow-rose-500/50" />
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {getPriorityBadge(item.priority)}
                              <span className="rounded-full bg-hover px-2.5 py-0.5 text-[9px] font-bold text-secondary uppercase tracking-wider">
                                {item.type}
                              </span>
                            </div>
                          </div>
                          <p className="mt-2 text-xs leading-relaxed text-secondary pr-16">
                            {item.message}
                          </p>
                          <div className="mt-3 flex items-center gap-3">
                            <span className="text-[10px] text-muted font-medium">
                              {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {item.actionUrl && (
                              <a
                                href={item.actionUrl}
                                className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                View Details →
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Action buttons on hover */}
                        <div className="absolute right-4 bottom-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          {!item.isRead && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleMarkRead(item.id); }}
                              className="rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 px-2 py-1 text-[10px] font-bold text-cyan-400 transition"
                            >
                              Mark Read
                            </button>
                          )}
                          <button
                            onClick={(e) => handleDelete(item.id, e)}
                            className="rounded-lg bg-rose-500/10 hover:bg-rose-500/20 px-2 py-1 text-[10px] font-bold text-rose-400 transition"
                          >
                            Delete
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              );
            })}

            {filteredItems.length === 0 && (
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
                  {activeTab === "unread" ? "No unread notifications" : activeTab === "read" ? "No notification history" : "No notifications yet"}
                </p>
                <p className="mt-1 text-xs text-muted">
                  You are all caught up!
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Preferences Panel */}
        <aside className="rounded-2xl border border-theme bg-surface/50 p-6 shadow-xl backdrop-blur-md self-start space-y-6">
          <div className="border-b border-theme pb-4">
            <h2 className="text-sm font-bold text-primary uppercase tracking-wider">
              Preferences
            </h2>
            <p className="text-xs text-secondary mt-1">
              Configure feeds for active alerts.
            </p>
          </div>
          <div className="space-y-3 text-xs font-semibold text-primary">
            {PREF_FILTERS.map(({ key, label }) => (
              <label
                key={key}
                className="flex items-center justify-between rounded-xl border border-theme bg-hover/10 px-4 py-3.5 cursor-pointer hover:bg-hover/20 transition-colors"
              >
                <span>{label}</span>
                <input
                  type="checkbox"
                  checked={activePrefs[key]}
                  onChange={() => togglePref(key)}
                  className="h-4.5 w-4.5 cursor-pointer rounded border-theme bg-surface text-cyan-400 focus:ring-cyan-500/20"
                  style={{ accentColor: "var(--accent-primary)" }}
                />
              </label>
            ))}
          </div>
        </aside>
      </section>
    </div>
  );
}
