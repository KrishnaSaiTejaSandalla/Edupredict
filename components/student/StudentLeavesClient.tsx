"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import DeleteConfirmModal from "@/components/ui/DeleteConfirmModal";
import { submitLeaveRequest, deleteLeaveRequest } from "@/lib/leave-actions";

type LeaveRequest = {
  id: number;
  schoolId: number;
  userId: number;
  studentId: number | null;
  leaveType: string;
  startDate: Date | string;
  endDate: Date | string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  remarks: string | null;
  createdAt: Date | string;
};

type Props = {
  studentId: number;
  initialHistory: LeaveRequest[];
};

const inputCls = "input-theme";
const labelCls = "block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5";
const selectCls = "select-theme";

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

export default function StudentLeavesClient({ studentId, initialHistory }: Props) {
  const [history, setHistory] = useState<LeaveRequest[]>(initialHistory);
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Form State
  const [formData, setFormData] = useState({
    leaveType: "Sick Leave",
    startDate: "",
    endDate: "",
    reason: "",
  });

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<{ id: number; detail: string } | null>(null);
  const [viewRequest, setViewRequest] = useState<LeaveRequest | null>(null);

  const reloadData = async () => {
    try {
      const res = await fetch("/api/leaves/my-requests?t=" + Date.now(), { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        // filter requests belonging to this student
        const filtered = data.filter((r: any) => r.studentId === studentId);
        setHistory(filtered);
      }
    } catch (err) {
      console.error("Failed to refresh leaves history:", err);
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setFormData({
      leaveType: "Sick Leave",
      startDate: "",
      endDate: "",
      reason: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.startDate || !formData.endDate || !formData.reason) {
      toast.error("Please fill in all required fields.");
      return;
    }

    startTransition(async () => {
      try {
        await submitLeaveRequest({
          studentId: studentId,
          leaveType: formData.leaveType,
          startDate: formData.startDate,
          endDate: formData.endDate,
          reason: formData.reason,
        });
        toast.success("Leave request submitted successfully.");
        closeForm();
        router.refresh();
        await reloadData();
      } catch (err: any) {
        toast.error(err.message || "Failed to submit request.");
      }
    });
  };

  const handleDeleteClick = (req: LeaveRequest) => {
    setRequestToDelete({
      id: req.id,
      detail: `${req.leaveType} (${formatDate(req.startDate)} to ${formatDate(req.endDate)})`,
    });
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!requestToDelete) return;
    const deletedId = requestToDelete.id;
    setDeleteModalOpen(false);
    // Optimistic UI update
    setHistory((prev) => prev.filter((item) => item.id !== deletedId));
    startTransition(async () => {
      try {
        await deleteLeaveRequest(deletedId);
        toast.success("Leave request cancelled successfully.");
        router.refresh();
        await reloadData();
      } catch (err: any) {
        toast.error(err.message || "Failed to delete request.");
        await reloadData();
      } finally {
        setRequestToDelete(null);
      }
    });
  };

  // KPI calculations
  const pendingCount = history.filter((r) => r.status === "pending").length;
  const approvedCount = history.filter((r) => r.status === "approved").length;
  const rejectedCount = history.filter((r) => r.status === "rejected").length;
  const totalCount = history.length;

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-theme pb-6">
        <div>
          <span className="inline-flex items-center rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-[10px] font-bold text-cyan-400 uppercase tracking-wider border border-cyan-500/10">
            Time Off Requests
          </span>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-primary sm:text-3xl">
            My Leaves
          </h1>
          <p className="mt-1 text-xs text-secondary">
            Apply for personal leave requests and track reviews from class teachers or admin.
          </p>
        </div>

        <button
          onClick={() => (showForm ? closeForm() : setShowForm(true))}
          className="rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 px-5 py-3 text-xs font-bold whitespace-nowrap self-start sm:self-auto transition duration-150 active:scale-[0.98]"
        >
          {showForm ? "Close Panel" : "+ Apply for Leave"}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-theme bg-surface p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Total Requests</p>
          <p className="mt-2 text-2xl font-black text-primary">{totalCount}</p>
        </div>

        <div className="rounded-2xl border border-amber-500/10 bg-amber-500/5 p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Pending</p>
          <p className="mt-2 text-2xl font-black text-amber-400">{pendingCount}</p>
        </div>

        <div className="rounded-2xl border border-emerald-500/10 bg-emerald-500/5 p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Approved</p>
          <p className="mt-2 text-2xl font-black text-emerald-400">{approvedCount}</p>
        </div>

        <div className="rounded-2xl border border-rose-500/10 bg-rose-500/5 p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-rose-500">Rejected</p>
          <p className="mt-2 text-2xl font-black text-rose-400">{rejectedCount}</p>
        </div>
      </div>

      {/* Leave Request Form */}
      {showForm && (
        <div className="rounded-2xl border border-theme bg-surface/50 p-6 shadow-md animate-in fade-in slide-in-from-top-2 duration-200">
          <h2 className="text-xs font-bold uppercase tracking-wider text-primary mb-5">
            Submit New Leave Application
          </h2>
          <form onSubmit={handleSubmit} className="grid gap-5 md:grid-cols-3 items-end">
            {/* Type */}
            <div>
              <label className={labelCls}>Leave Type *</label>
              <select
                value={formData.leaveType}
                onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
                className={selectCls}
                required
              >
                <option value="Sick Leave">Sick Leave</option>
                <option value="Casual Leave">Casual Leave</option>
                <option value="Personal Leave">Personal Leave</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className={labelCls}>Start Date *</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className={inputCls}
                required
              />
            </div>

            {/* End Date */}
            <div>
              <label className={labelCls}>End Date *</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className={inputCls}
                required
              />
            </div>

            {/* Reason */}
            <div className="md:col-span-3">
              <label className={labelCls}>Reason for Leave *</label>
              <textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="textarea-theme resize-none"
                rows={3}
                placeholder="Please describe details of your time off request..."
                required
              />
            </div>

            {/* Submit Action */}
            <div className="md:col-span-3 flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={closeForm}
                className="rounded-xl border border-theme bg-hover px-5 py-2.5 text-xs font-bold text-primary transition active:scale-95"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 px-6 py-2.5 text-xs font-bold transition active:scale-95 disabled:opacity-50"
              >
                {isPending ? "Submitting..." : "Submit Application"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* History Feed */}
      <div className="rounded-2xl border border-theme bg-surface/50 p-6 shadow-xl backdrop-blur-md">
        <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-4">
          Request History
        </h3>

        {history.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-4xl block mb-2 filter drop-shadow">📄</span>
            <p className="text-sm font-semibold text-secondary">No leave applications found</p>
            <p className="text-xs text-muted mt-1">Submit new leave requests using the panel above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-theme text-[10px] font-bold text-secondary uppercase tracking-wider">
                  <th className="pb-3 pr-4">Applied On</th>
                  <th className="pb-3 px-4">Leave Type</th>
                  <th className="pb-3 px-4">Duration</th>
                  <th className="pb-3 px-4">Reason</th>
                  <th className="pb-3 px-4">Status</th>
                  <th className="pb-3 pl-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme/30 text-primary font-medium">
                {history.map((req) => {
                  const statusColors = {
                    pending: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
                    approved: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
                    rejected: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
                  };

                  return (
                    <tr key={req.id} className="hover:bg-hover/20 transition duration-150">
                      <td className="py-3.5 pr-4 text-muted font-normal">
                        {new Date(req.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="py-3.5 px-4 font-bold">{req.leaveType}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold">
                          {formatDate(req.startDate)} - {formatDate(req.endDate)}
                        </div>
                        <div className="text-[10px] text-muted font-normal">
                          ({DAYS_DIFFERENCE(req.startDate, req.endDate)} day{DAYS_DIFFERENCE(req.startDate, req.endDate) !== 1 ? "s" : ""})
                        </div>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs truncate" title={req.reason}>
                        {req.reason}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${statusColors[req.status] || ""}`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="py-3.5 pl-4 text-right space-x-2">
                        <button
                          onClick={() => setViewRequest(req)}
                          className="rounded-lg bg-hover border border-theme px-2.5 py-1 text-[10px] font-bold text-secondary hover:text-primary transition"
                        >
                          Details
                        </button>
                        {req.status === "pending" && (
                          <button
                            onClick={() => handleDeleteClick(req)}
                            className="rounded-lg bg-rose-500/10 border border-rose-500/25 px-2.5 py-1 text-[10px] font-bold text-rose-400 hover:bg-rose-500/20 transition"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View Detail Modal */}
      {viewRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/85 backdrop-blur-sm">
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-theme bg-surface shadow-2xl animate-in zoom-in-95 duration-200 p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-primary">Leave Application Details</h3>
            <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-muted mb-0.5">Leave Type</p>
                <p className="text-primary font-bold">{viewRequest.leaveType}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-muted mb-0.5">Status</p>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider ${
                  viewRequest.status === "approved" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                  viewRequest.status === "rejected" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                }`}>
                  {viewRequest.status}
                </span>
              </div>
              <div className="col-span-2 border-t border-theme/50 pt-2.5">
                <p className="text-[10px] uppercase font-bold tracking-wider text-muted mb-0.5">Duration</p>
                <p className="text-primary">
                  {formatDate(viewRequest.startDate)} to {formatDate(viewRequest.endDate)} ({DAYS_DIFFERENCE(viewRequest.startDate, viewRequest.endDate)} Days)
                </p>
              </div>
              <div className="col-span-2 border-t border-theme/50 pt-2.5">
                <p className="text-[10px] uppercase font-bold tracking-wider text-muted mb-0.5">Reason</p>
                <p className="text-primary font-normal leading-relaxed whitespace-pre-wrap">{viewRequest.reason}</p>
              </div>
              {viewRequest.remarks && (
                <div className="col-span-2 border-t border-theme/50 pt-2.5">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-muted mb-0.5">Remarks / Feedback</p>
                  <p className="text-primary font-bold leading-relaxed whitespace-pre-wrap">{viewRequest.remarks}</p>
                </div>
              )}
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewRequest(null)}
                className="rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 px-6 py-2.5 text-xs font-bold shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Request Confirmation */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        title="Cancel Leave Request?"
        message={`Are you sure you want to cancel this leave request: ${requestToDelete?.detail}?`}
        onConfirm={confirmDelete}
        onCancel={() => { setDeleteModalOpen(false); setRequestToDelete(null); }}
      />
    </div>
  );
}
