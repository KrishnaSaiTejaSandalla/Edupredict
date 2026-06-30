"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";

type ClassInfo = { classId: number; className: string };

type KPIs = {
  presentPct: number;
  absentPct: number;
  leavePct: number;
  atRiskPct: number;
  totalStudents: number;
};

type StudentRecord = {
  id: number;
  name: string;
  rollNumber: string;
  gender: string;
  profileImageUrl: string | null;
  status: "present" | "absent" | "half_day";
};

type HistoryRecord = {
  id: number;
  studentName: string;
  rollNumber: string;
  className: string;
  date: string;
  status: string;
  remarks: string | null;
};

type ReportRecord = {
  studentId: number;
  studentName: string;
  rollNumber: string;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  halfDays: number;
  attendancePct: number;
};

type Props = {
  teacherId: number | null;
  teacherUserId: number;
  classes: ClassInfo[];
  subjects: { id: number; name: string }[];
  kpis: KPIs;
  classTeacherClassIds?: number[];
};

function KpiCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: "emerald" | "rose" | "amber" | "blue" | "cyan";
}) {
  const colorMap = {
    blue: {
      bg: "from-blue-500/15 via-blue-400/8 to-white dark:from-blue-500/15 dark:via-blue-400/5 dark:to-transparent",
      border: "border-blue-100 dark:border-blue-500/10 hover:border-blue-300 dark:hover:border-blue-500/30",
      icon: "bg-blue-500/15 text-blue-700 dark:text-blue-500",
      val: "group-hover:text-blue-700 dark:group-hover:text-blue-400",
    },
    amber: {
      bg: "from-amber-500/15 via-yellow-400/8 to-white dark:from-amber-500/15 dark:via-yellow-400/5 dark:to-transparent",
      border: "border-amber-100 dark:border-amber-500/10 hover:border-amber-300 dark:hover:border-amber-500/30",
      icon: "bg-amber-500/15 text-amber-700 dark:text-amber-500",
      val: "group-hover:text-amber-700 dark:group-hover:text-amber-400",
    },
    rose: {
      bg: "from-rose-500/15 via-pink-400/8 to-white dark:from-rose-500/15 dark:via-pink-400/5 dark:to-transparent",
      border: "border-rose-100 dark:border-rose-500/10 hover:border-rose-300 dark:hover:border-rose-500/30",
      icon: "bg-rose-500/15 text-rose-700 dark:text-rose-500",
      val: "group-hover:text-rose-700 dark:group-hover:text-rose-400",
    },
    emerald: {
      bg: "from-emerald-500/15 via-green-400/8 to-white dark:from-emerald-500/15 dark:via-green-400/5 dark:to-transparent",
      border: "border-emerald-100 dark:border-emerald-500/10 hover:border-emerald-300 dark:hover:border-emerald-500/30",
      icon: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-500",
      val: "group-hover:text-emerald-700 dark:group-hover:text-emerald-400",
    },
    cyan: {
      bg: "from-cyan-500/15 via-cyan-400/8 to-white dark:from-cyan-500/15 dark:via-cyan-400/5 dark:to-transparent",
      border: "border-cyan-100 dark:border-cyan-500/10 hover:border-cyan-300 dark:hover:border-cyan-500/30",
      icon: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-500",
      val: "group-hover:text-cyan-700 dark:group-hover:text-cyan-400",
    },
  };
  const c = colorMap[color];
  return (
    <div
      className={`rounded-2xl border bg-gradient-to-br p-5 shadow-sm hover:-translate-y-1 transition-all duration-300 group ${c.bg} ${c.border}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-secondary uppercase tracking-wider">{label}</p>
          <p className={`mt-3 text-3xl font-bold tracking-tight text-primary ${c.val} transition duration-300`}>{value}</p>
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110 ${c.icon}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

const statusBadge = (status: string) => {
  if (status === "present") return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
  if (status === "absent") return "bg-rose-500/10 text-rose-500 border-rose-500/20";
  if (status === "half_day") return "bg-amber-500/10 text-amber-500 border-amber-500/20";
  return "bg-blue-500/10 text-blue-500 border-blue-500/20";
};

const statusLabel = (status: string) => {
  if (status === "present") return "Present";
  if (status === "absent") return "Absent";
  if (status === "half_day") return "Half Day";
  return status;
};

export default function AttendanceClient({
  teacherId,
  teacherUserId,
  classes,
  subjects,
  kpis,
  classTeacherClassIds = [],
}: Props) {
  const classTeacherClasses = classes.filter(c => classTeacherClassIds.includes(c.classId));

  const [activeTab, setActiveTab] = useState<"mark" | "history" | "reports">("mark");
  const [selectedSubject, setSelectedSubject] = useState<number | "">("");
  const [topicTaught, setTopicTaught] = useState<string>("General Class Attendance");
  const [selectedClass, setSelectedClass] = useState<number | "">(classTeacherClasses.length === 1 ? classTeacherClasses[0].classId : "");
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyClass, setHistoryClass] = useState<number | "">(classTeacherClasses.length === 1 ? classTeacherClasses[0].classId : "");
  const [historyPage, setHistoryPage] = useState<number>(1);

  const [reportRecords, setReportRecords] = useState<ReportRecord[]>([]);
  const [loadingReport, setLoadingReport] = useState(false);
  const [reportClass, setReportClass] = useState<number | "">(classTeacherClasses.length === 1 ? classTeacherClasses[0].classId : "");
  const [reportPage, setReportPage] = useState<number>(1);

  // Reset pages on filters/tabs change
  useEffect(() => {
    setHistoryPage(1);
  }, [historyClass, activeTab]);

  useEffect(() => {
    setReportPage(1);
  }, [reportClass, activeTab]);

  // Load students when class or date changes
  useEffect(() => {
    if (!selectedClass) { setStudents([]); return; }
    if (!classTeacherClassIds.includes(Number(selectedClass))) {
      setStudents([]);
      return;
    }
    setLoadingStudents(true);
    fetch(`/api/teacher/attendance?classId=${selectedClass}&date=${selectedDate}`)
      .then((r) => r.json())
      .then((data) => { setStudents(data.students || []); })
      .catch(() => toast.error("Failed to load students"))
      .finally(() => setLoadingStudents(false));
  }, [selectedClass, selectedDate, classTeacherClassIds]);

  // Load history
  useEffect(() => {
    if (activeTab !== "history") return;
    setLoadingHistory(true);
    const params = new URLSearchParams();
    if (historyClass) params.set("classId", String(historyClass));
    fetch(`/api/teacher/attendance/history?${params}`)
      .then((r) => r.json())
      .then((data) => setHistoryRecords(data.records || []))
      .catch(() => toast.error("Failed to load history"))
      .finally(() => setLoadingHistory(false));
  }, [activeTab, historyClass]);

  // Load reports
  useEffect(() => {
    if (activeTab !== "reports") return;
    setLoadingReport(true);
    const params = new URLSearchParams();
    if (reportClass) params.set("classId", String(reportClass));
    fetch(`/api/teacher/attendance/history?${params}&report=true`)
      .then((r) => r.json())
      .then((data) => {
        // Generate report from history records
        const records: HistoryRecord[] = data.records || [];
        const studentMap = new Map<number, ReportRecord>();
        records.forEach((r) => {
          // We use studentName + rollNumber as a key since we don't have studentId here
          const key = r.studentName + "_" + r.rollNumber;
          if (!studentMap.has(parseInt(String(r.id)))) {
            // Build from records
          }
        });

        // Simple aggregation
        const byStudent: Record<string, {
          studentName: string;
          rollNumber: string;
          total: number; present: number; absent: number; halfDay: number;
        }> = {};

        records.forEach((r) => {
          const k = r.studentName;
          if (!byStudent[k]) {
            byStudent[k] = { studentName: r.studentName, rollNumber: r.rollNumber, total: 0, present: 0, absent: 0, halfDay: 0 };
          }
          byStudent[k].total++;
          if (r.status === "present") byStudent[k].present++;
          else if (r.status === "absent") byStudent[k].absent++;
          else if (r.status === "half_day") byStudent[k].halfDay++;
        });

        const reportData: ReportRecord[] = Object.values(byStudent).map((s, idx) => ({
          studentId: idx,
          studentName: s.studentName,
          rollNumber: s.rollNumber,
          totalDays: s.total,
          presentDays: s.present,
          absentDays: s.absent,
          halfDays: s.halfDay,
          attendancePct: s.total > 0 ? Math.round((s.present + s.halfDay * 0.5) / s.total * 100) : 0,
        }));

        setReportRecords(reportData.sort((a, b) => b.attendancePct - a.attendancePct));
      })
      .catch(() => toast.error("Failed to load reports"))
      .finally(() => setLoadingReport(false));
  }, [activeTab, reportClass]);

  const handleStatusChange = (studentId: number, status: "present" | "absent" | "half_day") => {
    setStudents((prev) => prev.map((s) => (s.id === studentId ? { ...s, status } : s)));
  };

  const handleMarkAll = (status: "present" | "absent" | "half_day") => {
    if (!selectedSubject) { toast.error("Please select a subject first."); return; }
    if (!topicTaught.trim()) { toast.error("Please enter the topic taught first."); return; }
    setStudents((prev) => prev.map((s) => ({ ...s, status })));
  };

  const handleSubmit = async () => {
    if (!selectedClass || students.length === 0) return;
    if (!selectedSubject) { toast.error("Please select a subject first."); return; }
    if (!topicTaught.trim()) { toast.error("Please enter the topic taught first."); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/teacher/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: selectedClass,
          subjectId: selectedSubject,
          topicTaught: topicTaught.trim(),
          date: selectedDate,
          records: students.map((s) => ({ studentId: s.id, status: s.status })),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      toast.success("Attendance marked successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to mark attendance");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusStyle = (currentStatus: string, option: string) => {
    const isSelected = currentStatus === option;
    if (!isSelected) return "border border-theme bg-surface text-secondary hover:bg-hover hover:text-primary";
    if (option === "present") return "bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/30";
    if (option === "absent") return "bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/30";
    return "bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/30"; // half_day
  };

  const TABS = [
    { id: "mark", label: "Mark Attendance" },
    { id: "history", label: "History" },
    { id: "reports", label: "Reports" },
  ] as const;

  const PAGE_SIZE = 10;
  const totalHistoryPages = Math.ceil(historyRecords.length / PAGE_SIZE);
  const paginatedHistory = historyRecords.slice((historyPage - 1) * PAGE_SIZE, historyPage * PAGE_SIZE);

  const totalReportPages = Math.ceil(reportRecords.length / PAGE_SIZE);
  const paginatedReport = reportRecords.slice((reportPage - 1) * PAGE_SIZE, reportPage * PAGE_SIZE);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-500 dark:text-cyan-400">
            Faculty Portal
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-primary sm:text-4xl">Attendance</h1>
          <p className="mt-2 text-sm text-secondary">
            Mark and review student attendance for your assigned classes.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <section className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Present Rate"
          value={`${kpis.presentPct}%`}
          color="emerald"
          icon={
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          }
        />
        <KpiCard
          label="Absent Rate"
          value={`${kpis.absentPct}%`}
          color="rose"
          icon={
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M15 9l-6 6M9 9l6 6" />
            </svg>
          }
        />
        <KpiCard
          label="On Leave"
          value={`${kpis.leavePct}%`}
          color="amber"
          icon={
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          }
        />
        <KpiCard
          label="Total Students"
          value={kpis.totalStudents}
          color="cyan"
          icon={
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
        />
      </section>

      {/* Tab Navigation */}
      <div className="flex gap-1 rounded-xl border border-subtle bg-hover p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-lg px-5 py-2.5 text-xs font-semibold transition ${
              activeTab === tab.id
                ? "bg-accent-bg text-accent shadow-sm ring-1 ring-accent/30"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Mark Attendance Tab ─────────────────────────────────────────── */}
      {activeTab === "mark" && (
        <div className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-md">
          {/* Filters */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 items-end">
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Select Class</span>
              <select
                className="select-theme w-full"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value ? Number(e.target.value) : "")}
              >
                <option value="">Choose a class...</option>
                {classTeacherClasses.map((c) => (
                  <option key={c.classId} value={c.classId}>{c.className}</option>
                ))}
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Select Subject</span>
              <select
                className="select-theme w-full"
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value ? Number(e.target.value) : "")}
              >
                <option value="">Choose a subject...</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</span>
              <input
                type="date"
                className="input-theme w-full"
                value={selectedDate}
                max={new Date().toISOString().split("T")[0]}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </label>
          </div>

          {selectedClass && !classTeacherClassIds.includes(Number(selectedClass)) && (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-6 text-center text-rose-400">
              <svg className="mx-auto h-10 w-10 text-rose-500/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="mt-4 text-sm font-bold">Access Denied</p>
              <p className="mt-1 text-xs">Only the assigned Class Teacher for this class is permitted to mark or view attendance logs.</p>
            </div>
          )}

          {classTeacherClasses.length === 0 && (
            <div className="rounded-xl border-2 border-dashed border-border bg-background p-12 text-center">
              <svg className="mx-auto h-10 w-10 text-muted-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              </svg>
              <p className="mt-4 text-sm font-semibold text-foreground">No classes assigned as Class Teacher</p>
              <p className="mt-1 text-xs text-muted-foreground">Only assigned Class Teachers can mark or review student attendance.</p>
            </div>
          )}

          {!selectedClass && classTeacherClasses.length > 0 && (
            <div className="rounded-xl border-2 border-dashed border-border bg-background p-12 text-center">
              <p className="text-sm font-semibold text-foreground">Select a class to begin</p>
              <p className="mt-1 text-xs text-muted-foreground">Choose class, subject, and date above to load the student list.</p>
            </div>
          )}

          {loadingStudents && (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="skeleton h-14 rounded-xl" />
              ))}
            </div>
          )}

          {selectedClass && !loadingStudents && students.length === 0 && (
            <div className="rounded-xl border-2 border-dashed border-border bg-background p-10 text-center">
              <p className="text-sm font-semibold text-foreground">No students found in this class</p>
            </div>
          )}

          {students.length > 0 && (
            <>
              {/* Bulk actions header */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">Student Roll Call</h2>
                  <p className="text-xs text-muted-foreground mt-1">{students.length} students · {selectedDate}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(["present", "absent", "half_day"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => handleMarkAll(s)}
                      disabled={!selectedSubject || !topicTaught.trim()}
                      className={`rounded-xl px-4 py-2 text-xs font-bold border transition disabled:opacity-40 disabled:cursor-not-allowed ${statusBadge(s)}`}
                    >
                      Mark All {statusLabel(s)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Student Table */}
              <div className="overflow-auto rounded-xl border border-border bg-background">
                <table className="w-full text-left text-sm text-foreground">
                  <thead className="border-b border-border bg-background/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="p-4 px-6">Student</th>
                      <th className="p-4 px-6">Roll Number</th>
                      <th className="p-4 px-6 text-right">Attendance Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-subtle">
                    {students.map((student) => {
                      const initials = student.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
                      return (
                        <tr key={student.id} className="hover:bg-hover transition duration-200">
                          <td className="p-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/20 text-xs font-bold text-cyan-500 dark:text-cyan-300 border border-cyan-500/20 overflow-hidden">
                                {student.profileImageUrl ? (
                                  <img src={student.profileImageUrl} alt={student.name} className="h-full w-full object-cover" />
                                ) : initials}
                              </div>
                              <span className="font-semibold text-foreground">{student.name}</span>
                            </div>
                          </td>
                          <td className="p-4 px-6 font-medium text-muted-foreground">{student.rollNumber || "—"}</td>
                          <td className="p-4 px-6 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {(["present", "absent", "half_day"] as const).map((opt) => (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => handleStatusChange(student.id, opt)}
                                  className={`rounded-lg px-3 py-1.5 text-xs font-bold capitalize transition-all ${getStatusStyle(student.status, opt)}`}
                                >
                                  {opt === "half_day" ? "Half Day" : opt.charAt(0).toUpperCase() + opt.slice(1)}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Submit */}
              <div className="flex justify-end pt-2 border-t border-border">
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !selectedSubject || !topicTaught.trim()}
                  className="rounded-xl btn-cyan px-6 py-3 text-sm font-semibold disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Attendance Logs"}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── History Tab ─────────────────────────────────────────────────── */}
      {activeTab === "history" && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-md space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">Attendance History</h2>
              <p className="text-xs text-muted-foreground mt-1">Past attendance records for your classes.</p>
            </div>
            <select
              className="select-theme max-w-[220px]"
              value={historyClass}
              onChange={(e) => setHistoryClass(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">All Classes</option>
              {classTeacherClasses.map((c) => (
                <option key={c.classId} value={c.classId}>{c.className}</option>
              ))}
            </select>
          </div>

          {loadingHistory ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-12 rounded-xl" />)}
            </div>
          ) : historyRecords.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-border bg-background p-12 text-center">
              <svg className="mx-auto h-10 w-10 text-muted-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="mt-4 text-sm font-semibold text-foreground">No attendance records found</p>
              <p className="mt-1 text-xs text-muted-foreground">Records will appear here once attendance is marked.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-xl border border-border bg-background">
                <table className="w-full text-left text-sm text-foreground">
                  <thead className="border-b border-border bg-background/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="p-4 px-6">Student</th>
                      <th className="p-4 px-6">Roll</th>
                      <th className="p-4 px-6">Class</th>
                      <th className="p-4 px-6">Date</th>
                      <th className="p-4 px-6">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-subtle">
                    {paginatedHistory.map((r) => (
                      <tr key={r.id} className="hover:bg-hover transition duration-200">
                        <td className="p-4 px-6 font-semibold text-foreground">{r.studentName}</td>
                        <td className="p-4 px-6 text-muted-foreground">{r.rollNumber}</td>
                        <td className="p-4 px-6 text-muted-foreground">{r.className}</td>
                        <td className="p-4 px-6 text-muted-foreground">{r.date}</td>
                        <td className="p-4 px-6">
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold capitalize ${statusBadge(r.status)}`}>
                            {statusLabel(r.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalHistoryPages > 1 && (
                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground pt-4 border-t border-border mt-4 w-full">
                  <div>
                    {historyPage > 1 && (
                      <button
                        onClick={() => setHistoryPage((p) => p - 1)}
                        className="rounded-xl border border-border bg-card px-4 py-2.5 hover:bg-hover transition duration-150"
                      >
                        ← Previous
                      </button>
                    )}
                  </div>
                  <span className="tabular-nums">Page {historyPage} of {totalHistoryPages}</span>
                  <div>
                    {historyPage < totalHistoryPages && (
                      <button
                        onClick={() => setHistoryPage((p) => p + 1)}
                        className="rounded-xl border border-border bg-card px-4 py-2.5 hover:bg-hover transition duration-150"
                      >
                        Next →
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Reports Tab ─────────────────────────────────────────────────── */}
      {activeTab === "reports" && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-md space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">Attendance Reports</h2>
              <p className="text-xs text-muted-foreground mt-1">Aggregated attendance summary per student for your classes.</p>
            </div>
            <select
              className="select-theme max-w-[220px]"
              value={reportClass}
              onChange={(e) => setReportClass(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">All Classes</option>
              {classTeacherClasses.map((c) => (
                <option key={c.classId} value={c.classId}>{c.className}</option>
              ))}
            </select>
          </div>

          {loadingReport ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-12 rounded-xl" />)}
            </div>
          ) : reportRecords.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-border bg-background p-12 text-center">
              <svg className="mx-auto h-10 w-10 text-muted-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="mt-4 text-sm font-semibold text-foreground">No report data available</p>
              <p className="mt-1 text-xs text-muted-foreground">Mark attendance first to generate reports.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-xl border border-border bg-background">
                <table className="w-full text-left text-sm text-foreground">
                  <thead className="border-b border-border bg-background/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="p-4 px-6">Student</th>
                      <th className="p-4 px-6">Roll</th>
                      <th className="p-4 px-6 text-center">Total Days</th>
                      <th className="p-4 px-6 text-center">Present</th>
                      <th className="p-4 px-6 text-center">Absent</th>
                      <th className="p-4 px-6 text-center">Half Days</th>
                      <th className="p-4 px-6">Attendance %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-subtle">
                    {paginatedReport.map((r, idx) => (
                      <tr key={idx} className="hover:bg-hover transition duration-200">
                        <td className="p-4 px-6 font-semibold text-foreground">{r.studentName}</td>
                        <td className="p-4 px-6 text-muted-foreground">{r.rollNumber}</td>
                        <td className="p-4 px-6 text-center text-muted-foreground">{r.totalDays}</td>
                        <td className="p-4 px-6 text-center font-semibold text-emerald-500">{r.presentDays}</td>
                        <td className="p-4 px-6 text-center font-semibold text-rose-500">{r.absentDays}</td>
                        <td className="p-4 px-6 text-center font-semibold text-amber-500">{r.halfDays}</td>
                        <td className="p-4 px-6">
                          <div className="flex items-center gap-3">
                            <span className={`text-sm font-bold ${r.attendancePct >= 85 ? "text-emerald-500" : r.attendancePct >= 70 ? "text-amber-500" : "text-rose-500"}`}>
                              {r.attendancePct}%
                            </span>
                            <div className="h-1.5 flex-1 rounded-full bg-hover overflow-hidden">
                              <div
                                className={`h-full rounded-full ${r.attendancePct >= 85 ? "bg-emerald-500" : r.attendancePct >= 70 ? "bg-amber-500" : "bg-rose-500"}`}
                                style={{ width: `${r.attendancePct}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalReportPages > 1 && (
                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground pt-4 border-t border-border mt-4 w-full">
                  <div>
                    {reportPage > 1 && (
                      <button
                        onClick={() => setReportPage((p) => p - 1)}
                        className="rounded-xl border border-border bg-card px-4 py-2.5 hover:bg-hover transition duration-150"
                      >
                        ← Previous
                      </button>
                    )}
                  </div>
                  <span className="tabular-nums">Page {reportPage} of {totalReportPages}</span>
                  <div>
                    {reportPage < totalReportPages && (
                      <button
                        onClick={() => setReportPage((p) => p + 1)}
                        className="rounded-xl border border-border bg-card px-4 py-2.5 hover:bg-hover transition duration-150"
                      >
                        Next →
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}