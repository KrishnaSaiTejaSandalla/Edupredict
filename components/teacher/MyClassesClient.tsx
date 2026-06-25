"use client";

import React, { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

type ClassInfo = { id: number; name: string; section: string };

type Student = {
  id: number;
  userId: number;
  name: string;
  rollNumber: string;
  gender: string;
  dateOfBirth: string | null;
  address: string | null;
  profileImageUrl: string | null;
  classId: number;
  className: string;
  attendancePct: number;
  performancePct: number;
  riskLevel: "low" | "medium" | "high" | null;
};

type Analysis = {
  totalStudents: number;
  atRiskStudents: number;
  avgAttendance: number;
  avgPerformance: number;
  subjectPerformance?: { subjectName: string; avgMarks: number; maxMarks: number }[];
};

type ExamRecord = {
  exam: string;
  date: string;
  maxMarks: number;
  subjects: { name: string; marks: number }[];
  average: number;
};

type ProfilePersonal = {
  dateOfBirth: string | null;
  gender: string;
  address: string | null;
  phoneNumber: string | null;
  joinDate: string | null;
  admissionNumber: string | null;
  currentGPA: string | null;
  currentRank: number | null;
  attendancePct: number;
  performancePct: number;
  riskLevel: "low" | "medium" | "high";
  className: string;
};

type ProfileAcademic = {
  examHistory: ExamRecord[];
  subjectScores: { subject: string; avgMarks: number }[];
};

type ProfilePerformance = {
  radarData: { subject: string; value: number }[];
  aiInsights: string[];
  lineData: { date: string; score: number }[];
  kpis: {
    attendancePct: number;
    examAvg: number;
    assignmentPct: number;
    overallRating: number;
  };
};

type ProfileGuardian = {
  parentName: string | null;
  relationship: string | null;
  phone: string | null;
  email: string | null;
  occupation: string | null;
  address: string | null;
};

type Props = {
  teacherId: number | null;
  myClasses: ClassInfo[];
  initialStudents: Student[];
  initialAnalysis: Analysis;
  defaultClassId: number | null;
};

function getRating(attendancePct: number, performancePct: number): number {
  const a = Math.round((attendancePct / 100) * 5 * 10) / 10;
  const p = Math.round((performancePct / 100) * 5 * 10) / 10;
  return Math.round(((a + p) / 2) * 10) / 10;
}

function getTrend(attendancePct: number, performancePct: number): "up" | "down" | "stable" {
  if (attendancePct >= 85 && performancePct >= 80) return "up";
  if (attendancePct < 70 || performancePct < 60) return "down";
  return "stable";
}

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <div className="flex items-center gap-0.5">
      {Array(full).fill(null).map((_, i) => (
        <span key={`f${i}`} className="text-amber-400 text-xs">★</span>
      ))}
      {half && (
        <span className="text-xs relative inline-block w-[12px]">
          <span className="absolute inset-0 overflow-hidden w-1/2 text-amber-400">★</span>
          <span className="text-muted">★</span>
        </span>
      )}
      {Array(empty).fill(null).map((_, i) => (
        <span key={`e${i}`} className="text-muted text-xs">★</span>
      ))}
    </div>
  );
}

function sortClasses(classes: ClassInfo[]): ClassInfo[] {
  return [...classes].sort((a, b) => {
    const gradeA = parseInt(a.name) || 0;
    const gradeB = parseInt(b.name) || 0;
    if (gradeA !== gradeB) return gradeA - gradeB;
    return a.section.localeCompare(b.section);
  });
}

function KpiCard({
  label, value, color, icon,
}: {
  label: string;
  value: string | number;
  color: "cyan" | "rose" | "amber" | "emerald";
  icon: React.ReactNode;
}) {
  const colorMap = {
    cyan: "from-cyan-500/15 via-blue-400/8 to-white dark:from-cyan-500/15 dark:via-blue-400/5 dark:to-transparent border-cyan-100 dark:border-cyan-500/10 hover:border-cyan-300 dark:hover:border-cyan-500/30",
    rose: "from-rose-500/15 via-pink-400/8 to-white dark:from-rose-500/15 dark:via-pink-400/5 dark:to-transparent border-rose-100 dark:border-rose-500/10 hover:border-rose-300 dark:hover:border-rose-500/30",
    amber: "from-amber-500/15 via-yellow-400/8 to-white dark:from-amber-500/15 dark:via-yellow-400/5 dark:to-transparent border-amber-100 dark:border-amber-500/10 hover:border-amber-300 dark:hover:border-amber-500/30",
    emerald: "from-emerald-500/15 via-green-400/8 to-white dark:from-emerald-500/15 dark:via-green-400/5 dark:to-transparent border-emerald-100 dark:border-emerald-500/10 hover:border-emerald-300 dark:hover:border-emerald-500/30",
  };
  const iconMap = {
    cyan: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-500",
    rose: "bg-rose-500/15 text-rose-700 dark:text-rose-500",
    amber: "bg-amber-500/15 text-amber-700 dark:text-amber-500",
    emerald: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-500",
  };
  return (
    <div className={`rounded-2xl border bg-gradient-to-br p-5 shadow-sm hover:-translate-y-1 transition-all duration-300 group ${colorMap[color]}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-secondary uppercase tracking-wider">{label}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-primary">{value}</p>
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110 ${iconMap[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-border bg-background p-12 text-center">
      <svg className="mx-auto h-10 w-10 text-muted-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
      <p className="mt-4 text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{message}</p>
    </div>
  );
}

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-1.5 rounded-full bg-muted/20 overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function MyClassesClient({
  teacherId,
  myClasses,
  initialStudents,
  initialAnalysis,
  defaultClassId,
}: Props) {
  const [selectedClassId, setSelectedClassId] = useState<number | null>(defaultClassId);
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [analysis, setAnalysis] = useState<Analysis>(initialAnalysis);
  const [loading, setLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [profileTab, setProfileTab] = useState<"personal" | "academic" | "performance" | "guardian">("personal");
  const [profileDetails, setProfileDetails] = useState<{
    personal: ProfilePersonal | null;
    academic: ProfileAcademic | null;
    performance: ProfilePerformance | null;
    guardian: ProfileGuardian | null;
  } | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [search, setSearch] = useState("");

  const sortedClasses = useMemo(() => sortClasses(myClasses), [myClasses]);

  // ── Exam filter & pagination state ──────────────────────────────────────────
  const [selectedSubject, setSelectedSubject] = useState("All");
  const [examPage, setExamPage] = useState(0);
  const EXAMS_PER_PAGE = 5;

  // All unique subject names across all exams
  const allSubjectsList = useMemo(() => {
    if (!profileDetails?.academic?.examHistory) return [];
    return Array.from(
      new Set(
        profileDetails.academic.examHistory.flatMap((e) =>
          e.subjects.map((s) => s.name)
        )
      )
    );
  }, [profileDetails?.academic?.examHistory]);

  // Exams filtered by selected subject
  const filteredExams = useMemo(() => {
    if (!profileDetails?.academic?.examHistory) return [];
    if (selectedSubject === "All") return profileDetails.academic.examHistory;
    return profileDetails.academic.examHistory.filter((e) =>
      e.subjects.some((s) => s.name === selectedSubject)
    );
  }, [profileDetails?.academic?.examHistory, selectedSubject]);

  // Paginated slice of filtered exams
  const paginatedExams = useMemo(() => {
    const start = examPage * EXAMS_PER_PAGE;
    return filteredExams.slice(start, start + EXAMS_PER_PAGE);
  }, [filteredExams, examPage]);

  // Subject columns to render in table
  const subjectsToRender = useMemo(() => {
    return selectedSubject === "All" ? allSubjectsList : [selectedSubject];
  }, [selectedSubject, allSubjectsList]);

  useEffect(() => {
    if (!selectedClassId) return;
    setLoading(true);
    fetch(`/api/teacher/classes?classId=${selectedClassId}`)
      .then((r) => r.json())
      .then((data) => {
        setStudents(data.students || []);
        setAnalysis(data.analysis || initialAnalysis);
      })
      .catch(() => toast.error("Failed to load class data"))
      .finally(() => setLoading(false));
  }, [selectedClassId]);

  const fetchStudentProfile = async (student: Student) => {
    setLoadingProfile(true);
    setProfileDetails(null);
    // Reset exam filter state when opening a new student
    setSelectedSubject("All");
    setExamPage(0);
    try {
      const [personalRes, academicRes, performanceRes, guardianRes] = await Promise.all([
        fetch(`/api/teacher/student-detail?studentId=${student.id}&tab=personal`),
        fetch(`/api/teacher/student-detail?studentId=${student.id}&tab=academic`),
        fetch(`/api/teacher/student-detail?studentId=${student.id}&tab=performance`),
        fetch(`/api/teacher/student-detail?studentId=${student.id}&tab=guardian`),
      ]);
      const [personal, academic, performance, guardian] = await Promise.all([
        personalRes.ok ? personalRes.json() : null,
        academicRes.ok ? academicRes.json() : null,
        performanceRes.ok ? performanceRes.json() : null,
        guardianRes.ok ? guardianRes.json() : null,
      ]);
      setProfileDetails({
        personal: personal?.personal || null,
        academic: academic?.academic || null,
        performance: performance?.performance || null,
        guardian: guardian?.guardian || null,
      });
    } catch {
      toast.error("Failed to load profile");
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    if (selectedStudent) {
      setProfileTab("personal");
      fetchStudentProfile(selectedStudent);
    }
  }, [selectedStudent]);

  const filtered = students.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.rollNumber.toLowerCase().includes(search.toLowerCase())
  );

  const selectedClass = sortedClasses.find((c) => c.id === selectedClassId);

  const riskStats = useMemo(() => ({
    all: students.length,
    low: students.filter((s) => s.riskLevel === "low" || !s.riskLevel).length,
    medium: students.filter((s) => s.riskLevel === "medium").length,
    high: students.filter((s) => s.riskLevel === "high").length,
  }), [students]);

  if (sortedClasses.length === 0) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-cyan-500 dark:text-cyan-400">Faculty Portal</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-primary sm:text-4xl">My Classes</h1>
          <p className="mt-2 text-sm text-secondary">Class Teacher Overview — student profiles, performance ratings, and academic insights.</p>
        </div>
        <EmptyState title="No Class Assigned" message="Contact administrator to assign a class." />
      </div>
    );
  }

  const riskBadge = (risk: "low" | "medium" | "high" | null) => {
    if (!risk || risk === "low") return { label: "On Track", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" };
    if (risk === "medium") return { label: "At Risk", color: "bg-amber-500/10 text-amber-500 border-amber-500/20" };
    return { label: "Critical", color: "bg-rose-500/10 text-rose-500 border-rose-500/20" };
  };

  const riskBarColor = (pct: number) =>
    pct >= 85 ? "bg-emerald-500" : pct >= 70 ? "bg-amber-500" : "bg-rose-500";

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-500 dark:text-cyan-400">Faculty Portal · Class Teacher</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-primary sm:text-4xl">My Classes</h1>
          <p className="mt-2 text-sm text-secondary">Class Teacher Overview — student profiles, performance ratings, and academic insights.</p>
        </div>
      </div>

      {/* Class Selector */}
      {sortedClasses.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {sortedClasses.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedClassId(c.id)}
              className={`rounded-xl px-4 py-2 text-xs font-semibold border transition ${selectedClassId === c.id
                ? "bg-accent-bg text-accent border-accent/30 shadow-sm"
                : "text-secondary border-border hover:bg-hover hover:text-foreground"
                }`}
            >
              Class {c.name} {c.section}
            </button>
          ))}
        </div>
      )}

      {/* KPI Cards */}
      {selectedClass && (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Total Students" value={analysis.totalStudents} color="cyan"
            icon={<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>}
          />
          <KpiCard label="At Risk Students" value={analysis.atRiskStudents} color="rose"
            icon={<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>}
          />
          <KpiCard label="Avg Attendance" value={`${analysis.avgAttendance}%`} color="amber"
            icon={<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>}
          />
          <KpiCard label="Avg Performance" value={`${analysis.avgPerformance}%`} color="emerald"
            icon={<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>}
          />
        </div>
      )}

      {/* ── Unified Filter Bar ─────────────────────────────────────────────── */}
      {selectedClass && (
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          {/* Search */}
          <div className="relative w-full sm:w-80 lg:w-96">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                <path d="M10 4a6 6 0 1 0 3.7 10.7l3.6 3.6 1.4-1.4-3.6-3.6A6 6 0 0 0 10 4Zm0 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search by name or roll..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm focus-visible:outline-none focus:ring-accent focus:border-transparent"
            />
          </div>

          {/* Risk Stats as inline pills */}
          <div className="flex items-center gap-2 flex-wrap text-xs font-semibold">
            <span className="text-muted-foreground text-[10px] uppercase tracking-wider mr-1">Students:</span>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-background border border-border px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
              <span className="text-foreground">All</span>
              <span className="font-bold text-foreground">{riskStats.all}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="text-emerald-600 dark:text-emerald-400">Low Risk</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{riskStats.low}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              <span className="text-amber-600 dark:text-amber-400">Medium</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">{riskStats.medium}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
              <span className="text-rose-600 dark:text-rose-400">High Risk</span>
              <span className="font-bold text-rose-600 dark:text-rose-400">{riskStats.high}</span>
            </span>
            {filtered.length !== students.length && (
              <span className="text-[10px] text-muted-foreground ml-1">{filtered.length} shown</span>
            )}
          </div>
        </div>
      )}

      {/* ── Student Cards Grid ─────────────────────────────────────────────── */}
      {
        loading ? (
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton h-44 rounded-2xl" />
            ))}
          </div>
        ) : students.length === 0 ? (
          <EmptyState title="No Students Enrolled" message="No students are enrolled in this class yet." />
        ) : filtered.length === 0 ? (
          <EmptyState title="No Matching Students" message="No students match your search query." />
        ) : (
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((student) => {
              const rating = getRating(student.attendancePct, student.performancePct);
              const trend = getTrend(student.attendancePct, student.performancePct);
              const risk = riskBadge(student.riskLevel);
              const initials = student.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();

              return (
                <div
                  key={student.id}
                  onClick={() => setSelectedStudent(student)}
                  className="group relative rounded-2xl border border-border bg-card hover:border-accent/50 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md overflow-hidden"
                >
                  {/* Top risk accent bar */}
                  <div className={`h-0.5 w-full ${student.riskLevel === "high" ? "bg-rose-500" : student.riskLevel === "medium" ? "bg-amber-500" : "bg-emerald-500"}`} />

                  <div className="p-4">
                    {/* Header: avatar + info + trend */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-xs font-bold text-white overflow-hidden">
                        {student.profileImageUrl
                          ? <img src={student.profileImageUrl} alt={student.name} className="h-full w-full object-cover" />
                          : initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-foreground group-hover:text-accent transition truncate">{student.name}</p>
                        <p className="text-[10px] text-muted-foreground font-medium">Roll No.{student.rollNumber}</p>
                      </div>
                      <span className={`text-base font-bold ${trend === "up" ? "text-emerald-500" : trend === "down" ? "text-rose-500" : "text-muted-foreground"}`}>
                        {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"}
                      </span>
                    </div>

                    {/* Metrics: two progress rows */}
                    <div className="space-y-2 mb-3">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Attendance</span>
                          <span className={`text-[10px] font-bold ${student.attendancePct >= 85 ? "text-emerald-500" : student.attendancePct >= 70 ? "text-amber-500" : "text-rose-500"}`}>{student.attendancePct}%</span>
                        </div>
                        <ProgressBar pct={student.attendancePct} color={riskBarColor(student.attendancePct)} />
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Performance</span>
                          <span className={`text-[10px] font-bold ${student.performancePct >= 80 ? "text-emerald-500" : student.performancePct >= 60 ? "text-amber-500" : "text-rose-500"}`}>{student.performancePct}%</span>
                        </div>
                        <ProgressBar pct={student.performancePct} color={riskBarColor(student.performancePct)} />
                      </div>
                    </div>

                    {/* Footer: rating + risk badge */}
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <div className="flex items-center gap-1">
                        <StarRating rating={rating} />
                        <span className="text-[9px] text-muted-foreground ml-0.5">{rating.toFixed(1)}</span>
                      </div>
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-bold ${risk.color}`}>
                        <span className="mr-1 h-1 w-1 rounded-full bg-current" />
                        {risk.label}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      }

      {/* ── Student Detail Modal ───────────────────────────────────────────── */}
      {
        selectedStudent && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-end mr-0 lg:mr-20 p-3 sm:p-6"
            onClick={() => setSelectedStudent(null)}
          >
            <div
              className="w-full max-w-5xl max-h-[90vh] rounded-2xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between gap-4 border-b border-border bg-card px-6 py-4 flex-shrink-0">
                {/* Left */}
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-base font-bold text-white">
                    {selectedStudent.profileImageUrl ? (
                      <img
                        src={selectedStudent.profileImageUrl}
                        alt={selectedStudent.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      selectedStudent.name
                        .split(" ")
                        .map((p) => p[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()
                    )}
                  </div>

                  <div className="flex flex-1 items-center justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-bold text-foreground">
                        {selectedStudent.name}
                      </h2>

                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Roll No. {selectedStudent.rollNumber} | Class{" "}
                        {selectedStudent.className}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[13px] font-semibold ${riskBadge(selectedStudent.riskLevel).color}`}
                      >
                        {riskBadge(selectedStudent.riskLevel).label}
                      </span>

                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-[13px] font-semibold text-white ${selectedStudent.performancePct >= 85
                        ? "bg-emerald-500"
                        : selectedStudent.performancePct >= 70
                          ? "bg-amber-500"
                          : "bg-rose-500"}`}>
                        {selectedStudent.performancePct >= 85
                          ? "Excellent"
                          : selectedStudent.performancePct >= 70
                            ? "Good"
                            : selectedStudent.performancePct >= 50
                              ? "Average"
                              : "Needs Attention"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Close button */}
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition hover:text-foreground"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                  </svg>
                </button>
              </div>

              {/* Tab Navigation */}
              <div className="flex gap-0 border-b border-border flex-shrink-0 bg-background/50 px-4">
                {(["Personal", "Academic", "Performance", "Guardian"] as const).map((tab) => {
                  const id = tab.toLowerCase() as "personal" | "academic" | "performance" | "guardian";
                  return (
                    <button
                      key={tab}
                      onClick={() => setProfileTab(id)}
                      className={`px-5 py-3 text-xs font-semibold border-b-2 -mb-px transition-all duration-200 ${profileTab === id
                        ? "border-accent text-accent"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                    >
                      {tab}
                    </button>
                  );
                })}
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {loadingProfile ? (
                  <div className="grid gap-4 grid-cols-2">
                    {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-20 rounded-xl" />)}
                  </div>
                ) : profileTab === "personal" && profileDetails?.personal ? (
                  /* ── Personal Tab ── */
                  <div className="grid gap-6 lg:grid-cols-2">
                    {/* Left: Personal Information */}
                    <div className="rounded-2xl border border-border bg-background p-5">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-accent mb-4">Personal Information</h3>
                      <div className="space-y-3">
                        {[
                          { label: "Full Name", value: selectedStudent.name },
                          { label: "Roll Number", value: selectedStudent.rollNumber },
                          { label: "Class", value: profileDetails.personal.className || selectedStudent.className },
                          { label: "Gender", value: profileDetails.personal.gender || "—" },
                          { label: "Date of Birth", value: profileDetails.personal.dateOfBirth || "—" },
                          {
                            label: "Age",
                            value: profileDetails.personal.dateOfBirth
                              ? `${Math.floor((Date.now() - new Date(profileDetails.personal.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} Years`
                              : "—",
                          },
                          { label: "Phone", value: profileDetails.personal.phoneNumber || "—" },
                          { label: "Address", value: profileDetails.personal.address || "—" },
                        ].map(({ label, value }) => (
                          <div key={label} className="flex justify-between items-start gap-3 py-1 border-b border-border/50 last:border-0">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium shrink-0">{label}</span>
                            <span className="text-xs font-semibold text-foreground text-right">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Right: Academic Status + Progress */}
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-border bg-background p-5">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-accent mb-4">Academic Status</h3>
                        <div className="space-y-3">
                          {[
                            { label: "Join Date", value: profileDetails.personal.joinDate || "—" },
                            { label: "Admission No.", value: profileDetails.personal.admissionNumber || "—" },
                            { label: "Current GPA", value: profileDetails.personal.currentGPA || "—" },
                            { label: "Class Rank", value: profileDetails.personal.currentRank ? `#${profileDetails.personal.currentRank}` : "—" },
                          ].map(({ label, value }) => (
                            <div key={label} className="flex justify-between items-start gap-3 py-1 border-b border-border/50 last:border-0">
                              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium shrink-0">{label}</span>
                              <span className="text-xs font-semibold text-foreground text-right">{value}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Performance metrics card */}
                      <div className="rounded-2xl border border-border bg-background p-5">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-accent mb-4">Performance Metrics</h3>
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between mb-1.5">
                              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Attendance</span>
                              <span className={`text-xs font-bold ${profileDetails.personal.attendancePct >= 85 ? "text-emerald-500" : profileDetails.personal.attendancePct >= 70 ? "text-amber-500" : "text-rose-500"}`}>{profileDetails.personal.attendancePct}%</span>
                            </div>
                            <ProgressBar pct={profileDetails.personal.attendancePct} color={riskBarColor(profileDetails.personal.attendancePct)} />
                          </div>
                          <div>
                            <div className="flex justify-between mb-1.5">
                              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Performance</span>
                              <span className={`text-xs font-bold ${profileDetails.personal.performancePct >= 80 ? "text-emerald-500" : profileDetails.personal.performancePct >= 60 ? "text-amber-500" : "text-rose-500"}`}>{profileDetails.personal.performancePct}%</span>
                            </div>
                            <ProgressBar pct={profileDetails.personal.performancePct} color={riskBarColor(profileDetails.personal.performancePct)} />
                          </div>
                          <div className="flex justify-between items-center pt-1">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Risk Level</span>
                            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${riskBadge(profileDetails.personal.riskLevel).color}`}>
                              {profileDetails.personal.riskLevel === "low" ? "Low" : profileDetails.personal.riskLevel === "medium" ? "Medium" : "High"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : profileTab === "personal" ? (
                  <EmptyState title="No Personal Data Available" message="No student records have been entered yet." />
                ) : profileTab === "academic" ? (
                  profileDetails?.academic && profileDetails.academic.examHistory.length > 0 ? (
                    <div className="space-y-5">

                      {/* ── Header: title + subject dropdown + pagination ── */}
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-accent">
                          Recent Exam Results
                        </h3>

                        <div className="flex items-center gap-2">
                          {/* Subject Filter Dropdown */}
                          <select
                            value={selectedSubject}
                            onChange={(e) => {
                              setSelectedSubject(e.target.value);
                              setExamPage(0);
                            }}
                            className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent/50 transition"
                          >
                            <option value="All">All Subjects</option>
                            {allSubjectsList.map((subject) => (
                              <option key={subject} value={subject}>
                                {subject}
                              </option>
                            ))}
                          </select>

                          {/* Pagination arrows — only shown when needed */}
                          {filteredExams.length > EXAMS_PER_PAGE && (
                            <div className="flex items-center gap-1">
                              <button
                                disabled={examPage === 0}
                                onClick={() => setExamPage((p) => Math.max(0, p - 1))}
                                className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-background text-xs text-foreground transition hover:bg-hover disabled:opacity-40 disabled:cursor-not-allowed"
                                aria-label="Previous page"
                              >
                                &#8249;
                              </button>
                              <span className="text-[10px] text-muted-foreground px-1">
                                {examPage + 1}/{Math.ceil(filteredExams.length / EXAMS_PER_PAGE)}
                              </span>
                              <button
                                disabled={(examPage + 1) * EXAMS_PER_PAGE >= filteredExams.length}
                                onClick={() => setExamPage((p) => p + 1)}
                                className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-background text-xs text-foreground transition hover:bg-hover disabled:opacity-40 disabled:cursor-not-allowed"
                                aria-label="Next page"
                              >
                                &#8250;
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* ── Exam Results Table or Empty State ── */}
                      {filteredExams.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center rounded-2xl border border-dashed border-border bg-background">
                          <svg className="mx-auto h-8 w-8 text-muted-foreground/30 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          <p className="text-sm font-semibold text-foreground">No exams for this subject yet.</p>
                          <p className="text-xs text-muted-foreground mt-1">Try selecting a different subject or "All Subjects".</p>
                        </div>
                      ) : (
                        /* Horizontally scrollable table — modal size stays fixed */
                        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
                          <table
                            className="w-full text-left text-sm"
                            style={{ minWidth: `${Math.max(560, 200 + subjectsToRender.length * 120)}px` }}
                          >
                            <thead className="border-b border-border bg-background/60 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                              <tr>
                                <th className="px-5 py-3 whitespace-nowrap">Exam</th>
                                <th className="px-5 py-3 whitespace-nowrap">Date</th>
                                {subjectsToRender.map((subject) => (
                                  <th key={subject} className="px-5 py-3 whitespace-nowrap">{subject}</th>
                                ))}
                                <th className="px-5 py-3 whitespace-nowrap text-cyan-500">Avg %</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                              {paginatedExams.map((exam, idx) => (
                                <tr key={idx} className="hover:bg-hover/50 transition duration-150">
                                  <td className="px-5 py-3 font-semibold text-foreground whitespace-nowrap">{exam.exam}</td>
                                  <td className="px-5 py-3 text-xs text-muted-foreground whitespace-nowrap">{exam.date}</td>
                                  {subjectsToRender.map((subject) => {
                                    const subScore = exam.subjects.find((s) => s.name === subject);
                                    const pct = subScore ? Math.round((subScore.marks / exam.maxMarks) * 100) : null;
                                    return (
                                      <td key={subject} className="px-5 py-3 whitespace-nowrap">
                                        {subScore !== undefined ? (
                                          <div className="flex items-baseline gap-1">
                                            <span className={`font-semibold ${pct !== null && pct >= 75 ? "text-emerald-500" : pct !== null && pct >= 50 ? "text-amber-500" : "text-rose-500"}`}>
                                              {subScore.marks}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground">/ {exam.maxMarks}</span>
                                          </div>
                                        ) : (
                                          <span className="text-muted-foreground">—</span>
                                        )}
                                      </td>
                                    );
                                  })}
                                  <td className="px-5 py-3 whitespace-nowrap">
                                    <span className={`font-bold text-sm ${exam.average >= 75 ? "text-emerald-500" : exam.average >= 50 ? "text-amber-500" : "text-rose-500"}`}>
                                      {exam.average}%
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* ── Performance Trend Chart ── */}
                      <div className="rounded-2xl border border-border bg-background p-5">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-accent mb-4">Performance Trend</h3>
                        <div className="h-[200px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={profileDetails.academic.examHistory.map((e) => ({ name: e.exam, score: e.average }))}>
                              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} />
                              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                              <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", fontSize: "11px" }} />
                              <Line type="monotone" dataKey="score" stroke="#22d3ee" strokeWidth={2.5} dot={{ r: 4, fill: "#22d3ee" }} activeDot={{ r: 6 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <EmptyState title="No Exam Records Available" message="No exam results have been recorded yet." />
                  )
                ) : profileTab === "performance" ? (
                  profileDetails?.performance ? (
                    <div className="space-y-5">
                      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
                        {[
                          { label: "Attendance", value: `${profileDetails.performance.kpis.attendancePct}%`, color: "text-cyan-500" },
                          { label: "Exam Average", value: `${profileDetails.performance.kpis.examAvg}%`, color: "text-emerald-500" },
                          { label: "Assignments", value: `${profileDetails.performance.kpis.assignmentPct}%`, color: "text-amber-500" },
                          {
                            label: "Overall",
                            value: profileDetails.performance.kpis.overallRating >= 85 ? "Excellent" : profileDetails.performance.kpis.overallRating >= 70 ? "Good" : profileDetails.performance.kpis.overallRating >= 50 ? "Average" : "Needs Work",
                            color: "text-rose-500",
                          },
                        ].map(({ label, value, color }) => (
                          <div key={label} className="rounded-xl border border-border bg-background p-4">
                            <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold mb-2">{label}</p>
                            <p className={`text-base font-bold ${color}`}>{value}</p>
                          </div>
                        ))}
                      </div>
                      <div className="grid gap-4 lg:grid-cols-2">
                        <div className="rounded-2xl border border-border bg-background p-5">
                          <h3 className="text-xs font-bold uppercase tracking-widest text-accent mb-4">Performance Radar</h3>
                          <div className="h-[220px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <RadarChart data={profileDetails.performance.radarData}>
                                <PolarGrid stroke="var(--border)" strokeOpacity={0.5} />
                                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                                <PolarRadiusAxis angle={30} domain={[0, 5]} tick={false} axisLine={false} />
                                <Radar dataKey="value" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.25} strokeWidth={2} />
                              </RadarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                        <div className="rounded-2xl border border-border bg-background p-5">
                          <h3 className="text-xs font-bold uppercase tracking-widest text-accent mb-4">Score Trend</h3>
                          <div className="h-[220px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={profileDetails.performance.lineData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} />
                                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", fontSize: "11px" }} />
                                <Line type="monotone" dataKey="score" stroke="#22d3ee" strokeWidth={2.5} dot={{ r: 4, fill: "#22d3ee" }} activeDot={{ r: 6 }} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>
                      {profileDetails.performance.aiInsights && profileDetails.performance.aiInsights.length > 0 ? (
                        <div className="rounded-2xl border border-border bg-background p-5">
                          <h3 className="text-xs font-bold uppercase tracking-widest text-accent mb-4">AI Insights</h3>
                          <div className="space-y-2.5">
                            {profileDetails.performance.aiInsights.map((insight, i) => (
                              <div key={i} className="flex gap-3 rounded-xl bg-amber-500/5 border border-amber-500/15 p-3">
                                <span className="text-amber-500 shrink-0 mt-0.5">💡</span>
                                <p className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed">{insight}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <EmptyState title="Insufficient Data For Insights" message="Not enough data available to generate AI insights." />
                      )}
                    </div>
                  ) : (
                    <EmptyState title="No Performance Data Available" message="No performance records have been entered yet." />
                  )
                ) : profileTab === "guardian" ? (
                  profileDetails?.guardian && (profileDetails.guardian.parentName || profileDetails.guardian.phone || profileDetails.guardian.email) ? (
                    /* ── Guardian Tab ── */
                    <div className="grid gap-5 lg:grid-cols-2">
                      {/* Left: Contact Details */}
                      <div className="rounded-2xl border border-border bg-background p-5">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-accent mb-4">Contact Information</h3>
                        <div className="space-y-3">
                          {[
                            { label: "Parent / Guardian Name", value: profileDetails.guardian.parentName || "—" },
                            { label: "Relationship", value: profileDetails.guardian.relationship || "—" },
                            { label: "Phone Number", value: profileDetails.guardian.phone || "—" },
                            { label: "Email Address", value: profileDetails.guardian.email || "—" },
                            { label: "Occupation", value: profileDetails.guardian.occupation || "—" },
                          ].map(({ label, value }) => (
                            <div key={label} className="flex justify-between items-start gap-3 py-2 border-b border-border/50 last:border-0">
                              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold shrink-0">{label}</span>
                              <span className="text-xs font-medium text-foreground text-right">{value}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Right: Address + Quick Actions */}
                      <div className="space-y-4">
                        <div className="rounded-2xl border border-border bg-background p-5">
                          <h3 className="text-xs font-bold uppercase tracking-widest text-accent mb-4">Address &amp; Actions</h3>
                          {profileDetails.guardian.address ? (
                            <div className="rounded-xl border border-border bg-cyan-500/5 p-4 mb-4">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1.5">Home Address</p>
                              <p className="text-sm text-foreground leading-relaxed">{profileDetails.guardian.address}</p>
                            </div>
                          ) : (
                            <div className="rounded-xl border border-dashed border-border p-4 mb-4 text-center">
                              <p className="text-xs text-muted-foreground">No address on file</p>
                            </div>
                          )}
                          {/* Quick contact actions */}
                          <div className="flex gap-2">
                            {profileDetails.guardian.phone && (
                              <a href={`tel:${profileDetails.guardian.phone}`}
                                className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-hover transition">
                                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8 19.79 19.79 0 01.07 1.18 2 2 0 012 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14.92z" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                Call
                              </a>
                            )}
                            {profileDetails.guardian.email && (
                              <a href={`mailto:${profileDetails.guardian.email}`}
                                className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-hover transition">
                                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
                                </svg>
                                Email
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <EmptyState title="No Guardian Information Available" message="No guardian records have been entered yet." />
                  )
                ) : (
                  <EmptyState title="No Data Available" message="No records have been entered yet." />
                )}
              </div>
            </div>
          </div>
        )
      }
    </div>
  );
}
