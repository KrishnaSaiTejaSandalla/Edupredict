"use client";

import React, { useState, useEffect, useTransition } from "react";
import { toast } from "sonner";

type ClassInfo = { classId: number; className: string };

type KPIs = {
  presentPct: number;
  absentPct: number;
  atRiskPct: number;
  totalStudents: number;
};

type StudentRecord = {
  id: number;
  name: string;
  rollNumber: string;
  gender: string;
  profileImageUrl: string | null;
  status: "present" | "absent" | "late";
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

type Props = {
  teacherId: number | null;
  teacherUserId: number;
  classes: ClassInfo[];
  subjects: { id: number; name: string }[];
  kpis: KPIs;
};

function KpiCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: string | number;
  color: "emerald" | "rose" | "amber" | "blue";
  icon: React.ReactNode;
}) {
  const colorMap = {
    emerald: "from-emerald-500/15 via-green-400/8 to-white dark:from-emerald-500/15 dark:via-green-400/5 dark:to-transparent border-emerald-100 dark:border-emerald-500/10 hover:border-emerald-300 dark:hover:border-emerald-500/30",
    rose: "from-rose-500/15 via-pink-400/8 to-white dark:from-rose-500/15 dark:via-pink-400/5 dark:to-transparent border-rose-100 dark:border-rose-500/10 hover:border-rose-300 dark:hover:border-rose-500/30",
    amber: "from-amber-500/15 via-yellow-400/8 to-white dark:from-amber-500/15 dark:via-yellow-400/5 dark:to-transparent border-amber-100 dark:border-amber-500/10 hover:border-amber-300 dark:hover:border-amber-500/30",
    blue: "from-blue-500/15 via-blue-400/8 to-white dark:from-blue-500/15 dark:via-blue-400/5 dark:to-transparent border-blue-100 dark:border-blue-500/10 hover:border-blue-300 dark:hover:border-blue-500/30",
  };
  const iconMap = {
    emerald: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-500",
    rose: "bg-rose-500/15 text-rose-700 dark:text-rose-500",
    amber: "bg-amber-500/15 text-amber-700 dark:text-amber-500",
    blue: "bg-blue-500/15 text-blue-700 dark:text-blue-500",
  };

  return (
    <div className={`rounded-2xl border bg-gradient-to-br p-6 shadow-sm hover:-translate-y-1 transition-all duration-300 group ${colorMap[color]}`}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-foreground">{value}</p>
        </div>
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110 ${iconMap[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function AttendanceClient({ teacherId, teacherUserId, classes, subjects, kpis }: Props) {
  const [activeTab, setActiveTab] = useState<"mark" | "history">("mark");
  const [selectedSubject, setSelectedSubject] = useState<number | "">("");
  const [topicTaught, setTopicTaught] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<number | "">("");
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyClass, setHistoryClass] = useState<number | "">("");
  const [isPending, startTransition] = useTransition();

  // Load students when class changes
  useEffect(() => {
    if (!selectedClass) { setStudents([]); return; }
    setLoadingStudents(true);
    fetch(`/api/teacher/attendance?classId=${selectedClass}&date=${selectedDate}`)
      .then((r) => r.json())
      .then((data) => {
        setStudents(data.students || []);
      })
      .catch(() => toast.error("Failed to load students"))
      .finally(() => setLoadingStudents(false));
  }, [selectedClass, selectedDate]);

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

  const handleStatusChange = (studentId: number, status: "present" | "absent" | "late") => {
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, status } : s))
    );
  };

  const handleMarkAll = (status: "present" | "absent" | "late") => {
    if (!selectedSubject) {
      toast.error("Please select a subject first.");
      return;
    }
    if (!topicTaught.trim()) {
      toast.error("Please enter the topic taught first.");
      return;
    }
    setStudents((prev) => prev.map((s) => ({ ...s, status })));
  };

  const handleSubmit = async () => {
    if (!selectedClass || students.length === 0) return;
    if (!selectedSubject) {
      toast.error("Please select a subject first.");
      return;
    }
    if (!topicTaught.trim()) {
      toast.error("Please enter the topic taught first.");
      return;
    }
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

  const statusBadge = (status: string) => {
    if (status === "present") return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    if (status === "absent") return "bg-rose-500/10 text-rose-400 border-rose-500/20";
    return "bg-amber-500/10 text-amber-400 border-amber-500/20";
  };

  return (
    <main className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8 space-y-8 transition-colors duration-200">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-500 dark:text-cyan-400">
          Faculty Portal
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Attendance</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Mark daily attendance for your assigned classes and track student presence.
        </p>
      </div>

      {/* KPI Cards */}
      <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Present %"
          value={`${kpis.presentPct}%`}
          color="emerald"
          icon={
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          }
        />
        <KpiCard
          label="Absent %"
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
          label="At Risk %"
          value={`${kpis.atRiskPct}%`}
          color="amber"
          icon={
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          }
        />
        <KpiCard
          label="Total Students"
          value={kpis.totalStudents}
          color="blue"
          icon={
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          }
        />
      </section>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-subtle bg-hover p-1 w-fit">
        {(["mark", "history"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
              activeTab === tab
                ? "bg-cyan-500/20 text-cyan-400 shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "mark" ? "Mark Attendance" : "Attendance History"}
          </button>
        ))}
      </div>

      {/* Mark Attendance */}
      {activeTab === "mark" && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-md space-y-6 transition-colors duration-200">
          <div className="flex flex-wrap gap-4 items-end">
            <label className="block space-y-1.5 flex-1 min-w-[180px]">
              <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Select Class</span>
              <select
                className="select-theme"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value ? Number(e.target.value) : "")}
              >
                <option value="">Choose a class...</option>
                {classes.map((c) => (
                  <option key={c.classId} value={c.classId}>{c.className}</option>
                ))}
              </select>
            </label>
            <label className="block space-y-1.5 flex-1 min-w-[180px]">
              <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Select Subject</span>
              <select
                className="select-theme"
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value ? Number(e.target.value) : "")}
              >
                <option value="">Choose a subject...</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </label>
            <label className="block space-y-1.5 flex-[2] min-w-[250px]">
              <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Topic Taught</span>
              <input
                type="text"
                placeholder="e.g. Chapter 3: Quadratic Equations"
                className="input-theme"
                value={topicTaught}
                onChange={(e) => setTopicTaught(e.target.value)}
              />
            </label>
            <label className="block space-y-1.5 flex-1 min-w-[150px]">
              <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Date</span>
              <input
                type="date"
                className="input-theme"
                value={selectedDate}
                max={new Date().toISOString().split("T")[0]}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </label>
          </div>

          {classes.length === 0 && (
            <div className="rounded-xl border-2 border-dashed border-theme bg-surface p-8 text-center">
              <p className="text-sm text-secondary">No classes assigned. Contact admin to assign classes.</p>
            </div>
          )}

          {selectedClass && !loadingStudents && students.length === 0 && (
            <div className="rounded-xl border-2 border-dashed border-theme bg-surface p-8 text-center">
              <p className="text-sm text-secondary">No students found in this class.</p>
            </div>
          )}

          {loadingStudents && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-14 rounded-xl" />
              ))}
            </div>
          )}

          {students.length > 0 && (
            <>
              {/* Bulk actions */}
              <div className="flex gap-2 flex-wrap">
                <span className="text-xs font-semibold text-secondary self-center">Mark all:</span>
                {(["present", "absent", "late"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => handleMarkAll(s)}
                    disabled={!selectedSubject || !topicTaught.trim()}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold border transition ${statusBadge(s)} ${
                      !selectedSubject || !topicTaught.trim()
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>

              {/* Student list */}
              <div className="space-y-2 max-h-[480px] overflow-y-auto scrollbar-hide pr-1">
                {students.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center gap-3 rounded-xl border border-subtle bg-hover/30 p-3 hover:bg-hover transition"
                  >
                    {/* Avatar */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-300 text-xs font-bold text-slate-950 overflow-hidden">
                      {student.profileImageUrl ? (
                        <img src={student.profileImageUrl} alt={student.name} className="h-full w-full object-cover" />
                      ) : (
                        student.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-primary truncate">{student.name}</p>
                      <p className="text-[10px] text-muted">Roll {student.rollNumber}</p>
                    </div>
                    {/* Status Buttons */}
                    <div className="flex gap-1.5">
                      {(["present", "absent", "late"] as const).map((s) => (
                        <button
                          key={s}
                          onClick={() => handleStatusChange(student.id, s)}
                          className={`rounded-lg px-2.5 py-1 text-[10px] font-bold border transition ${
                            student.status === s
                              ? statusBadge(s)
                              : "border-subtle text-muted-foreground hover:bg-hover"
                          }`}
                        >
                          {s === "present" ? "P" : s === "absent" ? "A" : "L"}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Submit */}
              <div className="flex justify-end">
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !selectedSubject || !topicTaught.trim()}
                  className="btn-cyan rounded-xl px-6 py-2.5 text-sm font-semibold disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Submit Attendance"}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* History */}
      {activeTab === "history" && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-md space-y-4 transition-colors duration-200">
          <div className="flex gap-3 flex-wrap">
            <select
              className="select-theme max-w-[220px]"
              value={historyClass}
              onChange={(e) => setHistoryClass(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">All Classes</option>
              {classes.map((c) => (
                <option key={c.classId} value={c.classId}>{c.className}</option>
              ))}
            </select>
          </div>

          {loadingHistory ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-12 rounded-xl" />)}
            </div>
          ) : historyRecords.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-theme p-10 text-center">
              <p className="text-sm text-secondary">No attendance records available</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-subtle">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-subtle bg-hover">
                    <th className="text-left p-3 text-[10px] font-bold uppercase tracking-wider text-secondary">Student</th>
                    <th className="text-left p-3 text-[10px] font-bold uppercase tracking-wider text-secondary">Roll</th>
                    <th className="text-left p-3 text-[10px] font-bold uppercase tracking-wider text-secondary">Class</th>
                    <th className="text-left p-3 text-[10px] font-bold uppercase tracking-wider text-secondary">Date</th>
                    <th className="text-left p-3 text-[10px] font-bold uppercase tracking-wider text-secondary">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-subtle">
                  {historyRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-hover/50 transition">
                      <td className="p-3 text-xs font-semibold text-primary">{r.studentName}</td>
                      <td className="p-3 text-xs text-secondary">{r.rollNumber}</td>
                      <td className="p-3 text-xs text-secondary">{r.className}</td>
                      <td className="p-3 text-xs text-secondary">{r.date}</td>
                      <td className="p-3">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${statusBadge(r.status)}`}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
