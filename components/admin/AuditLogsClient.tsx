"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";

type AuditLog = {
  id: number;
  userId: number;
  action: string;
  entityType: string;
  entityId: number | null;
  details: string | null;
  priority: string | null;
  module: string | null;
  userRole: string | null;
  createdAt: Date | string;
  userName: string;
};

type Stats = {
  today: number;
  week: number;
  critical: number;
  total: number;
};

type Props = {
  initialLogs: AuditLog[];
  stats: Stats;
};

const MODULES = ["Academic", "Staff", "Timetable", "Leave", "Transport", "Feedback", "Settings", "System"];

function priorityBadge(priority: string | null) {
  if (priority === "high")   return "bg-rose-500/10 text-rose-400 border-rose-500/20";
  if (priority === "medium") return "bg-amber-500/10 text-amber-400 border-amber-500/20";
  return "bg-slate-500/10 text-slate-400 border-slate-500/20";
}

function actionBadge(action: string) {
  if (action.startsWith("CREATE"))  return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
  if (action.startsWith("UPDATE"))  return "bg-amber-500/10 text-amber-400 border-amber-500/20";
  if (action.startsWith("DELETE"))  return "bg-rose-500/10 text-rose-400 border-rose-500/20";
  if (action.includes("APPROVED") || action.includes("APPROVE")) return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  if (action.includes("REJECTED") || action.includes("REJECT"))  return "bg-rose-500/10 text-rose-400 border-rose-500/20";
  return "bg-slate-500/10 text-slate-400 border-slate-500/20";
}

function roleBadge(role: string | null) {
  if (role === "admin")   return "bg-rose-500/10 text-rose-400 border-rose-500/20";
  if (role === "teacher") return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
  if (role === "parent")  return "bg-purple-500/10 text-purple-400 border-purple-500/20";
  return "bg-slate-500/10 text-slate-400 border-slate-500/20";
}

export default function AuditLogsClient({ initialLogs, stats }: Props) {
  const [logs, setLogs] = useState<AuditLog[]>(initialLogs);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  const reload = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/audit-logs");
      if (res.ok) setLogs(await res.json());
    } catch (err) {
      console.error("Failed to refresh:", err);
    } finally {
      setRefreshing(false);
    }
  };

  const filtered = logs.filter((log) => {
    const search = searchQuery.toLowerCase();
    const matchesSearch =
      log.userName.toLowerCase().includes(search) ||
      log.action.toLowerCase().includes(search) ||
      (log.details && log.details.toLowerCase().includes(search)) ||
      log.entityType.toLowerCase().includes(search);

    const matchesAction =
      actionFilter === "all" ||
      (actionFilter === "create"  && log.action.startsWith("CREATE")) ||
      (actionFilter === "update"  && log.action.startsWith("UPDATE")) ||
      (actionFilter === "delete"  && log.action.startsWith("DELETE")) ||
      (actionFilter === "process" && (log.action.includes("APPROVED") || log.action.includes("REJECTED")));

    const matchesModule = moduleFilter === "all" || log.module === moduleFilter;
    const matchesRole   = roleFilter   === "all" || log.userRole?.toLowerCase() === roleFilter;

    return matchesSearch && matchesAction && matchesModule && matchesRole;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-500 dark:text-cyan-400">
            Operations
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
            System Audit Logs
          </h1>
          <p className="mt-2 text-sm text-secondary">
            Read-only chronological trail of the last 100 administrative and operational changes.
          </p>
        </div>
        <button
          onClick={reload}
          disabled={refreshing}
          className="rounded-xl border border-theme bg-surface hover:bg-hover px-4 py-2.5 text-xs font-semibold text-primary transition duration-150 flex items-center gap-1.5 self-start sm:self-auto disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" className={`h-4 w-4 fill-none stroke-current ${refreshing ? "animate-spin" : ""}`} strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Activity Today",  value: stats.today,    color: "text-cyan-400" },
          { label: "This Week",        value: stats.week,     color: "text-emerald-400" },
          { label: "Critical Changes", value: stats.critical, color: "text-rose-400" },
          { label: "Total Logged",     value: stats.total,    color: "text-purple-400" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-theme bg-card p-5 shadow-md">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">{s.label}</p>
            <p className={`mt-3 text-3xl font-bold ${s.color}`}>{s.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Sub-navigation */}
      <div className="flex items-center gap-1 rounded-xl border border-theme bg-surface p-1 w-fit">
        {[
          { label: "Recent Activity", href: "/admin/audit-logs",         active: true  },
          { label: "Active Logs",     href: "/admin/audit-logs/active",  active: false },
          { label: "Archived Logs",   href: "/admin/audit-logs/archive", active: false },
        ].map((tab) => (
          <Link
            key={tab.href}
            href={tab.href as Route}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition duration-150 ${
              tab.active
                ? "bg-cyan-500/10 text-cyan-400 shadow-sm"
                : "text-secondary hover:text-primary hover:bg-hover"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center border-b border-theme pb-4 flex-wrap">
        <div className="relative w-full sm:w-64">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-muted" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.602 10.602Z" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-full rounded-xl border border-theme bg-surface pl-9 pr-3 text-xs text-primary outline-none focus:border-cyan-500 placeholder:text-muted transition-all"
          />
        </div>

        <select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)}
          className="h-10 rounded-xl border border-theme bg-surface px-3 text-xs text-primary outline-none focus:border-cyan-500 cursor-pointer">
          <option value="all">All Modules</option>
          {MODULES.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>

        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}
          className="h-10 rounded-xl border border-theme bg-surface px-3 text-xs text-primary outline-none focus:border-cyan-500 cursor-pointer">
          <option value="all">All Actions</option>
          <option value="create">Creates</option>
          <option value="update">Updates</option>
          <option value="delete">Deletions</option>
          <option value="process">Approvals / Rejections</option>
        </select>

        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
          className="h-10 rounded-xl border border-theme bg-surface px-3 text-xs text-primary outline-none focus:border-cyan-500 cursor-pointer">
          <option value="all">All Roles</option>
          <option value="admin">Admin</option>
          <option value="teacher">Teacher</option>
          <option value="parent">Parent</option>
          <option value="student">Student</option>
        </select>

        {filtered.length !== logs.length && (
          <span className="text-xs text-muted">
            Showing {filtered.length} of {logs.length}
          </span>
        )}
      </div>

      {/* Logs Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-md">
        <table className="w-full text-left text-sm text-foreground animate-in fade-in duration-300">
          <thead className="border-b border-border bg-background/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="p-4 px-6">Timestamp</th>
              <th className="p-4 px-6">User</th>
              <th className="p-4 px-6">Module</th>
              <th className="p-4 px-6">Action</th>
              <th className="p-4 px-6">Priority</th>
              <th className="p-4 px-6">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-subtle">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-12 text-center text-sm font-medium text-muted-foreground">
                  No system logs found matching criteria.
                </td>
              </tr>
            ) : (
              filtered.map((log) => (
                <tr key={log.id} className="hover:bg-hover transition duration-200">
                  <td className="p-4 px-6 text-xs text-secondary whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString([], {
                      month: "short", day: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </td>
                  <td className="p-4 px-6">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-primary">{log.userName}</span>
                      <span className={`rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider border ${roleBadge(log.userRole)}`}>
                        {log.userRole ?? "system"}
                      </span>
                    </div>
                  </td>
                  <td className="p-4 px-6">
                    <span className="text-xs font-medium text-secondary">{log.module ?? "—"}</span>
                  </td>
                  <td className="p-4 px-6">
                    <span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${actionBadge(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="p-4 px-6">
                    {log.priority ? (
                      <span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${priorityBadge(log.priority)}`}>
                        {log.priority}
                      </span>
                    ) : <span className="text-muted">—</span>}
                  </td>
                  <td className="p-4 px-6 text-xs text-secondary max-w-xs truncate" title={log.details ?? ""}>
                    {log.details || "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
