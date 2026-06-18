"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { TeacherDashboardData } from "@/lib/teacher-dashboard.service";

type Props = {
  userName: string;
  dashboard: TeacherDashboardData;
  teacherDept: string | null;
};

const tooltipStyle = {
  backgroundColor: "var(--card)",
  backdropFilter: "blur(16px)",
  border: "1px solid var(--border)",
  borderRadius: "14px",
  color: "var(--foreground)",
  boxShadow: "var(--shadow-md)",
  padding: "10px 14px",
  fontSize: "12px",
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
  color: "blue" | "amber" | "rose" | "emerald" | "cyan" | "violet";
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
    violet: {
      bg: "from-violet-500/15 via-indigo-400/8 to-white dark:from-violet-500/15 dark:via-indigo-400/5 dark:to-transparent",
      border: "border-indigo-100 dark:border-indigo-500/10 hover:border-indigo-300 dark:hover:border-indigo-500/30",
      icon: "bg-violet-500/15 text-violet-700 dark:text-violet-500",
      val: "group-hover:text-violet-700 dark:group-hover:text-violet-400",
    },
  };
  const c = colorMap[color];
  return (
    <div
      className={`rounded-2xl border bg-gradient-to-br p-6 shadow-sm hover:-translate-y-1 transition-all duration-300 group ${c.bg} ${c.border}`}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {label}
          </p>
          <p className={`mt-3 text-3xl font-bold tracking-tight text-foreground ${c.val} transition duration-300`}>
            {value}
          </p>
        </div>
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-all duration-300 ${c.icon} group-hover:scale-110`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function TeacherDashboardClient({ userName, dashboard, teacherDept }: Props) {
  const [perfMetric, setPerfMetric] = useState<"avgMarks" | "avgAttendance">("avgMarks");

  const { kpis, todayTimetable, classPerformance, aiInsights, recentAnnouncements, currentPeriod } = dashboard;

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8 space-y-8 transition-colors duration-200">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-500 dark:text-cyan-400">
          Faculty Portal
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Welcome back, {userName}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          {teacherDept ? `${teacherDept} Department · ` : ""}
          Your personal command center for today's classes, attendance, and grading.
        </p>
      </div>

      {/* Current Period Banner */}
      {currentPeriod && (
        <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 p-4 flex items-center gap-4 shadow-lg shadow-cyan-950/10">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400 shrink-0">
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/>
            </svg>
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-500">Now Teaching</p>
            <p className="text-sm font-bold text-foreground mt-0.5">
              {currentPeriod.subjectName} · {currentPeriod.className}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs font-semibold text-muted-foreground">Room {currentPeriod.roomNumber}</p>
            <p className="text-xs text-cyan-400 font-semibold mt-0.5">
              {currentPeriod.startTime.slice(0, 5)} – {currentPeriod.endTime.slice(0, 5)}
            </p>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Today's Classes"
          value={kpis.todaysClasses}
          color="blue"
          icon={
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
        />
        <KpiCard
          label="Pending Attendance"
          value={kpis.pendingAttendance}
          color="amber"
          icon={
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
          }
        />
        <KpiCard
          label="Pending Grading"
          value={kpis.pendingGrading}
          color="rose"
          icon={
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          }
        />
        <KpiCard
          label="Total Students"
          value={kpis.totalStudents}
          color="emerald"
          icon={
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          }
        />
      </section>

      {/* Row 2: Today's Timetable + Class Performance */}
      <section className="grid gap-6 lg:grid-cols-12">
        {/* Today's Timetable */}
        <div className="lg:col-span-4 rounded-2xl border border-border bg-card p-5 shadow-md flex flex-col transition-colors duration-200">
          <div className="shrink-0 mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground tracking-tight">Today's Timetable</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {new Date().toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
              </p>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide space-y-2">
            {todayTimetable.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-28 rounded-xl border border-dashed border-border text-center">
                <p className="text-xs text-muted-foreground">No classes scheduled today</p>
              </div>
            ) : (
              todayTimetable.map((entry) => (
                <div
                  key={entry.id}
                  className="group rounded-xl border border-subtle bg-hover/20 p-3 hover:bg-hover hover:border-border transition duration-200"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground group-hover:text-cyan-500 dark:group-hover:text-cyan-400 transition truncate">
                        {entry.subjectName}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{entry.className} · Room {entry.roomNumber}</p>
                    </div>
                    <span className="shrink-0 rounded-lg bg-blue-500/10 px-2 py-0.5 text-[9px] font-semibold text-blue-500 dark:text-blue-300 border border-blue-500/20">
                      {entry.startTime.slice(0, 5)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="shrink-0 mt-3 pt-3 border-t border-subtle">
            <Link
              href="/teacher/timetable"
              className="flex items-center justify-center gap-1.5 text-xs font-semibold text-cyan-500 dark:text-cyan-400 hover:text-cyan-600 transition"
            >
              View Full Timetable
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
                <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Class Performance Chart */}
        <div className="lg:col-span-8 rounded-2xl border border-border bg-card p-5 shadow-md flex flex-col transition-colors duration-200">
          <div className="shrink-0 mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-foreground tracking-tight">Class Performance Overview</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Average metrics across your assigned classes</p>
            </div>
            <div className="flex gap-1 rounded-xl border border-subtle bg-hover p-0.5 shrink-0">
              {(["avgMarks", "avgAttendance"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setPerfMetric(m)}
                  className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition ${
                    perfMetric === m
                      ? "bg-cyan-500/20 text-cyan-400"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m === "avgMarks" ? "Avg Marks" : "Attendance"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 min-h-[200px]">
            {classPerformance.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border">
                <svg viewBox="0 0 24 24" className="h-8 w-8 text-muted-foreground/30" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625Z" />
                </svg>
                <p className="text-xs text-muted-foreground">No data available for visualization</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={classPerformance} margin={{ left: -15, right: 10, top: 5, bottom: 5 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.3} />
                  <XAxis
                    dataKey="className"
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    dy={8}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v}%`}
                    dx={-4}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    cursor={{ fill: "var(--bg-hover)", radius: 6 }}
                  />
                  <Bar
                    dataKey={perfMetric}
                    name={perfMetric === "avgMarks" ? "Avg Marks" : "Attendance %"}
                    fill="#22d3ee"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={48}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>

      {/* Row 3: AI Teaching Assistant + Recent Announcements */}
      <section className="grid gap-6 lg:grid-cols-2">
        {/* AI Teaching Assistant */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-md flex flex-col transition-colors duration-200">
          <div className="shrink-0 mb-4 pb-3 border-b border-subtle flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-500">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21m0 0l-.813-5.096L3 15.094l5.096-.813L9 9.125l.813 5.156L15 15.094l-5.188.81Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.071 4.929a10 10 0 00-14.142 0M12 3v2" />
              </svg>
            </span>
            <div>
              <h2 className="text-base font-semibold text-foreground tracking-tight">AI Teaching Assistant</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Insights based on your class data</p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-hide space-y-2">
            {aiInsights.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-24 text-center rounded-xl border border-dashed border-border p-4">
                <p className="text-xs text-muted-foreground font-medium">AI requires more classroom data to generate insights.</p>
                <p className="text-[10px] text-muted-foreground mt-1">Mark attendance and enter marks to enable AI recommendations.</p>
              </div>
            ) : (
              aiInsights.map((insight) => (
                <div
                  key={insight.id}
                  className="group rounded-xl border border-subtle bg-hover/20 p-3.5 hover:bg-hover hover:border-border transition-all duration-300 flex items-start justify-between gap-3"
                >
                  <p className="text-xs text-secondary leading-relaxed font-medium">{insight.message}</p>
                  <span
                    className={`inline-flex shrink-0 items-center rounded-lg border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                      insight.severity === "high"
                        ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                        : insight.severity === "medium"
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    }`}
                  >
                    {insight.severity}
                  </span>
                </div>
              ))
            )}
          </div>
          <div className="shrink-0 mt-3 pt-3 border-t border-subtle">
            <Link
              href="/teacher/performance"
              className="flex items-center justify-center gap-1.5 text-xs font-semibold text-cyan-500 dark:text-cyan-400 hover:text-cyan-600 transition"
            >
              View AI Insights
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
                <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Recent Announcements */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-md flex flex-col transition-colors duration-200">
          <div className="shrink-0 mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground tracking-tight">Recent Announcements</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Teacher-specific notifications</p>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide space-y-2">
            {recentAnnouncements.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-24 rounded-xl border border-dashed border-border text-center">
                <p className="text-xs text-muted-foreground">No announcements available</p>
              </div>
            ) : (
              recentAnnouncements.map((ann) => {
                const priorityColor =
                  ann.priority === "high"
                    ? "border-l-rose-500 bg-rose-500/5"
                    : ann.priority === "medium"
                    ? "border-l-amber-500 bg-amber-500/5"
                    : "border-l-cyan-500 bg-cyan-500/5";
                return (
                  <div
                    key={ann.id}
                    className={`rounded-xl border border-subtle border-l-4 p-3 hover:bg-hover transition duration-200 ${priorityColor}`}
                  >
                    <p className="text-xs font-semibold text-foreground">{ann.title}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground leading-relaxed line-clamp-2">{ann.message}</p>
                    <p className="mt-1 text-[9px] text-muted-foreground">
                      {new Date(ann.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                    </p>
                  </div>
                );
              })
            )}
          </div>
          <div className="shrink-0 mt-3 pt-3 border-t border-subtle">
            <Link
              href="/teacher/notifications"
              className="flex items-center justify-center gap-1.5 text-xs font-semibold text-cyan-500 dark:text-cyan-400 hover:text-cyan-600 transition"
            >
              View All Notifications
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
                <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
              </svg>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
