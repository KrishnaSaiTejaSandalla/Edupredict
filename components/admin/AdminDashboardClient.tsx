"use client";

import { useState } from "react";
import useSWR from "swr";
import AiInsightsCard from "@/components/admin/AiInsightsCard";
import LatestList from "@/components/admin/LatestList";
import { DynamicDashboardCharts } from "@/components/admin/ClientChartWrappers";
import GenderDistribution from "@/components/admin/GenderDistribution";
import StudentsByClass from "@/components/admin/StudentsByClass";

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error("Failed to fetch dashboard data");
  return res.json();
});

const cardIcons = {
  students: () => (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  teachers: () => (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  attendance: () => (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18M9 16l2 2 4-4" />
    </svg>
  ),
  passRate: () => (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 17l6-6 4 4 6-6" />
      <path d="M4 21h16" />
    </svg>
  ),
};

export default function AdminDashboardClient() {
  const { data: dashboard, error, isLoading } = useSWR("/api/dashboard/admin", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  });

  const [activeAiTab, setActiveAiTab] = useState<"attendance" | "transport" | "workload" | "summary">("attendance");

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8 space-y-8 animate-pulse">
        <div>
          <div className="h-4 w-20 bg-muted rounded"></div>
          <div className="h-8 w-64 bg-muted rounded mt-2"></div>
          <div className="h-4 w-96 bg-muted rounded mt-2"></div>
        </div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-muted rounded-2xl border border-border/50"></div>
          ))}
        </div>
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-8 h-80 bg-muted rounded-2xl"></div>
          <div className="lg:col-span-4 h-80 bg-muted rounded-2xl"></div>
        </div>
      </main>
    );
  }

  if (error || !dashboard) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <p className="text-red-500 font-medium">Failed to load admin dashboard metrics.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  const kpiCards = [
    {
      label: "Total Students",
      value: dashboard.kpis.totalStudents.toLocaleString(),
      icon: cardIcons.students,
      bgGradient:
        "from-blue-500/15 via-blue-400/8 to-white dark:from-blue-500/15 dark:via-blue-400/5 dark:to-transparent",
      borderCls: "border-blue-100 dark:border-blue-500/10",
      hoverBorderCls: "hover:border-blue-300 dark:hover:border-blue-500/30",
      iconBg: "bg-blue-500/15 text-blue-700 dark:bg-blue-500/15  dark:text-blue-500",
      hoverText: "group-hover:text-blue-700 dark:group-hover:text-blue-400",
      href: "/admin/students",
    },
    {
      label: "Total Teachers",
      value: dashboard.kpis.totalTeachers.toLocaleString(),
      icon: cardIcons.teachers,
      bgGradient:
        "from-violet-500/15 via-indigo-400/8 to-white dark:from-violet-500/15 dark:via-indigo-400/5 dark:to-transparent",
      borderCls: "border-indigo-100 dark:border-indigo-500/10",
      hoverBorderCls: "hover:border-indigo-300 dark:hover:border-indigo-500/30",
      iconBg: "bg-violet-500/15 text-violet-700 dark:bg-violet-500/15  dark:text-violet-500",
      hoverText: "group-hover:text-violet-700 dark:group-hover:text-violet-400",
      href: "/admin/teachers",
    },
    {
      label: "Attendance Rate",
      value: `${dashboard.kpis.averageAttendance}%`,
      icon: cardIcons.attendance,
      bgGradient:
        "from-emerald-500/15 via-green-400/8 to-white dark:from-emerald-500/15 dark:via-green-400/5 dark:to-transparent",
      borderCls: "border-emerald-100 dark:border-emerald-500/10",
      hoverBorderCls: "hover:border-emerald-300 dark:hover:border-emerald-500/30",
      iconBg: "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/15  dark:text-emerald-500",
      hoverText: "group-hover:text-emerald-700 dark:group-hover:text-emerald-400",
      href: "/admin/attendance",
    },
    {
      label: "Pass Rate",
      value: `${dashboard.kpis.passRate}%`,
      icon: cardIcons.passRate,
      bgGradient:
        "from-amber-500/15 via-yellow-400/8 to-white dark:from-amber-500/15 dark:via-yellow-400/5 dark:to-transparent",
      borderCls: "border-amber-100 dark:border-amber-500/10",
      hoverBorderCls: "hover:border-amber-300 dark:hover:border-amber-500/30",
      iconBg: "bg-amber-500/15 text-amber-700 dark:bg-amber-500/15  dark:text-amber-500",
      hoverText: "group-hover:text-amber-700 dark:group-hover:text-amber-400",
      href: "/admin/marks/results",
    },
  ];

  const attendanceRisks = dashboard.attendanceRisks || [];
  const transportDelays = dashboard.transportDelays || [];
  const teacherWorkloads = dashboard.teacherWorkloads || [];
  const monthlySummary = dashboard.monthlySummary || null;

  return (
    <main className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8 space-y-8 transition-colors duration-200">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-500 dark:text-cyan-400">Overview</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          School Admin Dashboard
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Monitor real-time academic metrics, staffing structures, student logs, and predictive AI analytics.
        </p>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────────── */}
      <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card) => (
          <a
            key={card.label}
            href={card.href}
            className={`rounded-2xl border bg-gradient-to-br p-6 shadow-sm hover:-translate-y-1 transition-all duration-300 group ${card.bgGradient} ${card.borderCls} ${card.hoverBorderCls}`}
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{card.label}</p>
                <p className={`mt-3 text-3xl font-bold tracking-tight text-foreground ${card.hoverText} transition duration-300`}>
                  {card.value}
                </p>
              </div>
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-all duration-300 ${card.iconBg} group-hover:scale-110`}>
                {card.icon()}
              </div>
            </div>
          </a>
        ))}
      </section>

      {/* ── AI Intelligence Operations Center ──────────────────────────── */}
      <section className="bg-card border border-border/40 rounded-3xl p-6 shadow-xl space-y-5 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/30 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground tracking-tight">AI Predictive Operations</h2>
              <p className="text-xs text-muted-foreground">Automated risk detection, fleet diagnostics, and monthly summaries</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 bg-background/50 p-1 rounded-2xl border border-border/30 overflow-x-auto scrollbar-hide">
            <button
              type="button"
              onClick={() => setActiveAiTab("attendance")}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition shrink-0 ${
                activeAiTab === "attendance"
                  ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-hover"
              }`}
            >
              Attendance Risk ({attendanceRisks.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveAiTab("transport")}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition shrink-0 ${
                activeAiTab === "transport"
                  ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-hover"
              }`}
            >
              Transport Diagnostics ({transportDelays.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveAiTab("workload")}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition shrink-0 ${
                activeAiTab === "workload"
                  ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-hover"
              }`}
            >
              Teacher Workload ({teacherWorkloads.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveAiTab("summary")}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition shrink-0 ${
                activeAiTab === "summary"
                  ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-hover"
              }`}
            >
              Monthly Summary
            </button>
          </div>
        </div>

        {/* Tab 1: Attendance Risk Prediction */}
        {activeAiTab === "attendance" && (
          <div className="space-y-4">
            {attendanceRisks.length === 0 ? (
              <div className="p-8 text-center bg-background/20 rounded-2xl border border-dashed border-border/40">
                <p className="text-xs text-muted-foreground font-semibold">No students are currently flagged for attendance risks.</p>
              </div>
            ) : (
              <div className="grid gap-3.5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {attendanceRisks.map((student: any) => (
                  <div
                    key={student.id}
                    className={`rounded-2xl border p-4 transition-all duration-200 bg-background/40 hover:bg-card space-y-2.5 ${
                      student.riskLevel === 'high'
                        ? 'border-rose-500/30 shadow-sm shadow-rose-500/5'
                        : 'border-amber-500/30 shadow-sm shadow-amber-500/5'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-xs font-bold text-foreground">{student.name}</h3>
                        <p className="text-[10px] text-muted-foreground">{student.className}</p>
                      </div>
                      <span
                        className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-lg border ${
                          student.riskLevel === 'high'
                            ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                            : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {student.riskLevel} Risk
                      </span>
                    </div>

                    <p className="text-xs text-secondary leading-relaxed">
                      {student.reason}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-border/20 text-[10px]">
                      <span className="font-mono text-muted-foreground">Rate: <strong className="text-foreground">{student.attendanceRate}%</strong></span>
                      {student.consecutiveAbsences > 0 && (
                        <span className="text-rose-400 font-semibold">
                          {student.consecutiveAbsences} consecutive absences
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Transport Delay Prediction */}
        {activeAiTab === "transport" && (
          <div className="space-y-4">
            {transportDelays.length === 0 ? (
              <div className="p-8 text-center bg-background/20 rounded-2xl border border-dashed border-border/40">
                <p className="text-xs text-muted-foreground font-semibold">No active transport routes or buses registered in the system.</p>
              </div>
            ) : (
              <div className="grid gap-3.5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {transportDelays.map((bus: any) => (
                  <div
                    key={bus.busId}
                    className={`rounded-2xl border p-4 transition-all duration-200 bg-background/40 hover:bg-card space-y-2.5 ${
                      bus.riskLevel === 'high'
                        ? 'border-rose-500/30'
                        : bus.riskLevel === 'medium'
                        ? 'border-amber-500/30'
                        : 'border-border/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-xs font-bold text-foreground">Bus {bus.busNumber}</h3>
                        <p className="text-[10px] text-muted-foreground truncate max-w-[170px]">{bus.routeName}</p>
                      </div>
                      <span
                        className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-lg border ${
                          bus.riskLevel === 'high'
                            ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                            : bus.riskLevel === 'medium'
                            ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                            : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        }`}
                      >
                        {bus.expectedIssue}
                      </span>
                    </div>

                    <p className="text-xs text-secondary leading-relaxed">
                      {bus.reason}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-border/20 text-[10px]">
                      <span className="text-muted-foreground">Status: <strong className="text-foreground capitalize">{bus.lastKnownStatus || 'Normal'}</strong></span>
                      {bus.affectedStops && (
                        <span className="text-cyan-400 font-semibold">{bus.affectedStops}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Teacher Workload Analysis */}
        {activeAiTab === "workload" && (
          <div className="space-y-4">
            {teacherWorkloads.length === 0 ? (
              <div className="p-8 text-center bg-background/20 rounded-2xl border border-dashed border-border/40">
                <p className="text-xs text-muted-foreground font-semibold">No faculty workload metrics available yet.</p>
              </div>
            ) : (
              <div className="grid gap-3.5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {teacherWorkloads.map((teacher: any) => (
                  <div
                    key={teacher.teacherId}
                    className={`rounded-2xl border p-4 transition-all duration-200 bg-background/40 hover:bg-card space-y-2.5 ${
                      teacher.status === 'High Workload'
                        ? 'border-amber-500/30'
                        : 'border-border/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-xs font-bold text-foreground">{teacher.name}</h3>
                        <p className="text-[10px] text-muted-foreground">
                          {teacher.classLoad} sections • {teacher.studentCount} students
                        </p>
                      </div>
                      <span
                        className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-lg border ${
                          teacher.status === 'High Workload'
                            ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                            : teacher.status === 'Underloaded'
                            ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                            : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        }`}
                      >
                        {teacher.status}
                      </span>
                    </div>

                    {teacher.imbalanceReason ? (
                      <p className="text-xs text-secondary leading-relaxed">
                        {teacher.imbalanceReason}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Balanced academic responsibility across assigned subject classes.
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-border/20 text-[10px]">
                      <span className="text-muted-foreground">Subjects: <strong className="text-foreground">{teacher.subjectCount}</strong></span>
                      <span className="text-cyan-400 font-semibold">{teacher.assignmentsCount} assignments</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Monthly School Summary */}
        {activeAiTab === "summary" && (
          <div className="space-y-4">
            {monthlySummary ? (
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {/* Top Insights */}
                <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-4 space-y-2.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-400 block">
                    🌟 Top Insights ({monthlySummary.monthName})
                  </span>
                  <ul className="space-y-1.5 text-xs text-secondary list-disc pl-4 leading-relaxed">
                    {monthlySummary.topInsights.map((item: string, i: number) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>

                {/* What Improved */}
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 block">
                    📈 What Improved
                  </span>
                  <ul className="space-y-1.5 text-xs text-secondary list-disc pl-4 leading-relaxed">
                    {monthlySummary.whatImproved.map((item: string, i: number) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>

                {/* Needs Attention */}
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4 space-y-2.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-400 block">
                    ⚠️ Needs Attention
                  </span>
                  <ul className="space-y-1.5 text-xs text-secondary list-disc pl-4 leading-relaxed">
                    {monthlySummary.needsAttention.map((item: string, i: number) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>

                {/* Potential Risks */}
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-2.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 block">
                    🛡️ Potential Risks
                  </span>
                  <ul className="space-y-1.5 text-xs text-secondary list-disc pl-4 leading-relaxed">
                    {monthlySummary.potentialRisks.map((item: string, i: number) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>

                {/* Recommended Actions */}
                <div className="rounded-2xl border border-violet-500/30 bg-violet-500/5 p-4 space-y-2.5 md:col-span-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-violet-400 block">
                    🚀 Recommended Administrative Actions
                  </span>
                  <ul className="space-y-1.5 text-xs text-secondary list-disc pl-4 leading-relaxed">
                    {monthlySummary.recommendedActions.map((item: string, i: number) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center bg-background/20 rounded-2xl border border-dashed border-border/40">
                <p className="text-xs text-muted-foreground font-semibold">Generating monthly summary from active database records...</p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Row 1: Charts + Gender Distribution ────────────────────────── */}
      <section className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <DynamicDashboardCharts trend={dashboard.trend} attendanceTrend={dashboard.attendanceTrend} />
        </div>
        <div className="lg:col-span-4">
          <GenderDistribution data={dashboard.genderDistribution} />
        </div>
      </section>

      {/* ── Recent Students vs Upcoming Exams & System Alerts ────────── */}
      <section className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <LatestList
            title="Recent Students"
            items={dashboard.recentStudents}
            viewAllHref="/admin/students"
          />
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Upcoming Exams */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-md h-[213px] flex flex-col transition-colors duration-200">
            <div className="shrink-0 mb-3">
              <h2 className="text-base font-semibold text-foreground tracking-tight">Upcoming Exams</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Next scheduled assessments</p>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 scrollbar-hide space-y-2.5">
              {dashboard.upcomingExams.map((exam: any) => (
                <div
                  key={exam.id}
                  className="group rounded-xl border border-subtle bg-hover/20 p-3 hover:bg-hover hover:border-border transition duration-200"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition truncate">
                        {exam.subjectName}
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">{exam.className}</p>
                    </div>
                    <span className="inline-flex shrink-0 items-center rounded-lg bg-blue-500/10 px-2 py-0.5 text-[9px] font-semibold text-blue-500 dark:text-blue-300 border border-blue-500/20">
                      {exam.examDate}
                    </span>
                  </div>
                </div>
              ))}
              {dashboard.upcomingExams.length === 0 && (
                <div className="h-full flex items-center justify-center rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                  No upcoming exams scheduled.
                </div>
              )}
            </div>
          </div>

          {/* System Alerts */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-md h-[213px] flex flex-col transition-colors duration-200">
            <div className="shrink-0 mb-3">
              <h2 className="text-base font-semibold text-foreground tracking-tight">System Alerts</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Unread notifications and urgent feeds</p>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 scrollbar-hide space-y-2.5">
              {(() => {
                const seen = new Set<string>();
                const uniqueAlerts = dashboard.alerts.filter((alert: any) => {
                  const key = `${alert.title?.trim()}|||${alert.message?.trim()}`;
                  if (seen.has(key)) return false;
                  seen.add(key);
                  return true;
                });
                return uniqueAlerts.map((alert: any) => {
                  const borderTone =
                    alert.tone === "danger"
                      ? "border-l-4 border-l-rose-500 bg-rose-500/5 border-subtle"
                      : alert.tone === "warning"
                        ? "border-l-4 border-l-amber-500 bg-amber-500/5 border-subtle"
                        : "border-l-4 border-l-cyan-500 bg-cyan-500/5 border-subtle";

                  return (
                    <div
                      key={alert.id}
                      className={`rounded-xl border p-3 transition hover:bg-hover duration-200 ${borderTone}`}
                    >
                      <p className="text-xs font-semibold text-foreground">{alert.title}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground leading-relaxed">{alert.message}</p>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      </section>

      {/* ── AI Insights vs Students by Class ─────────────────────────── */}
      <section className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <AiInsightsCard insights={dashboard.aiInsights} />
        </div>
        <div className="lg:col-span-5">
          <StudentsByClass data={dashboard.classDistribution} />
        </div>
      </section>
    </main>
  );
}
