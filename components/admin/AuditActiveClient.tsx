"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import type { Route } from "next";
import { toast } from "sonner";
import DeleteConfirmModal from "@/components/ui/DeleteConfirmModal";

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

type PaginatedResult = {
  logs: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const MODULES = ["Academic", "Staff", "Timetable", "Leave", "Transport", "Feedback", "Settings", "System"];

function priorityBadge(p: string | null) {
  if (p === "high")   return "bg-rose-500/10 text-rose-400 border-rose-500/20";
  if (p === "medium") return "bg-amber-500/10 text-amber-400 border-amber-500/20";
  return "bg-slate-500/10 text-slate-400 border-slate-500/20";
}

function actionBadge(action: string) {
  if (action.startsWith("CREATE"))  return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
  if (action.startsWith("UPDATE"))  return "bg-amber-500/10 text-amber-400 border-amber-500/20";
  if (action.startsWith("DELETE"))  return "bg-rose-500/10 text-rose-400 border-rose-500/20";
  if (action.includes("APPROVE"))   return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  if (action.includes("REJECT"))    return "bg-rose-500/10 text-rose-400 border-rose-500/20";
  return "bg-slate-500/10 text-slate-400 border-slate-500/20";
}

function roleBadge(role: string | null) {
  if (role === "admin")   return "bg-rose-500/10 text-rose-400 border-rose-500/20";
  if (role === "teacher") return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
  if (role === "parent")  return "bg-purple-500/10 text-purple-400 border-purple-500/20";
  return "bg-slate-500/10 text-slate-400 border-slate-500/20";
}

export default function AuditActiveClient() {
  const [result, setResult]               = useState<PaginatedResult | null>(null);
  const [loading, setLoading]             = useState(true);
  const [archiving, setArchiving]         = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [search, setSearch]               = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [module, setModule]               = useState("all");
  const [actionType, setActionType]       = useState("all");
  const [role, setRole]                   = useState("all");
  const [from, setFrom]                   = useState("");
  const [to, setTo]                       = useState("");
  const [page, setPage]                   = useState(1);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (module     !== "all") params.set("module", module);
      if (actionType !== "all") params.set("actionType", actionType);
      if (role       !== "all") params.set("role", role);
      if (from) params.set("from", from);
      if (to)   params.set("to", to);

      const res = await fetch(`/api/audit-logs/active?${params.toString()}`);
      if (res.ok) setResult(await res.json());
    } catch (err) {
      console.error("Failed to load active logs:", err);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, module, actionType, role, from, to]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const resetFilters = () => {
    setSearch(""); setDebouncedSearch(""); setModule("all");
    setActionType("all"); setRole("all"); setFrom(""); setTo(""); setPage(1);
  };

  const handleArchiveConfirmed = async () => {
    setShowArchiveModal(false);
    setArchiving(true);
    try {
      const res = await fetch("/api/audit-logs/archive", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast.success(`${data.archived} record${data.archived !== 1 ? "s" : ""} moved to archive.`);
        fetchLogs();
      } else {
        toast.error(data.error ?? "Archive failed.");
      }
    } catch {
      toast.error("Archive request failed.");
    } finally {
      setArchiving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Archive confirmation modal */}
      <DeleteConfirmModal
        isOpen={showArchiveModal}
        title="Archive old audit logs?"
        message="All audit logs older than 12 months will be moved to the Archived Logs section. This cannot be undone."
        confirmLabel={archiving ? "Archiving…" : "Yes, Archive"}
        cancelLabel="Cancel"
        onConfirm={handleArchiveConfirmed}
        onCancel={() => setShowArchiveModal(false)}
      />

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-500 dark:text-cyan-400">Operations</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-primary sm:text-4xl">Active Audit Logs</h1>
          <p className="mt-2 text-sm text-secondary">Searchable history of the last 12 months. Paginated, filtered, server-side.</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setShowArchiveModal(true)}
            disabled={archiving}
            className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2.5 text-xs font-semibold text-amber-400 hover:bg-amber-500/20 transition duration-150 flex items-center gap-2 disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
            </svg>
            {archiving ? "Archiving…" : "Archive Old Logs"}
          </button>
          <button onClick={fetchLogs} title="Refresh"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-theme bg-surface text-secondary hover:bg-hover hover:text-primary transition duration-150">
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </button>
        </div>
      </div>

      {/* Sub-navigation */}
      <div className="flex items-center gap-1 rounded-xl border border-theme bg-surface p-1 w-fit">
        {[
          { label: "Recent Activity", href: "/admin/audit-logs",         active: false },
          { label: "Active Logs",     href: "/admin/audit-logs/active",  active: true  },
          { label: "Archived Logs",   href: "/admin/audit-logs/archive", active: false },
        ].map((tab) => (
          <Link key={tab.href} href={tab.href as Route}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition duration-150 ${
              tab.active ? "bg-cyan-500/10 text-cyan-400 shadow-sm" : "text-secondary hover:text-primary hover:bg-hover"
            }`}>
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-theme bg-card p-4 shadow-md">
        <div className="flex flex-wrap gap-3 items-end">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-muted" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.602 10.602Z" />
              </svg>
            </span>
            <input type="text" placeholder="Search user, action, details..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-xl border border-theme bg-surface pl-9 pr-3 text-xs text-primary outline-none focus:border-cyan-500 placeholder:text-muted transition-all" />
          </div>

          {/* Date range */}
          <div className="flex items-center gap-2">
            <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }}
              className="h-10 rounded-xl border border-theme bg-surface px-3 text-xs text-primary outline-none focus:border-cyan-500 cursor-pointer" />
            <span className="text-xs text-muted">to</span>
            <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }}
              className="h-10 rounded-xl border border-theme bg-surface px-3 text-xs text-primary outline-none focus:border-cyan-500 cursor-pointer" />
          </div>

          <select value={module} onChange={(e) => { setModule(e.target.value); setPage(1); }}
            className="h-10 rounded-xl border border-theme bg-surface px-3 text-xs text-primary outline-none focus:border-cyan-500 cursor-pointer">
            <option value="all">All Modules</option>
            {MODULES.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>

          <select value={actionType} onChange={(e) => { setActionType(e.target.value); setPage(1); }}
            className="h-10 rounded-xl border border-theme bg-surface px-3 text-xs text-primary outline-none focus:border-cyan-500 cursor-pointer">
            <option value="all">All Actions</option>
            <option value="create">Creates</option>
            <option value="update">Updates</option>
            <option value="delete">Deletions</option>
            <option value="approve">Approvals</option>
            <option value="reject">Rejections</option>
          </select>

          <select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}
            className="h-10 rounded-xl border border-theme bg-surface px-3 text-xs text-primary outline-none focus:border-cyan-500 cursor-pointer">
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="teacher">Teacher</option>
            <option value="parent">Parent</option>
            <option value="student">Student</option>
          </select>

          <button onClick={resetFilters}
            className="h-10 rounded-xl border border-theme bg-surface px-4 text-xs font-semibold text-secondary hover:text-primary hover:bg-hover transition duration-150">
            Reset
          </button>
        </div>
      </div>

      {/* Results info */}
      {result && (
        <div className="flex items-center justify-between text-xs text-muted">
          <span>{result.total.toLocaleString()} records found</span>
          <span>Page {result.page} of {result.totalPages}</span>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-md">
        {loading ? (
          <div className="p-12 text-center">
            <span className="inline-flex items-center gap-2 text-sm text-muted animate-pulse">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
              Loading logs...
            </span>
          </div>
        ) : (
          <table className="w-full text-left text-sm text-foreground">
            <thead className="border-b border-border bg-background/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-4 px-6">Timestamp</th>
                <th className="p-4 px-6">User</th>
                <th className="p-4 px-6">Module</th>
                <th className="p-4 px-6">Action</th>
                <th className="p-4 px-6">Priority</th>
                <th className="p-4 px-6">Entity</th>
                <th className="p-4 px-6">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-subtle">
              {!result || result.logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-sm font-medium text-muted-foreground">
                    No audit logs found for the selected filters.
                  </td>
                </tr>
              ) : (
                result.logs.map((log) => (
                  <tr key={log.id} className="hover:bg-hover transition duration-200">
                    <td className="p-4 px-6 text-xs text-secondary whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString([], {
                        month: "short", day: "numeric", year: "numeric",
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
                    <td className="p-4 px-6 text-xs font-medium text-secondary">{log.module ?? "—"}</td>
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
                    <td className="p-4 px-6 text-xs text-foreground whitespace-nowrap">
                      <span className="font-semibold text-secondary capitalize">{log.entityType}</span>
                      {log.entityId && <span className="text-muted ml-1">#{log.entityId}</span>}
                    </td>
                    <td className="p-4 px-6 text-xs text-secondary max-w-xs truncate" title={log.details ?? ""}>
                      {log.details || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {result && result.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-theme bg-surface text-secondary hover:bg-hover hover:text-primary disabled:opacity-40 transition">
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {Array.from({ length: Math.min(result.totalPages, 7) }, (_, i) => {
            const p = result.totalPages <= 7 ? i + 1 : Math.max(1, page - 3) + i;
            if (p > result.totalPages) return null;
            return (
              <button key={p} onClick={() => setPage(p)}
                className={`flex h-9 w-9 items-center justify-center rounded-xl border text-xs font-semibold transition ${
                  p === page
                    ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-400"
                    : "border-theme bg-surface text-secondary hover:bg-hover hover:text-primary"
                }`}>
                {p}
              </button>
            );
          })}

          <button onClick={() => setPage((p) => Math.min(result.totalPages, p + 1))} disabled={page === result.totalPages}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-theme bg-surface text-secondary hover:bg-hover hover:text-primary disabled:opacity-40 transition">
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
