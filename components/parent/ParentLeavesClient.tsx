"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import DeleteConfirmModal from "@/components/ui/DeleteConfirmModal";
import { submitLeaveRequest, deleteLeaveRequest } from "@/lib/leave-actions";

type Child = {
  studentId: number;
  name: string;
  displayClass: string;
};

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
  childrenList: Child[];
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

export default function ParentLeavesClient({ childrenList, initialHistory }: Props) {
  const [history, setHistory] = useState<LeaveRequest[]>(initialHistory);
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Form State
  const [formData, setFormData] = useState({
    studentId: childrenList[0]?.studentId.toString() || "",
    leaveType: "Sick Leave",
    startDate: "",
    endDate: "",
    reason: "",
  });

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<{ id: number; detail: string } | null>(null);

  const reloadData = async () => {
    try {
      const res = await fetch("/api/leaves/my-requests");
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error("Failed to refresh leaves history:", err);
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setFormData({
      studentId: childrenList[0]?.studentId.toString() || "",
      leaveType: "Sick Leave",
      startDate: "",
      endDate: "",
      reason: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.studentId || !formData.startDate || !formData.endDate || !formData.reason) {
      toast.error("Please fill in all required fields.");
      return;
    }

    startTransition(async () => {
      try {
        await submitLeaveRequest({
          studentId: Number(formData.studentId),
          leaveType: formData.leaveType,
          startDate: formData.startDate,
          endDate: formData.endDate,
          reason: formData.reason,
        });
        toast.success("Leave request submitted successfully.");
        closeForm();
        await reloadData();
      } catch (err: any) {
        toast.error(err.message || "Failed to submit request.");
      }
    });
  };

  const handleDeleteClick = (req: LeaveRequest) => {
    const child = childrenList.find((c) => c.studentId === req.studentId);
    setRequestToDelete({
      id: req.id,
      detail: `${req.leaveType} for ${child?.name || "Student"} (${formatDate(req.startDate)} to ${formatDate(req.endDate)})`,
    });
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!requestToDelete) return;
    setDeleteModalOpen(false);
    startTransition(async () => {
      try {
        await deleteLeaveRequest(requestToDelete.id);
        toast.success("Leave request cancelled successfully.");
        await reloadData();
      } catch (err: any) {
        toast.error(err.message || "Failed to delete request.");
      } finally {
        setRequestToDelete(null);
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* Header Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-500 dark:text-cyan-400">
            Parent Portal
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
            Student Leaves
          </h1>
          <p className="mt-2 text-sm text-secondary">
            Submit leave applications on behalf of your children and track the review progress.
          </p>
        </div>

        {childrenList.length > 0 && (
          <button
            onClick={() => (showForm ? closeForm() : setShowForm(true))}
            className="rounded-xl btn-blue px-5 py-3 text-xs font-bold whitespace-nowrap self-start sm:self-auto"
          >
            {showForm ? "Close Panel" : "+ Request Student Leave"}
          </button>
        )}
      </div>

      {/* Leave Request Form */}
      {showForm && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-md animate-in fade-in slide-in-from-bottom-2 duration-300">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-primary mb-6">
            New Time-Off Request
          </h2>
          <form onSubmit={handleSubmit} className="grid gap-5 md:grid-cols-4">
            {/* Student Select */}
            <div>
              <label className={labelCls}>Select Child *</label>
              <select
                value={formData.studentId}
                onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                className={selectCls}
                required
              >
                {childrenList.map((child) => (
                  <option key={child.studentId} value={child.studentId}>
                    {child.name} ({child.displayClass})
                  </option>
                ))}
              </select>
            </div>

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
            <div className="md:col-span-4">
              <label className={labelCls}>Reason for Leave *</label>
              <textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="Please enter a detailed explanation for this request (minimum 5 characters)..."
                className="w-full min-h-[80px] p-3 rounded-xl border border-theme bg-background text-sm text-primary outline-none focus:border-cyan-500 transition placeholder:text-muted"
                required
              />
            </div>

            {/* Actions */}
            <div className="md:col-span-4 flex gap-3 mt-2">
              <button
                type="submit"
                disabled={isPending}
                className="rounded-xl btn-emerald px-5 py-2.5 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? "Submitting..." : "Submit Application"}
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

      {/* Leave History Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-md">
        <table className="w-full text-left text-sm text-foreground animate-in fade-in duration-300">
          <thead className="border-b border-border bg-background/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="p-4 px-6">Child</th>
              <th className="p-4 px-6">Leave Type</th>
              <th className="p-4 px-6">Date Range</th>
              <th className="p-4 px-6">Duration</th>
              <th className="p-4 px-6">Reason</th>
              <th className="p-4 px-6">Status</th>
              <th className="p-4 px-6">Remarks</th>
              <th className="p-4 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-subtle">
            {history.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-12 text-center text-sm font-medium text-muted-foreground">
                  No leave requests found.
                </td>
              </tr>
            ) : (
              history.map((row) => {
                const days = DAYS_DIFFERENCE(row.startDate, row.endDate);
                const child = childrenList.find((c) => c.studentId === row.studentId);

                return (
                  <tr key={row.id} className="hover:bg-hover transition duration-200">
                    <td className="p-4 px-6 font-semibold text-primary">
                      {child?.name || `Student #${row.studentId}`}
                      <div className="text-[10px] text-muted font-normal mt-0.5">
                        {child?.displayClass || ""}
                      </div>
                    </td>
                    <td className="p-4 px-6 font-medium text-primary">{row.leaveType}</td>
                    <td className="p-4 px-6 text-xs text-secondary">
                      <div>{formatDate(row.startDate)}</div>
                      <div className="text-[10px] text-muted">to {formatDate(row.endDate)}</div>
                    </td>
                    <td className="p-4 px-6 font-semibold text-foreground">
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
                    <td className="p-4 px-6 text-xs italic text-secondary">
                      {row.remarks || "—"}
                    </td>
                    <td className="p-4 px-6 text-right">
                      {row.status === "pending" ? (
                        <button
                          onClick={() => handleDeleteClick(row)}
                          title="Cancel Leave Request"
                          className="rounded-lg bg-rose-500/10 hover:bg-rose-500/20 px-3 py-1.5 text-xs font-semibold text-rose-500 transition duration-150"
                        >
                          Cancel
                        </button>
                      ) : (
                        <span className="text-[10px] text-muted">Closed</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        title="Cancel Student Leave Request?"
        message={`Are you sure you want to cancel and delete the leave request: ${requestToDelete?.detail}? This action cannot be undone.`}
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteModalOpen(false);
          setRequestToDelete(null);
        }}
      />
    </div>
  );
}
