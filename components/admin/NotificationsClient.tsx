"use client";

import { useState, useRef, useTransition } from "react";
import { toast } from "sonner";
import {
  markNotificationRead,
  markAllNotificationsRead,
  saveNotificationPreferences,
  type NotificationPreferences,
} from "@/lib/notification-actions";
import { useNotificationStore } from "@/store/useNotificationStore";
import { useEffect } from "react";

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

type PriorityFilter = "all" | "high" | "medium" | "low";

// Map notification types to preference categories
function matchesCategory(item: NotificationItem, category: string): boolean {
  const t = item.type?.toLowerCase() ?? "";
  const title = item.title?.toLowerCase() ?? "";
  const msg = item.message?.toLowerCase() ?? "";

  switch (category) {
    case "academic":
      return (
        t.includes("exam") ||
        t.includes("marks") ||
        t.includes("result") ||
        title.includes("exam") ||
        title.includes("marks") ||
        title.includes("result") ||
        msg.includes("exam") ||
        msg.includes("marks") ||
        msg.includes("result")
      );

    case "attendance":
      return (
        t.includes("attendance") ||
        title.includes("attendance") ||
        title.includes("absent") ||
        msg.includes("attendance") ||
        msg.includes("absent")
      );

    case "system":
      return (
        title.includes("student") ||
        title.includes("teacher") ||
        title.includes("updated") ||
        title.includes("deleted") ||
        title.includes("added") ||
        msg.includes("student") ||
        msg.includes("teacher") ||
        msg.includes("updated") ||
        msg.includes("deleted") ||
        msg.includes("added")
      );

    case "reports":
      return (
        title.includes("report") ||
        title.includes("marks pending") ||
        title.includes("exam finished") ||
        msg.includes("report") ||
        msg.includes("marks pending") ||
        msg.includes("exam finished")
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
      <span className="rounded-full bg-rose-500/10 dark:bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400">
        High
      </span>
    );
  if (priority === "medium")
    return (
      <span className="rounded-full bg-amber-500/10 dark:bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
        Medium
      </span>
    );
  return (
    <span className="rounded-full bg-accent-bg px-2 py-0.5 text-[10px] font-bold text-accent">
      Low
    </span>
  );
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

const PREF_FILTERS = [
  { key: "academic", label: "Academic Alerts" },
  { key: "attendance", label: "Attendance Warnings" },
  { key: "system", label: "System Updates" },
  { key: "reports", label: "Report Reminders" },
] as const;

type PrefKey = (typeof PREF_FILTERS)[number]["key"];

export default function NotificationsClient({
  initialItems,
  userId,
  initialUnreadCount,
  initialPrefs,
}: {
  initialItems: NotificationItem[];
  userId: number;
  initialUnreadCount: number;
  initialPrefs?: NotificationPreferences;
}) {
  // Only show unread items — read items are hidden from the feed
  const [items, setItems] = useState<NotificationItem[]>(
    initialItems.filter((i) => !i.isRead)
  );

  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  // Preference checkboxes — loaded from DB and saved on toggle
  const [activePrefs, setActivePrefs] = useState<Record<PrefKey, boolean>>({
    academic: initialPrefs?.academic ?? true,
    attendance: initialPrefs?.attendance ?? true,
    system: initialPrefs?.system ?? true,
    reports: initialPrefs?.reports ?? true,
  });
  const [, startTransition] = useTransition();

  const { hydrate, decrement, clearAll } = useNotificationStore();

  useEffect(() => {
    hydrate(initialUnreadCount);
  }, [hydrate, initialUnreadCount]);

  // Debounce search
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedSearch(val), 300);
  };

  // ── Compute visible items ──────────────────────────────────────────────
  const visibleItems = items.filter((item) => {
    // Priority tab filter
    if (priorityFilter !== "all") {
      const p = item.priority?.toLowerCase();
      if (priorityFilter === "low") {
        if (p !== "low" && p !== "info") return false;
      } else {
        if (p !== priorityFilter) return false;
      }
    }

    // Preference category filter (UI only — AND logic across enabled categories)
    const enabledPrefs = (Object.keys(activePrefs) as PrefKey[]).filter(
      (k) => activePrefs[k]
    );

    if (enabledPrefs.length === 0) return false;

    if (
      !enabledPrefs.some((k) =>
        matchesCategory(item, k)
      )
    ) {
      return false;
    }

    // Search
    const q = debouncedSearch.toLowerCase();
    if (q) {
      const matchSearch =
        item.title?.toLowerCase().includes(q) ||
        item.message?.toLowerCase().includes(q);
      if (!matchSearch) return false;
    }

    return true;
  });

  // Counts based on all current unread items (not just the visible filtered set)
  const countByPriority = (p: PriorityFilter) => {
    if (p === "all") return items.length;
    if (p === "low") return items.filter((i) => i.priority === "low" || i.priority === "info").length;
    return items.filter((i) => i.priority === p).length;
  };

  // ── Mark single read ───────────────────────────────────────────────────
  const handleMarkRead = async (id: number) => {
    // Remove from feed immediately
    setItems((prev) => prev.filter((i) => i.id !== id));
    decrement(1);

    try {
      await markNotificationRead(id);
    } catch {
      // Rollback — re-add the item
      const item = initialItems.find((i) => i.id === id);
      if (item) {
        setItems((prev) => [item, ...prev]);
        decrement(-1);
      }
      toast.error("Failed to mark notification as read");
    }
  };

  // ── Mark all read ──────────────────────────────────────────────────────
  const handleMarkAllRead = async () => {
    if (items.length === 0) {
      toast.info("No unread notifications");
      return;
    }

    const snapshot = [...items];
    // Remove all from feed immediately
    setItems([]);
    clearAll();

    try {
      await markAllNotificationsRead(userId);
      toast.success("All notifications marked as read");
    } catch {
      // Rollback
      setItems(snapshot);
      hydrate(snapshot.length);
      toast.error("Failed to mark all notifications as read");
    }
  };

  // ── Toggle preference filter and save to DB ───────────────────────────
  const togglePref = async (key: PrefKey) => {
    const updated = { ...activePrefs, [key]: !activePrefs[key] };
    setActivePrefs(updated);
    try {
      await saveNotificationPreferences(userId, updated);
      toast.success("Preferences saved successfully");
    } catch {
      toast.error("Failed to save notification preferences");
    }
  };

  const TABS: { id: PriorityFilter; label: string }[] = [
    { id: "all", label: "All Alerts" },
    { id: "high", label: "High" },
    { id: "medium", label: "Medium" },
    { id: "low", label: "Low" },
  ];

  return (
    <div className="space-y-8">
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">
            Notifications
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
            Notification Center
          </h1>
          <p className="mt-2 text-sm leading-6 text-secondary">
            School updates, alerts, and system messages in one place.
          </p>
        </div>
        <button
          onClick={handleMarkAllRead}
          className="rounded-xl border border-theme bg-surface px-5 py-3 text-xs font-semibold text-primary shadow-lg hover:bg-hover transition-all duration-200"
        >
          Mark All Read
        </button>
      </div>

      {/* ── Main Grid ────────────────────────────────────────────────── */}
      <section className="grid gap-8 xl:grid-cols-[1fr_320px]">
        {/* Left: Filter tabs + search + feed */}
        <div className="space-y-6">
          {/* Controls bar */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-theme bg-surface p-4 shadow-md">
            {/* Priority tabs */}
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              {TABS.map((tab) => {
                const isActive = priorityFilter === tab.id;
                const badgeColor =
                  tab.id === "high"
                    ? "bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400"
                    : tab.id === "medium"
                      ? "bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400"
                      : tab.id === "low"
                        ? "bg-accent-bg text-accent"
                        : "bg-hover text-secondary";

                return (
                  <button
                    key={tab.id}
                    onClick={() => setPriorityFilter(tab.id)}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2.5 transition duration-200 ${
                      isActive
                        ? "bg-accent-bg text-primary ring-1 ring-accent border border-accent-bg"
                        : "text-secondary hover:bg-hover hover:text-primary"
                    }`}
                  >
                    {tab.label}
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${badgeColor}`}>
                      {countByPriority(tab.id)}
                    </span>
                  </button>
                );
              })}
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
                  className="input-theme h-10 w-full sm:w-60 pl-9"
                />
              </div>
          </div>

          {/* Feed */}
          <div className="rounded-2xl border border-theme bg-surface p-6 shadow-xl">
            <div className="space-y-3.5">
              {visibleItems.map((item) => (
                <article
                  key={item.id}
                  onClick={() => handleMarkRead(item.id)}
                  className={`flex gap-4 rounded-xl p-4 transition-all duration-300 cursor-pointer hover:bg-hover ${getPriorityStyle(item.priority)} hover:border-accent`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="text-sm font-semibold text-primary truncate">
                        {item.title}
                      </h2>
                      <div className="flex items-center gap-2 shrink-0">
                        {getPriorityBadge(item.priority)}
                        <span className="rounded-full bg-hover px-2.5 py-0.5 text-[10px] font-semibold text-secondary capitalize">
                          {item.type}
                        </span>
                        <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-md" />
                      </div>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-secondary">
                      {item.message}
                    </p>
                    <p className="mt-3 text-[10px] text-muted font-medium">
                      {timeAgo(item.createdAt)}
                    </p>
                  </div>
                </article>
              ))}

              {visibleItems.length === 0 && (
                <div className="text-center py-12">
                  <svg
                    className="mx-auto h-10 w-10 text-muted"
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
                    {items.length === 0
                      ? "No unread notifications"
                      : "No matching notifications found"}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {items.length === 0
                      ? "You're all caught up!"
                      : "Try adjusting your filters or search keywords."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Preferences (UI filter panel only — no DB writes) */}
        <aside className="rounded-2xl border border-theme bg-surface p-6 shadow-xl self-start">
          <div className="border-b border-theme pb-4">
            <h2 className="text-sm font-semibold text-primary uppercase tracking-wider">
              Preferences
            </h2>
            <p className="text-xs text-secondary mt-1">
              Configure channels for local alerts feeds.
            </p>
          </div>
          <div className="mt-6 space-y-3 text-xs font-semibold text-primary">
            {PREF_FILTERS.map(({ key, label }) => (
              <label
                key={key}
                className="flex items-center justify-between rounded-xl border border-theme bg-elevated px-4 py-4 cursor-pointer hover:bg-hover transition"
              >
                <span>{label}</span>
                <input
                  type="checkbox"
                  checked={activePrefs[key]}
                  onChange={() => togglePref(key)}
                  className="h-4 w-4 cursor-pointer rounded border-theme"
                  style={{ accentColor: 'var(--accent-primary)' }}
                />
              </label>
            ))}
          </div>
        </aside>
      </section>
    </div>
  );
}
