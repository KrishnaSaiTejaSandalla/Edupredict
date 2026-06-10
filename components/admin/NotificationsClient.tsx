"use client";

import { useState } from "react";
import { toast } from "sonner";
import { markNotificationRead, markAllNotificationsRead } from "@/lib/notification-actions";

interface NotificationItem {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: string;
  priority: string;
  isRead: boolean;
  createdAt: Date | string;
}

export default function NotificationsClient({
  initialItems,
  userId,
}: {
  initialItems: NotificationItem[];
  userId: number;
}) {
  const [items, setItems] = useState<NotificationItem[]>(initialItems);
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const handleMarkAllRead = async () => {
    // Optimistic UI update
    setItems((prev) => prev.map((item) => ({ ...item, isRead: true })));
    try {
      await markAllNotificationsRead(userId);
      toast.success("All notifications marked as read!");
    } catch (err) {
      toast.error("Failed to mark notifications as read on the server.");
      // Rollback on error if necessary (re-fetch or keep items as-is)
    }
  };

  const handleMarkSingleRead = async (id: number) => {
    const item = items.find((i) => i.id === id);
    if (!item || item.isRead) return;

    // Optimistic UI update
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, isRead: true } : i))
    );

    try {
      await markNotificationRead(id);
    } catch (err) {
      // Rollback
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, isRead: false } : i))
      );
      toast.error("Failed to mark notification as read.");
    }
  };

  const getFilteredItems = () => {
    return items.filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.message.toLowerCase().includes(searchQuery.toLowerCase());

      if (filter === "all") return matchesSearch;
      if (filter === "high") return item.priority === "high" && matchesSearch;
      if (filter === "medium") return item.priority === "medium" && matchesSearch;
      if (filter === "low") return (item.priority === "low" || item.priority === "info") && matchesSearch;

      return matchesSearch;
    });
  };

  const filtered = getFilteredItems();

  const countByPriority = (priority: string) => {
    if (priority === "all") return items.length;
    if (priority === "low") {
      return items.filter((item) => item.priority === "low" || item.priority === "info").length;
    }
    return items.filter((item) => item.priority === priority).length;
  };

  return (
    <div className="space-y-8">
      {/* Header section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-400">Notifications</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">Notification Center</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">School updates, alerts, and system messages in one place.</p>
        </div>
        <button
          onClick={handleMarkAllRead}
          className="rounded-xl border border-white/10 bg-slate-900/80 px-5 py-3 text-xs font-semibold text-white shadow-lg shadow-black/20 hover:bg-slate-800 transition-all duration-200"
        >
          Mark All Read
        </button>
      </div>

      {/* Main Grid */}
      <section className="grid gap-8 xl:grid-cols-[1fr_320px]">
        
        {/* Left Side: Filter Tabs, Search, and Feed */}
        <div className="space-y-6">
          
          {/* Controls Bar */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-white/5 bg-gradient-to-br from-slate-950/40 to-white/[0.02] p-4 shadow-md">
            
            {/* Priority Tabs */}
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              {[
                { id: "all", label: "All Alerts" },
                { id: "high", label: "High" },
                { id: "medium", label: "Medium" },
                { id: "low", label: "Low" },
              ].map((tab) => {
                const isActive = filter === tab.id;
                const badgeColor =
                  tab.id === "high"
                    ? "bg-rose-500/20 text-rose-300"
                    : tab.id === "medium"
                    ? "bg-amber-500/20 text-amber-300"
                    : tab.id === "low"
                    ? "bg-cyan-500/20 text-cyan-300"
                    : "bg-white/10 text-slate-300";

                return (
                  <button
                    key={tab.id}
                    onClick={() => setFilter(tab.id)}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2.5 transition duration-200 ${
                      isActive
                        ? "bg-cyan-400/10 text-white ring-1 ring-cyan-400/25 border border-cyan-400/10"
                        : "text-slate-400 hover:bg-white/[0.03] hover:text-white"
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

            {/* Search Input */}
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 fill-current">
                  <path d="M10 4a6 6 0 1 0 3.7 10.7l3.6 3.6 1.4-1.4-3.6-3.6A6 6 0 0 0 10 4Zm0 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z" />
                </svg>
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search alerts..."
                className="h-10 w-full sm:w-60 rounded-xl border border-white/10 bg-[#0b1020]/80 pl-9 pr-4 text-xs text-white outline-none focus:border-cyan-400/50"
              />
            </div>

          </div>

          {/* Feed List */}
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/40 to-white/[0.035] p-6 shadow-xl shadow-black/20">
            <div className="space-y-3.5">
              {filtered.map((item) => {
                const priorityIndicator =
                  item.priority === "high"
                    ? "border-l-4 border-l-rose-500 bg-rose-500/5 border-white/5"
                    : item.priority === "medium"
                    ? "border-l-4 border-l-amber-500 bg-amber-500/5 border-white/5"
                    : "border-l-4 border-l-cyan-500 bg-cyan-500/5 border-white/5";

                return (
                  <article
                    key={item.id}
                    onClick={() => handleMarkSingleRead(item.id)}
                    className={`flex gap-4 rounded-xl border p-4 transition-all duration-300 hover:bg-white/[0.01] ${priorityIndicator} ${
                      !item.isRead ? "cursor-pointer hover:border-cyan-500/35" : ""
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <h2 className="text-sm font-semibold text-white truncate group-hover:text-cyan-400 transition">
                          {item.title}
                        </h2>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="rounded-full bg-white/[0.05] px-2.5 py-0.5 text-[10px] font-semibold text-slate-400 capitalize">
                            {item.type}
                          </span>
                          {!item.isRead && (
                            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-md shadow-cyan-400/50" />
                          )}
                        </div>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-slate-400">{item.message}</p>
                      <p className="mt-3 text-[10px] text-slate-500 font-medium">
                        {typeof item.createdAt === "string"
                          ? new Date(item.createdAt).toLocaleString()
                          : item.createdAt.toLocaleString()}
                      </p>
                    </div>
                  </article>
                );
              })}

              {filtered.length === 0 && (
                <div className="text-center py-12">
                  <svg className="mx-auto h-10 w-10 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <p className="mt-4 text-sm font-semibold text-slate-500">No matching notifications found</p>
                  <p className="mt-1 text-xs text-slate-600">Try adjusting your filters or search keywords.</p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right Side: Preferences Panel */}
        <aside className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/40 to-white/[0.035] p-6 shadow-xl shadow-black/20 self-start">
          <div className="border-b border-white/5 pb-4">
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Preferences</h2>
            <p className="text-xs text-slate-500 mt-1">Configure channels for local alerts feeds.</p>
          </div>
          <div className="mt-6 space-y-3 text-xs font-semibold text-slate-300">
            {['Academic alerts', 'Attendance warnings', 'System updates', 'Report reminders'].map((label) => (
              <label
                key={label}
                className="flex items-center justify-between rounded-xl border border-white/5 bg-[#0b1020]/40 px-4 py-4 cursor-pointer hover:bg-[#0b1020]/60 transition"
              >
                <span>{label}</span>
                <input
                  type="checkbox"
                  defaultChecked
                  className="h-4.5 w-4.5 accent-cyan-400 cursor-pointer rounded border-white/10"
                />
              </label>
            ))}
          </div>
        </aside>

      </section>
    </div>
  );
}
