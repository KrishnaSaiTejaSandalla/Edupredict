"use client";

import { useState, useTransition, useEffect } from "react";
import { toast } from "sonner";
import DeleteConfirmModal from "@/components/ui/DeleteConfirmModal";
import { submitLeaveRequest, deleteLeaveRequest } from "@/lib/leave-actions";

type LeaveHistory = {
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
  actionedBy: number | null;
  createdAt: Date | string;
  updatedAt: string | null;
  studentName?: string | null;
  className?: string | null;
};

type StudentLeaveRequest = {
  id: number;
  studentName: string;
  className: string;
  parentName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
};

type Props = {
  initialTeacherHistory: LeaveHistory[];
  initialStudentLeaves: StudentLeaveRequest[];
};

const inputCls = "input-theme";
const labelCls = "block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5";
const selectCls = "select-theme";

const DAY_ABBR: Record<string, string> = {
  Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed",
  Thursday: "Thu", Friday: "Fri", Saturday: "Sat",
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

function getDayName(): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[new Date().getDay()];
}

export default function TeacherLeavesClient({ initialTeacherHistory, initialStudentLeaves }: Props) {
  const [teacherHistory, setTeacherHistory] = useState<LeaveHistory[]>(initialTeacherHistory);
  const [studentLeaves, setStudentLeaves] = useState<StudentLeaveRequest[]>(initialStudentLeaves);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<"student" | "teacher">("teacher");
  const [isPending, startTransition] = useTransition();

  // Form State for Teacher Leave Request
  const [formData, setFormData] = useState({
    leaveType: "Casual Leave",
    startDate: "",
    endDate: "",
    reason: "",
  });

  // KPI calculations
  const pendingCount = teacherHistory.filter((r) => r.status === "pending").length;
  const approvedCount = teacherHistory.filter((r) => r.status === "approved").length;
  const rejectedCount = teacherHistory.filter((r) => r.status === "rejected").length;
  const totalCount = teacherHistory.length;

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<{ id: number; detail: string } | null>(null);

  // Action state for student leaves
  const [actioningLeaveId, setActioningLeaveId] = useState<number | null>(null);

  // Search and Pagination states
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewRequest, setViewRequest] = useState<LeaveHistory | null>(null);

  // Reset page when searching or switching tabs
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab]);

  const itemsPerPage = 10;

  // Filter lists based on search query
  const filteredTeacherHistory = teacherHistory.filter((row) => {
    const query = searchQuery.toLowerCase();
    return (
      row.leaveType.toLowerCase().includes(query) ||
      row.reason.toLowerCase().includes(query) ||
      row.status.toLowerCase().includes(query) ||
      formatDate(row.startDate).toLowerCase().includes(query) ||
      formatDate(row.endDate).toLowerCase().includes(query) ||
      (row.createdAt ? new Date(row.createdAt).toLocaleDateString().toLowerCase().includes(query) : false)
    );
  });

  const filteredStudentLeaves = studentLeaves.filter((leave) => {
    const query = searchQuery.toLowerCase();
    return (
      leave.studentName.toLowerCase().includes(query) ||
      leave.reason.toLowerCase().includes(query) ||
      leave.status.toLowerCase().includes(query) ||
      formatDate(leave.startDate).toLowerCase().includes(query) ||
      formatDate(leave.endDate).toLowerCase().includes(query) ||
      (leave.submittedAt ? new Date(leave.submittedAt).toLocaleDateString().toLowerCase().includes(query) : false)
    );
  });

  const totalTeacherPages = Math.ceil(filteredTeacherHistory.length / itemsPerPage);
  const totalStudentPages = Math.ceil(filteredStudentLeaves.length / itemsPerPage);

  // Adjust page automatically if pagination bounds change (e.g. deletion of last item)
  useEffect(() => {
    if (activeTab === "teacher" && currentPage > totalTeacherPages && totalTeacherPages > 0) {
      setCurrentPage(totalTeacherPages);
    }
  }, [filteredTeacherHistory.length, totalTeacherPages, currentPage, activeTab]);

  useEffect(() => {
    if (activeTab === "student" && currentPage > totalStudentPages && totalStudentPages > 0) {
      setCurrentPage(totalStudentPages);
    }
  }, [filteredStudentLeaves.length, totalStudentPages, currentPage, activeTab]);

  const startIndexTeacher = (currentPage - 1) * itemsPerPage;
  const paginatedTeacherHistory = filteredTeacherHistory.slice(
    startIndexTeacher,
    startIndexTeacher + itemsPerPage
  );

  const startIndexStudent = (currentPage - 1) * itemsPerPage;
  const paginatedStudentLeaves = filteredStudentLeaves.slice(
    startIndexStudent,
    startIndexStudent + itemsPerPage
  );

  useEffect(() => {
    // Fetch student leaves for teacher's classes
    if (activeTab === "student") {
      fetch("/api/teacher/student-leaves")
        .then(r => r.json())
        .then(data => setStudentLeaves(data || []))
        .catch(() => { });
    }
  }, [activeTab]);

  // const reloadData = async () => {
  //   if (activeTab === "teacher") {
  //     try {
  //       const res = await fetch("/api/leaves/my-requests");
  //       if (res.ok) {
  //         const data = await res.json();
  //         setTeacherHistory(data);
  //       }
  //     } catch (err) {
  //       console.error("Failed to refresh leaves history:", err);
  //     }
  //   } else {
  //     try {
  //       const res = await fetch("/api/teacher/student-leaves");
  //       if (res.ok) {
  //         const data = await res.json();
  //         setStudentLeaves(data);
  //       }
  //     } catch (err) {
  //       console.error("Failed to refresh student leaves:", err);
  //     }
  //   }
  // };

  const reloadData = async () => {
    if (activeTab === "teacher") {
      try {
        const res = await fetch("/api/leaves/my-requests", {
          cache: "no-store",
        });

        if (res.ok) {
          const data = await res.json();
          setTeacherHistory(data);
        }
      } catch (err) {
        console.error("Failed to refresh leaves history:", err);
      }
    } else {
      try {
        const res = await fetch("/api/teacher/student-leaves", {
          cache: "no-store",
        });

        if (res.ok) {
          const data = await res.json();
          setStudentLeaves(data);
        }
      } catch (err) {
        console.error("Failed to refresh student leaves:", err);
      }
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setFormData({
      leaveType: "Casual Leave",
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
        const newLeave = await submitLeaveRequest({
          leaveType: formData.leaveType,
          startDate: formData.startDate,
          endDate: formData.endDate,
          reason: formData.reason,
        });

        setTeacherHistory((prev) => [newLeave, ...prev]);

        setCurrentPage(1);
        toast.success("Leave request submitted successfully.");
        closeForm();
      } catch (err: any) {
        toast.error(err.message || "Failed to submit request.");
      }
    });
  };

  const handleDeleteClick = (req: LeaveHistory) => {
    setRequestToDelete({
      id: req.id,
      detail: `${req.leaveType} (${formatDate(req.startDate)} to ${formatDate(req.endDate)})`,
    });
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!requestToDelete) return;
    setDeleteModalOpen(false);
    startTransition(async () => {
      try {
        await deleteLeaveRequest(requestToDelete.id);

        setTeacherHistory((prev) =>
          prev.filter((leave) => leave.id !== requestToDelete.id)
        );

        toast.success("Leave request deleted successfully.");
      } catch (err: any) {
        toast.error(err.message || "Failed to delete request.");
      } finally {
        setRequestToDelete(null);
      }
    });
  };

  const handleStudentLeaveAction = async (leaveId: number, action: "approve" | "reject", remarks?: string) => {
    setActioningLeaveId(leaveId);
    try {
      const res = await fetch(`/api/teacher/student-leaves?id=${leaveId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, remarks }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      toast.success(`Leave ${action}ed successfully.`);
      await reloadData();
    } catch (err: any) {
      toast.error(err.message || `Failed to ${action} leave.`);
    } finally {
      setActioningLeaveId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Row */}
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-500 dark:text-cyan-400">
          Faculty Portal
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Leaves
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Review student leave requests and submit your own leave applications.
        </p>
      </div>

      {/* Stats Cards - Admin style */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {/* Total */}
        <div className="rounded-2xl border border-theme bg-surface p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Total Leaves</p>
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

      {/* Unified Tab and Action Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex gap-1 rounded-xl border border-subtle bg-hover p-1 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab("student")}
              className={`rounded-lg px-4 py-2 text-xs font-semibold transition flex-1 sm:flex-none text-center ${activeTab === "student"
                ? "bg-cyan-500/20 text-cyan-400 shadow-sm"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              Student Requests
            </button>
            <button
              onClick={() => setActiveTab("teacher")}
              className={`rounded-lg px-4 py-2 text-xs font-semibold transition flex-1 sm:flex-none text-center ${activeTab === "teacher"
                ? "bg-cyan-500/20 text-cyan-400 shadow-sm"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              My Leave Requests
            </button>
          </div>
        </div>

        {activeTab === "teacher" && (
          <button
            onClick={() => (showForm ? closeForm() : setShowForm(true))}
            className="rounded-xl btn-blue px-5 py-3 text-xs font-bold whitespace-nowrap w-full sm:w-auto text-center"
          >
            {showForm ? "Close Panel" : "+ Request Leave"}
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative w-full sm:w-80">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.602 10.602Z" />
          </svg>
        </span>
        <input
          type="text"
          placeholder="Search leave requests..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-10 w-full rounded-xl border border-theme bg-surface pl-9 pr-3 text-xs text-primary outline-none focus:border-cyan-500 placeholder:text-muted transition-all"
        />
      </div>

      {/* Student Leave Requests Section */}
      {activeTab === "student" && (
        <div className="space-y-4">
          {studentLeaves.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-16 text-center shadow-sm max-w-lg mx-auto">
              <div className="mx-auto h-12 w-12 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-500">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <h3 className="mt-4 text-sm font-bold text-foreground">No leave requests found.</h3>
              <p className="mt-2 text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                No leave requests found from students in your classes.
              </p>
            </div>
          ) : filteredStudentLeaves.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-16 text-center shadow-sm max-w-lg mx-auto">
              <div className="mx-auto h-12 w-12 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-500">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <h3 className="mt-4 text-sm font-bold text-foreground">No matching leave requests found.</h3>
            </div>
          ) : (
            <>
              <div className="grid gap-4">
                {paginatedStudentLeaves.map((leave) => {
                  const days = DAYS_DIFFERENCE(leave.startDate, leave.endDate);
                  return (
                    <div key={leave.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="h-10 w-10 rounded-full bg-cyan-300 flex items-center justify-center text-sm font-bold text-slate-950">
                              {leave.studentName?.split(" ").map((p: string) => p[0]).join("").slice(0, 2).toUpperCase() || "??"}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-foreground">{leave.studentName}</p>
                              <p className="text-xs text-muted-foreground">{leave.className} · Parent: {leave.parentName}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-xs">
                            <div>
                              <span className="text-muted-foreground">Type:</span>
                              <span className="ml-1 font-medium text-foreground">{leave.leaveType}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Duration:</span>
                              <span className="ml-1 font-medium text-foreground">{days} {days === 1 ? "day" : "days"}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Start:</span>
                              <span className="ml-1 font-medium text-foreground">{formatDate(leave.startDate)}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">End:</span>
                              <span className="ml-1 font-medium text-foreground">{formatDate(leave.endDate)}</span>
                            </div>
                          </div>
                          <p className="mt-2 text-xs text-secondary line-clamp-2">{leave.reason}</p>
                        </div>
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${leave.status === "approved"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : leave.status === "rejected"
                            ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          }`}>
                          {leave.status}
                        </span>
                      </div>
                      {leave.status === "pending" && (
                        <div className="mt-4 flex gap-2 justify-end">
                          <button
                            onClick={() => handleStudentLeaveAction(leave.id, "approve")}
                            disabled={actioningLeaveId === leave.id}
                            className="rounded-lg bg-emerald-500/15 hover:bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-400 transition disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              const remarks = window.prompt("Optional remarks for rejection:");
                              if (confirm("Reject this leave request?")) {
                                handleStudentLeaveAction(leave.id, "reject", remarks || undefined);
                              }
                            }}
                            disabled={actioningLeaveId === leave.id}
                            className="rounded-lg bg-rose-500/15 hover:bg-rose-500/20 px-3 py-1.5 text-xs font-semibold text-rose-400 transition disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Pagination for Student Leaves */}
              {totalStudentPages > 1 && (
                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground pt-4 border-t border-border mt-4 w-full">
                  <div>
                    {currentPage > 1 ? (
                      <button
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        className="rounded-xl border border-border bg-card px-4 py-2.5 hover:bg-hover transition duration-150 text-foreground"
                      >
                        &lt; Previous
                      </button>
                    ) : (
                      <div className="w-[100px]" />
                    )}
                  </div>
                  <span className="tabular-nums">Page {currentPage} of {totalStudentPages}</span>
                  <div>
                    {currentPage < totalStudentPages ? (
                      <button
                        onClick={() => setCurrentPage((prev) => Math.min(totalStudentPages, prev + 1))}
                        className="rounded-xl border border-border bg-card px-4 py-2.5 hover:bg-hover transition duration-150 text-foreground"
                      >
                        Next &gt;
                      </button>
                    ) : (
                      <div className="w-[100px]" />
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Teacher Leave Requests Section */}
      {activeTab === "teacher" && (
        <div className="space-y-8">
          {/* Leave Request Form */}
          {showForm && (
            <div className="rounded-2xl border border-border bg-card p-6 shadow-md animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-primary mb-6">
                New Leave Application
              </h2>
              <form onSubmit={handleSubmit} className="grid gap-5 md:grid-cols-3">
                {/* Type */}
                <div>
                  <label className={labelCls}>Leave Type *</label>
                  <select
                    value={formData.leaveType}
                    onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
                    className={selectCls}
                    required
                  >
                    <option value="Casual Leave">Casual Leave</option>
                    <option value="Sick Leave">Sick Leave</option>
                    <option value="Personal Leave">Personal Leave</option>
                    <option value="Maternity Leave">Maternity Leave</option>
                    <option value="Paternity Leave">Paternity Leave</option>
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
                    placeholder="Brief details about the time-off reason (minimum 5 characters)..."
                    className="w-full min-h-[80px] p-3 rounded-xl border border-theme bg-background text-sm text-primary outline-none focus:border-cyan-500 transition placeholder:text-muted"
                    required
                  />
                </div>

                {/* Actions */}
                <div className="md:col-span-3 flex gap-3 mt-2">
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

          {/* Leave History Table - Admin style */}
          <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-md">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="border-b border-border bg-background/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="p-4 px-6">Leave Type</th>
                  <th className="p-4 px-6">Date Range</th>
                  <th className="p-4 px-6">Duration</th>
                  <th className="p-4 px-6">Reason</th>
                  <th className="p-4 px-6">Applied On</th>
                  <th className="p-4 px-6">Status</th>
                  <th className="p-4 px-6">Admin Remarks</th>
                  <th className="p-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-subtle">
                {filteredTeacherHistory.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-sm font-medium text-muted-foreground">
                      No leave requests found.
                    </td>
                  </tr>
                ) : (
                  paginatedTeacherHistory.map((row) => {
                    const days = DAYS_DIFFERENCE(row.startDate, row.endDate);
                    const appliedOn = typeof row.createdAt === "string" ? new Date(row.createdAt).toLocaleDateString() : "";
                    return (
                      <tr key={row.id} className="hover:bg-hover transition duration-200">
                        <td className="p-4 px-6 font-semibold text-primary">{row.leaveType}</td>
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
                        <td className="p-4 px-6 text-xs text-muted font-medium">{appliedOn}</td>
                        <td className="p-4 px-6">
                          <span
                            className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[10px] font-semibold capitalize border ${row.status === "approved"
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
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setViewRequest(row)}
                              title="View Details"
                              className="rounded-lg p-1.5 text-muted-foreground hover:bg-hover hover:text-foreground transition duration-150"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteClick(row)}
                              title="Delete Request"
                              className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-500/10 transition duration-150"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination for Teacher Leaves */}
          {totalTeacherPages > 1 && (
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground pt-4 border-t border-border mt-4 w-full">
              <div>
                {currentPage > 1 ? (
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    className="rounded-xl border border-border bg-card px-4 py-2.5 hover:bg-hover transition duration-150 text-foreground"
                  >
                    &lt; Previous
                  </button>
                ) : (
                  <div className="w-[100px]" />
                )}
              </div>
              <span className="tabular-nums">Page {currentPage} of {totalTeacherPages}</span>
              <div>
                {currentPage < totalTeacherPages ? (
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(totalTeacherPages, prev + 1))}
                    className="rounded-xl border border-border bg-card px-4 py-2.5 hover:bg-hover transition duration-150 text-foreground"
                  >
                    Next &gt;
                  </button>
                ) : (
                  <div className="w-[100px]" />
                )}
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          <DeleteConfirmModal
            isOpen={deleteModalOpen}
            title="Delete Leave Request?"
            message="This action cannot be undone."
            onConfirm={confirmDelete}
            onCancel={() => {
              setDeleteModalOpen(false);
              setRequestToDelete(null);
            }}
          />

          {/* View Details Modal */}
          {viewRequest && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
                  <h3 className="text-lg font-bold text-foreground">Leave Request Details</h3>
                  <button onClick={() => setViewRequest(null)} className="text-muted-foreground hover:text-foreground">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Leave Type:</span>
                    <span className="font-semibold text-foreground">{viewRequest.leaveType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Start Date:</span>
                    <span className="font-medium text-foreground">{formatDate(viewRequest.startDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">End Date:</span>
                    <span className="font-medium text-foreground">{formatDate(viewRequest.endDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration:</span>
                    <span className="font-semibold text-foreground">
                      {DAYS_DIFFERENCE(viewRequest.startDate, viewRequest.endDate)} {DAYS_DIFFERENCE(viewRequest.startDate, viewRequest.endDate) === 1 ? "day" : "days"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Applied On:</span>
                    <span className="text-foreground">{viewRequest.createdAt ? new Date(viewRequest.createdAt).toLocaleDateString() : "—"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Status:</span>
                    <span className={`inline-flex items-center rounded-lg px-2.5 py-0.5 text-[10px] font-semibold capitalize border ${viewRequest.status === "approved"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : viewRequest.status === "rejected"
                        ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      }`}>
                      {viewRequest.status}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-border">
                    <span className="text-muted-foreground block mb-1">Reason:</span>
                    <p className="text-foreground bg-muted/30 p-2.5 rounded-lg border border-border text-xs break-words whitespace-pre-wrap">{viewRequest.reason}</p>
                  </div>
                  {viewRequest.remarks && (
                    <div className="pt-2 border-t border-border">
                      <span className="text-muted-foreground block mb-1">Admin Remarks:</span>
                      <p className="text-foreground bg-rose-500/5 p-2.5 rounded-lg border border-rose-500/10 text-xs italic break-words">{viewRequest.remarks}</p>
                    </div>
                  )}
                </div>
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setViewRequest(null)}
                    className="rounded-xl border border-border bg-muted/20 px-4 py-2 text-xs font-semibold hover:bg-muted/40 transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}