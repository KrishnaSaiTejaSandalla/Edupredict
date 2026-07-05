"use client";

import { useState, useTransition, useEffect } from "react";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import DeleteConfirmModal from "@/components/ui/DeleteConfirmModal";
import { submitLeaveRequest, deleteLeaveRequest } from "@/lib/leave-actions";

type Child = {
  studentId: number;
  name: string;
  displayClass: string;
};

type AttendanceRecord = {
  id: number;
  attendanceDate: string;
  status: "present" | "absent" | "late" | "half_day" | "leave";
  remarks: string | null;
};

type LeaveRequest = {
  id: number;
  schoolId: number;
  userId: number;
  studentId: number | null;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  remarks: string | null;
  createdAt: string;
};

type Props = {
  childrenList: Child[];
  selectedStudent: Child;
  initialAttendance: AttendanceRecord[];
  initialLeaves: LeaveRequest[];
};

const inputCls = "h-10 w-full rounded-xl border border-theme bg-surface px-3 text-xs text-primary outline-none focus:border-cyan-500 transition placeholder:text-muted";
const selectCls = "h-10 rounded-xl border border-theme bg-surface px-3 text-xs text-primary outline-none focus:border-cyan-500 transition";
const labelCls = "block text-[10px] font-bold uppercase tracking-wider text-secondary mb-1";

const DAYS_DIFFERENCE = (start: Date | string, end: Date | string) => {
  const s = new Date(start);
  const e = new Date(end);
  const diffTime = Math.abs(e.getTime() - s.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays;
};

export default function ParentAttendanceClient({
  childrenList,
  selectedStudent,
  initialAttendance,
  initialLeaves,
}: Props) {
  const [activeTab, setActiveTab] = useState<"history" | "leaves">("history");
  const [attendanceList] = useState<AttendanceRecord[]>(initialAttendance);
  const [leavesList, setLeavesList] = useState<LeaveRequest[]>(initialLeaves);

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [monthFilter, setMonthFilter] = useState("all");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Leave Form State
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [leaveFormData, setLeaveFormData] = useState({
    leaveType: "Sick Leave",
    startDate: "",
    endDate: "",
    reason: "",
  });

  // Leave Delete / View Modal States
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [leaveToDelete, setLeaveToDelete] = useState<{ id: number; desc: string } | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [leaveToView, setLeaveToView] = useState<LeaveRequest | null>(null);

  // Fetch updated leave data (studentId filtered)
  const reloadLeaves = async () => {
    try {
      const res = await fetch(`/api/leaves/my-requests?studentId=${selectedStudent.studentId}`);
      if (res.ok) {
        const data = await res.json();
        setLeavesList(data.map((r: any) => ({
          ...r,
          startDate: typeof r.startDate === "string" ? r.startDate : new Date(r.startDate).toISOString().split("T")[0],
          endDate: typeof r.endDate === "string" ? r.endDate : new Date(r.endDate).toISOString().split("T")[0],
          createdAt: typeof r.createdAt === "string" ? r.createdAt : new Date(r.createdAt).toISOString(),
        })));
      }
    } catch (err) {
      console.error("Failed to reload leaves", err);
    }
  };

  // Poll leaves updates every 5 seconds
  useEffect(() => {
    reloadLeaves();
    const interval = setInterval(reloadLeaves, 5000);
    return () => clearInterval(interval);
  }, [selectedStudent.studentId]);

  // 1. Calculate Attendance Statistics
  const totalDays = attendanceList.length;
  const presentDays = attendanceList.filter((r) => r.status === "present").length;
  const absentDays = attendanceList.filter((r) => r.status === "absent").length;
  const lateDays = attendanceList.filter((r) => r.status === "late").length;
  const leaveDays = attendanceList.filter((r) => r.status === "leave").length;
  const halfDays = attendanceList.filter((r) => r.status === "half_day").length;
  const workingDays = totalDays - leaveDays;
  const presentWeight = presentDays + halfDays * 0.5;
  const attendanceRate = workingDays > 0 ? Math.round((presentWeight / workingDays) * 100) : 0;

  // 2. Filter Attendance History
  const filteredAttendance = attendanceList.filter((row) => {
    const matchesSearch = row.remarks?.toLowerCase().includes(searchQuery.toLowerCase()) || row.status.toLowerCase().includes(searchQuery.toLowerCase());

    // Month filter
    let matchesMonth = true;
    if (monthFilter !== "all") {
      const rowMonth = row.attendanceDate.substring(0, 7); // "YYYY-MM"
      matchesMonth = rowMonth === monthFilter;
    }

    // Date range filter
    let matchesRange = true;
    if (startDateFilter) {
      matchesRange = matchesRange && row.attendanceDate >= startDateFilter;
    }
    if (endDateFilter) {
      matchesRange = matchesRange && row.attendanceDate <= endDateFilter;
    }

    return matchesSearch && matchesMonth && matchesRange;
  });

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, monthFilter, startDateFilter, endDateFilter]);

  const totalPages = Math.ceil(filteredAttendance.length / itemsPerPage) || 1;
  const paginatedAttendance = filteredAttendance.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // 3. Calendar Month Selection & Recalculation
  const [calendarYearMonth, setCalendarYearMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`; // "YYYY-MM"
  });

  // Monthly stats recalculator
  const getMonthlyStats = () => {
    const [yearStr, monthStr] = calendarYearMonth.split("-");
    const targetMonth = `${yearStr}-${monthStr}`; // "YYYY-MM"
    const monthlyRecords = attendanceList.filter(
      (r) => r.attendanceDate.substring(0, 7) === targetMonth
    );
    const total = monthlyRecords.length;
    const present = monthlyRecords.filter((r) => r.status === "present").length;
    const late = monthlyRecords.filter((r) => r.status === "late").length;
    const absent = monthlyRecords.filter((r) => r.status === "absent").length;
    const leave = monthlyRecords.filter((r) => r.status === "leave").length;
    const halfDay = monthlyRecords.filter((r) => r.status === "half_day").length;
    const workingDays = total - leave;
    const presentWeight = present + halfDay * 0.5;
    const rate = workingDays > 0 ? Math.round((presentWeight / workingDays) * 100) : 0;

    const monthName = new Date(Number(yearStr), Number(monthStr) - 1, 1).toLocaleString("default", { month: "long" });
    return { monthName, rate, present, late, absent, total, leave, halfDay };
  };

  const monthlyStats = getMonthlyStats();

  const getCalendarDays = () => {
    const [yearStr, monthStr] = calendarYearMonth.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr) - 1; // 0-indexed

    const firstDayOfMonth = new Date(year, month, 1).getDay(); // Sun = 0
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

    const daysArray: { day: number; record?: AttendanceRecord; isCurrentMonth: boolean }[] = [];

    // Convert Sun=0, Mon=1, ..., Sat=6 to Mon=0, Tue=1, ..., Sun=6
    const offset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
    for (let i = 0; i < offset; i++) {
      daysArray.push({ day: 0, isCurrentMonth: false });
    }

    // Days of month
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateString = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const record = attendanceList.find((r) => r.attendanceDate === dateString);
      daysArray.push({ day: d, record, isCurrentMonth: true });
    }

    return daysArray;
  };

  const getMonthOptions = () => {
    const months = new Set<string>();
    attendanceList.forEach((r) => {
      months.add(r.attendanceDate.substring(0, 7));
    });
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  };

  const getTrendData = () => {
    const monthGroups: Record<string, { present: number; total: number }> = {};
    attendanceList.forEach((r) => {
      const m = r.attendanceDate.substring(0, 7); // "YYYY-MM"
      if (!monthGroups[m]) monthGroups[m] = { present: 0, total: 0 };
      if (r.status !== "leave") {
        monthGroups[m].total++;
        if (r.status === "present") {
          monthGroups[m].present++;
        } else if (r.status === "half_day") {
          monthGroups[m].present += 0.5;
        }
      }
    });

    return Object.entries(monthGroups)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([monthStr, val]) => {
        const [y, m] = monthStr.split("-");
        const monthName = new Date(Number(y), Number(m) - 1, 1).toLocaleString("default", { month: "short" });
        return {
          month: monthName,
          rate: val.total > 0 ? Math.round((val.present / val.total) * 100) : 0,
        };
      });
  };

  // Submit Leave Action
  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveFormData.startDate || !leaveFormData.endDate || !leaveFormData.reason) {
      toast.error("Please fill out all required fields.");
      return;
    }

    startTransition(async () => {
      try {
        await submitLeaveRequest({
          studentId: selectedStudent.studentId,
          leaveType: leaveFormData.leaveType,
          startDate: leaveFormData.startDate,
          endDate: leaveFormData.endDate,
          reason: leaveFormData.reason,
        });
        toast.success("Leave request submitted successfully.");
        setShowLeaveForm(false);
        setLeaveFormData({
          leaveType: "Sick Leave",
          startDate: "",
          endDate: "",
          reason: "",
        });
        await reloadLeaves();
      } catch (err: any) {
        toast.error(err.message || "Failed to submit leave request.");
      }
    });
  };

  // Delete Leave Action
  const handleCancelClick = (row: LeaveRequest) => {
    setLeaveToDelete({
      id: row.id,
      desc: `${row.leaveType} (${row.startDate} to ${row.endDate})`,
    });
    setDeleteModalOpen(true);
  };

  const confirmCancelLeave = async () => {
    if (!leaveToDelete) return;
    setDeleteModalOpen(false);
    startTransition(async () => {
      try {
        await deleteLeaveRequest(leaveToDelete.id);
        toast.success("Leave request deleted successfully.");
        await reloadLeaves();
      } catch (err: any) {
        toast.error(err.message || "Failed to delete request.");
      } finally {
        setLeaveToDelete(null);
      }
    });
  };

  const handleViewClick = (row: LeaveRequest) => {
    setLeaveToView(row);
    setViewModalOpen(true);
  };

  const formatDate = (d: string) => {
    const dateObj = new Date(d);
    return dateObj.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-400">
            Academics
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
            Attendance &amp; Leaves
          </h1>
          <p className="mt-2 text-sm text-secondary">
            Monitor attendance stats, review monthly records, and apply for leaves for {selectedStudent.name}.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex rounded-xl bg-hover p-1 self-start sm:self-auto border border-theme">
          <button
            onClick={() => setActiveTab("history")}
            className={`rounded-lg px-4 py-2 text-xs font-bold transition duration-150 ${activeTab === "history"
                ? "bg-surface text-cyan-400 shadow-md ring-1 ring-cyan-500/10"
                : "text-muted hover:text-primary"
              }`}
          >
            Attendance Calendar &amp; logs
          </button>
          <button
            onClick={() => setActiveTab("leaves")}
            className={`rounded-lg px-4 py-2 text-xs font-bold transition duration-150 ${activeTab === "leaves"
                ? "bg-surface text-cyan-400 shadow-md ring-1 ring-cyan-500/10"
                : "text-muted hover:text-primary"
              }`}
          >
            Leave Applications
          </button>
        </div>
      </div>

      {/* Attendance Summary Metrics */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Overall Rate", value: `${attendanceRate}%`, desc: "Total classes present", color: "text-cyan-500", bg: "bg-cyan-500/10" },
          { label: "Present Days", value: presentDays, desc: "Days in class", color: "text-emerald-500", bg: "bg-emerald-500/10" },
          { label: "Absent Days", value: absentDays, desc: "Excused/Unexcused", color: "text-rose-500", bg: "bg-rose-500/10" },
          { label: "Late entries", value: lateDays, desc: "Tardy classes", color: "text-amber-500", bg: "bg-amber-500/10" },
        ].map((card, idx) => (
          <div key={idx} className="rounded-2xl border border-theme bg-surface p-5 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{card.label}</p>
            <p className={`mt-2 text-3xl font-black ${card.color}`}>{card.value}</p>
            <p className="text-[10px] text-muted mt-0.5">{card.desc}</p>
          </div>
        ))}
      </div>

      {/* Main Tabs Container */}
      {activeTab === "history" ? (
        <div className="space-y-8">
          {/* Calendar & Trend Grid */}
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Compact Visual Calendar & Overview (lg:col-span-5) */}
            <div className="lg:col-span-5 space-y-6 flex flex-col items-center">
              {/* Monthly Calendar Grid Card */}
              <div className="rounded-3xl border border-theme bg-surface p-5 shadow-md max-w-sm w-full">
                <div className="flex justify-between items-center pb-3 border-b border-subtle">
                  <h3 className="text-xs font-bold text-primary">Monthly Attendance Grid</h3>
                  <input
                    type="month"
                    value={calendarYearMonth}
                    onChange={(e) => setCalendarYearMonth(e.target.value)}
                    className="rounded-xl border border-theme bg-base px-2.5 py-1 text-[11px] font-semibold text-primary outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Grid Header */}
                <div className="grid grid-cols-7 gap-1 mt-4 text-center text-[9px] font-bold uppercase text-muted tracking-wider">
                  {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((day) => (
                    <div key={day} className="py-1">{day}</div>
                  ))}
                </div>

                {/* Compact Grid Cells */}
                <div className="grid grid-cols-7 gap-1 mt-1.5 justify-items-center">
                  {getCalendarDays().map((cell, idx) => {
                    if (cell.day === 0) {
                      return <div key={`empty-${idx}`} className="h-8 w-8 sm:h-9 sm:w-9" />;
                    }

                    let bgCls = "bg-hover/20 hover:bg-hover/40 text-muted";
                    let borderCls = "border-transparent";

                    if (cell.record) {
                      if (cell.record.status === "present") {
                        bgCls = "bg-emerald-500/10 text-emerald-400";
                        borderCls = "border-emerald-500/20";
                      } else if (cell.record.status === "absent") {
                        bgCls = "bg-rose-500/10 text-rose-400";
                        borderCls = "border-rose-500/20";
                      } else if (cell.record.status === "half_day" || cell.record.status === "late") {
                        bgCls = "bg-amber-500/10 text-amber-400";
                        borderCls = "border-amber-500/20";
                      } else if (cell.record.status === "leave") {
                        bgCls = "bg-blue-500/10 text-blue-400";
                        borderCls = "border-blue-500/20";
                      }
                    }

                    return (
                      <div
                        key={`day-${cell.day}`}
                        className={`h-8 w-8 sm:h-9 sm:w-9 flex flex-col items-center justify-center rounded-lg border text-xs font-semibold ${bgCls} ${borderCls} transition-all duration-200 cursor-pointer`}
                        title={cell.record?.remarks || `Day ${cell.day}`}
                      >
                        <span>{cell.day}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Monthly Overview Card */}
              <div className="rounded-3xl border border-theme bg-surface p-5 shadow-md flex items-center justify-between gap-4 max-w-sm w-full">
                <div className="space-y-1.5">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted">
                    {monthlyStats.monthName} Status
                  </p>
                  <h4 className="text-sm font-bold text-primary">Monthly Overview</h4>
                  <div className="text-[10px] text-secondary font-semibold space-y-0.5 leading-relaxed">
                    <p>Present Days: <span className="text-emerald-400 font-bold">{monthlyStats.present}</span></p>
                    <p>Absent Days: <span className="text-rose-400 font-bold">{monthlyStats.absent}</span></p>
                    <p>Leave Days: <span className="text-cyan-400 font-bold">{monthlyStats.leave}</span></p>
                  </div>
                </div>

                <div className="relative h-16 w-16 flex items-center justify-center shrink-0">
                  <svg className="absolute transform -rotate-90 w-full h-full" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="rgba(255,255,255,0.06)"
                      strokeWidth="8"
                      fill="transparent"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="#22d3ee"
                      strokeWidth="8"
                      strokeDasharray={`${2.512 * monthlyStats.rate} ${251.2 - 2.512 * monthlyStats.rate}`}
                      strokeLinecap="round"
                      fill="transparent"
                    />
                  </svg>
                  <span className="text-xs font-black text-primary">{monthlyStats.rate}%</span>
                </div>
              </div>
            </div>

            {/* Right Column: Expanded Trend Chart (lg:col-span-7) */}
            <div className="lg:col-span-7 rounded-3xl border border-theme bg-surface p-6 shadow-md flex flex-col justify-between min-h-[360px]">
              <div>
                <h3 className="text-sm font-bold text-primary pb-3 border-b border-subtle">
                  Attendance Retention Trend
                </h3>
              </div>

              <div className="h-72 w-full mt-6">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={getTrendData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} style={{ fontSize: "10px", fill: "var(--text-muted)" }} />
                    <YAxis domain={[0, 100]} tickLine={false} axisLine={false} style={{ fontSize: "10px", fill: "var(--text-muted)" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(15, 23, 42, 0.9)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "12px",
                        color: "#fff",
                        fontSize: "12px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="rate"
                      stroke="#06b6d4"
                      strokeWidth={3}
                      dot={{ r: 4, stroke: "#06b6d4", strokeWidth: 2, fill: "#0f172a" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Filters Bar & History Table */}
          <div className="space-y-4">
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
                    placeholder="Search logs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-10 w-full rounded-xl border border-theme bg-surface pl-9 pr-3 text-xs text-primary outline-none focus:border-cyan-500 placeholder:text-muted transition-all"
                  />
                </div>

                {/* Month Dropdown */}
                <select
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                  className={selectCls}
                >
                  <option value="all">All Months</option>
                  {getMonthOptions().map((m) => {
                    const [y, mm] = m.split("-");
                    const date = new Date(Number(y), Number(mm) - 1, 1);
                    const label = date.toLocaleString("default", { month: "long", year: "numeric" });
                    return (
                      <option key={m} value={m}>
                        {label}
                      </option>
                    );
                  })}
                </select>

                {/* Date range selection */}
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={startDateFilter}
                    onChange={(e) => setStartDateFilter(e.target.value)}
                    className="h-10 rounded-xl border border-theme bg-surface px-3 text-xs text-primary outline-none focus:border-cyan-500"
                  />
                  <span className="text-xs text-muted">to</span>
                  <input
                    type="date"
                    value={endDateFilter}
                    onChange={(e) => setEndDateFilter(e.target.value)}
                    className="h-10 rounded-xl border border-theme bg-surface px-3 text-xs text-primary outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>

            {/* Attendance Logs Table */}
            <div className="overflow-x-auto rounded-2xl border border-theme bg-surface shadow-md">
              <table className="w-full min-w-[700px] text-left text-xs">
                <thead className="border-b border-subtle bg-hover/20 text-[10px] font-bold uppercase tracking-wider text-muted">
                  <tr>
                    <th className="p-4 px-6">Attendance Date</th>
                    <th className="p-4 px-6">Status State</th>
                    <th className="p-4 px-6">Remarks Overview</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-subtle font-medium text-secondary">
                  {paginatedAttendance.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-12 text-center text-sm text-muted">
                        No logs matched these filter parameters.
                      </td>
                    </tr>
                  ) : (
                    paginatedAttendance.map((row) => (
                      <tr key={row.id} className="hover:bg-hover/10 transition">
                        <td className="p-4 px-6 text-primary font-bold">
                          {formatDate(row.attendanceDate)}
                        </td>
                        <td className="p-4 px-6">
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${row.status === "present"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : row.status === "absent"
                                  ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                  : row.status === "leave"
                                    ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                    : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              }`}
                          >
                            ● {row.status === "half_day" ? "half day" : row.status}
                          </span>
                        </td>
                        <td className="p-4 px-6 max-w-xs truncate italic">
                          {row.remarks || "No teacher remarks recorded."}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between text-xs font-semibold text-muted pt-4 border-t border-theme">
                <div>
                  {currentPage > 1 && (
                    <button
                      onClick={() => setCurrentPage((p) => p - 1)}
                      className="rounded-xl border border-theme bg-surface px-4 py-2 hover:bg-hover transition"
                    >
                      ← Previous
                    </button>
                  )}
                </div>
                <span>
                  Page {currentPage} of {totalPages} ({filteredAttendance.length} records)
                </span>
                <div>
                  {currentPage < totalPages && (
                    <button
                      onClick={() => setCurrentPage((p) => p + 1)}
                      className="rounded-xl border border-theme bg-surface px-4 py-2 hover:bg-hover transition"
                    >
                      Next →
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Leaves Subheading & Add Button */}
          <div className="flex justify-between items-center pb-4 border-b border-theme">
            <div>
              <h3 className="text-base font-bold text-primary">Time-Off Requests</h3>
              <p className="text-xs text-secondary mt-1">Submit applications and monitor approval statuses.</p>
            </div>
            <button
              onClick={() => setShowLeaveForm(!showLeaveForm)}
              className="rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 px-4 py-2.5 text-xs font-bold transition"
            >
              {showLeaveForm ? "Close Panel" : "+ Apply for Leave"}
            </button>
          </div>

          {/* Time-off Form */}
          {showLeaveForm && (
            <div className="rounded-3xl border border-theme bg-surface p-6 shadow-md">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-6">
                Apply for Student Time-Off
              </h4>
              <form onSubmit={handleLeaveSubmit} className="grid gap-5 md:grid-cols-3">
                {/* Leave Type */}
                <div>
                  <label className={labelCls}>Leave Type *</label>
                  <select
                    value={leaveFormData.leaveType}
                    onChange={(e) => setLeaveFormData({ ...leaveFormData, leaveType: e.target.value })}
                    className={selectCls}
                    required
                  >
                    <option value="Sick Leave">Sick Leave</option>
                    <option value="Casual Leave">Casual Leave</option>
                    <option value="Medical Leave">Medical Leave</option>
                    <option value="Personal Leave">Personal Leave</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Start Date */}
                <div>
                  <label className={labelCls}>Start Date *</label>
                  <input
                    type="date"
                    value={leaveFormData.startDate}
                    onChange={(e) => setLeaveFormData({ ...leaveFormData, startDate: e.target.value })}
                    className={inputCls}
                    required
                  />
                </div>

                {/* End Date */}
                <div>
                  <label className={labelCls}>End Date *</label>
                  <input
                    type="date"
                    value={leaveFormData.endDate}
                    onChange={(e) => setLeaveFormData({ ...leaveFormData, endDate: e.target.value })}
                    className={inputCls}
                    required
                  />
                </div>

                {/* Reason */}
                <div className="md:col-span-3">
                  <label className={labelCls}>Reason for Leave *</label>
                  <textarea
                    value={leaveFormData.reason}
                    onChange={(e) => setLeaveFormData({ ...leaveFormData, reason: e.target.value })}
                    placeholder="Provide a detailed explanation (e.g. fever diagnosis, family wedding travel, etc.)..."
                    className="w-full min-h-[90px] p-3 rounded-xl border border-theme bg-base text-xs text-primary outline-none focus:border-cyan-500 transition placeholder:text-muted"
                    required
                  />
                </div>

                {/* Form CTA Buttons */}
                <div className="md:col-span-3 flex gap-3">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 px-5 py-2.5 text-xs font-bold disabled:opacity-50 transition"
                  >
                    {isPending ? "Submitting..." : "Send Request"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLeaveForm(false)}
                    className="rounded-xl border border-theme bg-surface px-5 py-2.5 text-xs font-bold text-primary hover:bg-hover transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Time-Off Requests Card Layout Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {leavesList.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-dashed border-theme p-12 text-center text-sm font-medium text-muted">
                No leave requests found for this student.
              </div>
            ) : (
              leavesList.map((row) => {
                const days = DAYS_DIFFERENCE(row.startDate, row.endDate);
                const appliedOn = row.createdAt ? new Date(row.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : "—";

                return (
                  <div
                    key={`leave-card-${row.id}`}
                    className="flex flex-col rounded-2xl border border-theme bg-surface p-5 shadow-sm transition-all duration-200 hover:border-secondary hover:shadow-lg"
                  >
                    <div className="flex items-start justify-between gap-3 flex-1">
                      <div className="space-y-1.5 min-w-0">
                        <span className="block text-xs font-semibold uppercase tracking-wider text-cyan-400">
                          {row.leaveType}
                        </span>
                        <h4 className="text-sm font-bold text-primary truncate">
                          {selectedStudent.name}
                        </h4>
                        <div className="text-[11px] text-secondary space-y-0.5">
                          <p>
                            Duration: <span className="font-semibold text-primary">{row.startDate} to {row.endDate}</span> ({days} {days === 1 ? "day" : "days"})
                          </p>
                          <p>
                            Applied: <span className="font-semibold text-primary">{appliedOn}</span>
                          </p>
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border shrink-0 ${row.status === "approved"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : row.status === "rejected"
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                              : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          }`}
                      >
                        {row.status}
                      </span>
                    </div>

                    {row.remarks && (
                      <div className="mt-3 p-2.5 rounded-lg bg-hover/20 border border-theme text-[10px] italic text-secondary">
                        <strong className="text-primary not-italic font-bold block mb-0.5">Teacher Response:</strong>
                        {row.remarks}
                      </div>
                    )}

                    <div className="mt-4 pt-3 border-t border-theme flex items-center justify-end gap-2.5">
                      <button
                        type="button"
                        onClick={() => handleViewClick(row)}
                        className="rounded-xl border border-theme bg-hover hover:bg-surface px-3 py-1.5 text-xs font-semibold text-secondary hover:text-primary transition flex items-center gap-1.5"
                      >
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current" strokeWidth="2">
                          <path d="M2.062 12C2.062 12 5.375 5.5 12 5.5C18.625 5.5 21.938 12 21.938 12C21.938 12 18.625 18.5 12 18.5C5.375 18.5 2.062 12 2.062 12Z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                        View
                      </button>

                      {row.status === "pending" && (
                        <button
                          type="button"
                          onClick={() => handleCancelClick(row)}
                          className="rounded-xl border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 px-3 py-1.5 text-xs font-semibold text-rose-400 transition flex items-center gap-1.5"
                        >
                          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                          </svg>
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* View Leave Request Detail Dialog */}
      {viewModalOpen && leaveToView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setViewModalOpen(false)} />
          <div className="relative w-full max-w-lg rounded-2xl border border-theme bg-surface p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start border-b border-subtle pb-3 mb-4">
              <h3 className="text-sm font-bold text-primary uppercase tracking-wider">
                Leave Request Details
              </h3>
              <button
                type="button"
                onClick={() => setViewModalOpen(false)}
                className="text-secondary hover:text-primary text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-secondary mb-0.5">Leave Type</span>
                  <span className="text-primary font-bold">{leaveToView.leaveType}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-secondary mb-0.5">Status</span>
                  <span
                    className={`inline-flex items-center rounded px-2 py-0.5 text-[9px] font-bold uppercase border ${leaveToView.status === "approved"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : leaveToView.status === "rejected"
                          ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                          : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      }`}
                  >
                    {leaveToView.status}
                  </span>
                </div>
              </div>

              <div>
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-secondary mb-0.5">Timeline Range</span>
                <span className="text-primary font-medium">{leaveToView.startDate} to {leaveToView.endDate}</span>
              </div>

              <div>
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-secondary mb-0.5">Reason for Application</span>
                <p className="bg-hover/20 border border-theme rounded-xl p-3 text-secondary font-medium leading-relaxed whitespace-pre-wrap">
                  {leaveToView.reason}
                </p>
              </div>

              <div>
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-secondary mb-0.5">Teacher Remarks</span>
                <p className="bg-hover/10 rounded-xl p-3 text-secondary italic">
                  {leaveToView.remarks || "No teacher remarks yet."}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-4 mt-6 border-t border-subtle">
              <button
                type="button"
                onClick={() => setViewModalOpen(false)}
                className="rounded-xl border border-theme bg-hover hover:bg-surface px-5 py-2.5 text-xs font-bold text-primary transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete/Cancel Request Confirm Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        title="Cancel &amp; Delete Leave Request?"
        message={`Are you sure you want to cancel and delete the leave request: ${leaveToDelete?.desc}? This action cannot be undone.`}
        onConfirm={confirmCancelLeave}
        onCancel={() => {
          setDeleteModalOpen(false);
          setLeaveToDelete(null);
        }}
      />
    </div>
  );
}
