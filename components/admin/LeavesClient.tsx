"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateLeaveStatus } from "@/lib/leave-actions";

type LeaveRequest = {
  id: number;
  userId: number;
  studentId: number | null;
  leaveType: string;
  startDate: Date | string;
  endDate: Date | string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  remarks: string | null;
  actionedBy: number | null;
  createdAt: Date | string;
  userName: string;
  userRole: string;
  studentName: string | null;
  actionedByName: string | null;
};

type Props = {
  initialRequests: LeaveRequest[];
};

const formatDate = (d: Date | string) => {
  const dateObj = typeof d === "string" ? new Date(d) : d;
  return dateObj.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
};

const DAYS_DIFFERENCE = (start: Date | string, end: Date | string) => {
  const s = new Date(start);
  const e = new Date(end);
  const diffTime = Math.abs(e.getTime() - s.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays;
};

export default function LeavesClient({ initialRequests }: Props) {
  const [requests, setRequests] = useState<LeaveRequest[]>(initialRequests);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const [isPending, startTransition] = useTransition();

  // Modal processing state
  const [processingLeave, setProcessingLeave] = useState<{
    id: number;
    action: "approved" | "rejected";
    userName: string;
  } | null>(null);
  const [remarks, setRemarks] = useState("");

  const reloadData = async () => {
    try {
      const res = await fetch("/api/leaves");
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch (err) {
      console.error("Failed to refresh leave requests:", err);
    }
  };

  const handleProcessClick = (id: number, action: "approved" | "rejected", userName: string) => {
    setRemarks("");
    setProcessingLeave({ id, action, userName });
  };

  const handleConfirmProcess = () => {
    if (!processingLeave) return;
    const { id, action } = processingLeave;
    setProcessingLeave(null);

    startTransition(async () => {
      try {
        await updateLeaveStatus(id, action, remarks);
        toast.success(`Leave request has been ${action}.`);
        await reloadData();
      } catch (err: any) {
        toast.error(err.message || "Failed to process leave request.");
      }
    });
  };

  // Stats calculation
  const totalCount = requests.length;
  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;
  const rejectedCount = requests.filter((r) => r.status === "rejected").length;

  // Filters
  const filteredRequests = requests.filter((r) => {
    const matchesSearch =
      r.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.studentName && r.studentName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      r.leaveType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.reason.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    const matchesRole = roleFilter === "all" || r.userRole.toLowerCase() === roleFilter;

    return matchesSearch && matchesStatus && matchesRole;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-500 dark:text-cyan-400">
          Operations
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
          Leave Management
        </h1>
        <p className="mt-2 text-sm text-secondary">
          Review, approve, or reject leave requests submitted by teachers and parents.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {/* Total */}
        <div className="rounded-2xl border border-theme bg-surface p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Total Requests</p>
          <p className="mt-2 text-3xl font-bold text-primary">{totalCount}</p>
        </div>

        {/* Pending */}
        <div className="rounded-2xl border border-amber-500/10 bg-amber-500/5 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-500">Pending</p>
          <p className="mt-2 text-3xl font-bold text-amber-400">{pendingCount}</p>
        </div>

        {/* Approved */}
        <div className="rounded-2xl border border-emerald-500/10 bg-emerald-500/5 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-500">Approved</p>
          <p className="mt-2 text-3xl font-bold text-emerald-400">{approvedCount}</p>
        </div>

        {/* Rejected */}
        <div className="rounded-2xl border border-rose-500/10 bg-rose-500/5 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-rose-500">Rejected</p>
          <p className="mt-2 text-3xl font-bold text-rose-400">{rejectedCount}</p>
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
              placeholder="Search requests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-xl border border-theme bg-surface pl-9 pr-3 text-xs text-primary outline-none focus:border-cyan-500 placeholder:text-muted transition-all"
            />
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-xl border border-theme bg-surface px-3 text-xs text-primary outline-none focus:border-cyan-500"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-10 rounded-xl border border-theme bg-surface px-3 text-xs text-primary outline-none focus:border-cyan-500"
          >
            <option value="all">All Roles</option>
            <option value="teacher">Teacher</option>
            <option value="parent">Parent</option>
          </select>
        </div>
      </div>

      {/* Requests Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-md">
        <table className="w-full text-left text-sm text-foreground">
          <thead className="border-b border-border bg-background/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="p-4 px-6">Requester</th>
              <th className="p-4 px-6">Type</th>
              <th className="p-4 px-6">Dates</th>
              <th className="p-4 px-6">Duration</th>
              <th className="p-4 px-6">Reason</th>
              <th className="p-4 px-6">Status</th>
              <th className="p-4 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-subtle">
            {filteredRequests.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-12 text-center text-sm font-medium text-muted-foreground">
                  No leave requests found.
                </td>
              </tr>
            ) : (
              filteredRequests.map((row) => {
                const days = DAYS_DIFFERENCE(row.startDate, row.endDate);
                const showBadge =
                  row.userRole === "teacher"
                    ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                    : "bg-purple-500/10 text-purple-400 border-purple-500/20";

                return (
                  <tr key={row.id} className="hover:bg-hover transition duration-200">
                    <td className="p-4 px-6">
                      <div className="flex flex-col">
                        <span className="font-semibold text-primary">{row.userName}</span>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className={`rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${showBadge}`}>
                            {row.userRole}
                          </span>
                          {row.studentName && (
                            <span className="text-[10px] text-muted truncate max-w-[120px]" title={`On behalf of student: ${row.studentName}`}>
                              for {row.studentName}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="p-4 px-6">
                      <span className="font-medium text-primary">{row.leaveType}</span>
                    </td>

                    <td className="p-4 px-6 text-xs text-secondary">
                      <div>{formatDate(row.startDate)}</div>
                      <div className="text-[10px] text-muted">to {formatDate(row.endDate)}</div>
                    </td>

                    <td className="p-4 px-6 font-semibold text-primary">
                      {days} {days === 1 ? "day" : "days"}
                    </td>

                    <td className="p-4 px-6 max-w-xs">
                      <p className="text-xs text-secondary truncate" title={row.reason}>
                        {row.reason}
                      </p>
                    </td>

                    <td className="p-4 px-6">
                      <span
                        className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[10px] font-semibold capitalize border ${
                          row.status === "approved"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : row.status === "rejected"
                            ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>

                    <td className="p-4 px-6 text-right">
                      {row.status === "pending" ? (
                        <div className="flex items-center justify-end gap-2.5">
                          <button
                            onClick={() => handleProcessClick(row.id, "approved", row.userName)}
                            disabled={isPending}
                            className="rounded-lg bg-emerald-500/15 hover:bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-400 transition"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleProcessClick(row.id, "rejected", row.userName)}
                            disabled={isPending}
                            className="rounded-lg bg-rose-500/15 hover:bg-rose-500/20 px-3 py-1.5 text-xs font-semibold text-rose-400 transition"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-end text-[10px] text-muted">
                          <span>By {row.actionedByName || "Admin"}</span>
                          {row.remarks && (
                            <span className="italic mt-0.5 max-w-[120px] truncate" title={row.remarks}>
                              "{row.remarks}"
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Approval/Rejection remarks input Modal */}
      {processingLeave && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60">
          <div className="w-full max-w-sm rounded-2xl border border-theme bg-surface p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <h3 className="text-sm font-bold text-primary mb-2">
              Confirm {processingLeave.action === "approved" ? "Approval" : "Rejection"}
            </h3>
            <p className="text-xs text-secondary leading-relaxed mb-4">
              Enter comments or remarks for <strong>{processingLeave.userName}</strong>'s leave request (optional).
            </p>

            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Approved. Cover teachers arranged."
              className="w-full min-h-[72px] p-2.5 rounded-lg border border-theme bg-background text-xs text-primary outline-none focus:border-cyan-500 transition mb-5"
            />

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setProcessingLeave(null)}
                className="flex-1 rounded-xl border border-theme bg-hover hover:bg-surface px-4 py-2.5 text-xs font-semibold text-secondary hover:text-primary transition"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmProcess}
                className={`flex-1 rounded-xl px-4 py-2.5 text-xs font-semibold text-white transition active:scale-[0.98] ${
                  processingLeave.action === "approved"
                    ? "bg-emerald-500 hover:bg-emerald-600"
                    : "bg-rose-500 hover:bg-rose-600"
                }`}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
