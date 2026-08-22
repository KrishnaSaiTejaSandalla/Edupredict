"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { TeacherDashboardData } from "@/lib/teacher-dashboard.service";
import FormattedText from "@/components/shared/FormattedText";

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

type ProactiveInsight = {
  type: string;
  severity: "high" | "medium" | "low" | string;
  title: string;
  evidence: string[];
  recommendation: string;
  affectedStudents?: string[];
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
  const { kpis, todayTimetable, classPerformance, recentAnnouncements, currentPeriod } = dashboard;

  // Proactive Insights state
  const [proactiveInsights, setProactiveInsights] = useState<ProactiveInsight[]>([]);
  const [allClearMessage, setAllClearMessage] = useState<string | null>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(true);
  const [expandedInsightIdx, setExpandedInsightIdx] = useState<number | null>(0);

  // Interactive Assistant Chat State
  const [assistantMessages, setAssistantMessages] = useState<Array<{ role: "user" | "assistant"; text: string }>>([]);
  const [assistantInput, setAssistantInput] = useState("");
  const [isAskingAI, setIsAskingAI] = useState(false);

  // Monthly Summary state
  const [monthlyNarrative, setMonthlyNarrative] = useState<string | null>(null);
  const [monthlyLabel, setMonthlyLabel] = useState<string>("");
  const [isLoadingMonthly, setIsLoadingMonthly] = useState(false);
  const [showMonthly, setShowMonthly] = useState(false);

  // Load Proactive Insights on mount
  useEffect(() => {
    async function loadInsights() {
      setIsLoadingInsights(true);
      try {
        const res = await fetch("/api/teacher/ai/assistant");
        const data = await res.json();
        if (data.insights) setProactiveInsights(data.insights);
        if (data.allClear) setAllClearMessage(data.message);
      } catch (err) {
        console.error("Failed to load proactive insights:", err);
      } finally {
        setIsLoadingInsights(false);
      }
    }
    loadInsights();
  }, []);

  // Load Monthly Summary on demand
  const handleToggleMonthly = async () => {
    if (!showMonthly && !monthlyNarrative) {
      setIsLoadingMonthly(true);
      try {
        const res = await fetch("/api/teacher/ai/monthly-summary");
        const data = await res.json();
        if (data.narrative) {
          setMonthlyNarrative(data.narrative);
          setMonthlyLabel(data.month || "Current Month");
        } else if (data.message) {
          setMonthlyNarrative(`> **${data.month || "Notice"}**: ${data.message}`);
          setMonthlyLabel(data.month || "Current Month");
        }
      } catch (err) {
        setMonthlyNarrative("Unable to load monthly summary right now.");
      } finally {
        setIsLoadingMonthly(false);
      }
    }
    setShowMonthly(!showMonthly);
  };

  const handleAskAssistant = async (queryText: string) => {
    if (!queryText.trim() || isAskingAI) return;
    const userQuery = queryText.trim();
    setAssistantMessages((prev) => [...prev, { role: "user", text: userQuery }]);
    setAssistantInput("");
    setIsAskingAI(true);

    try {
      const res = await fetch("/api/teacher/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: userQuery }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Assistant response failed");
      setAssistantMessages((prev) => [...prev, { role: "assistant", text: data.reply || "No response generated." }]);
    } catch (err: any) {
      setAssistantMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Unable to process request right now. Please try again." },
      ]);
    } finally {
      setIsAskingAI(false);
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
          {teacherDept ? `${teacherDept} Department Â· ` : ""}
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
              {currentPeriod.subjectName} Â· {currentPeriod.className}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs font-semibold text-muted-foreground">Room {currentPeriod.roomNumber}</p>
            <p className="text-xs text-cyan-400 font-semibold mt-0.5">
              {currentPeriod.startTime.slice(0, 5)} â€“ {currentPeriod.endTime.slice(0, 5)}
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

      {/* Monthly Summary Accordion */}
      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm transition-all">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
              ðŸ“Š
            </span>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Monthly AI Teaching Summary</h2>
              <p className="text-[11px] text-muted-foreground">Aggregated analysis from actual attendance, assessment, and grading records</p>
            </div>
          </div>
          <button
            onClick={handleToggleMonthly}
            className="rounded-xl border border-subtle bg-hover px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-hover/80 transition flex items-center gap-1.5"
          >
            {isLoadingMonthly ? (
              <span className="h-3 w-3 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
            ) : showMonthly ? (
              "Hide Summary â–²"
            ) : (
              "View Monthly Summary â–¼"
            )}
          </button>
        </div>

        {showMonthly && (
          <div className="mt-4 pt-4 border-t border-subtle">
            {isLoadingMonthly ? (
              <div className="p-6 text-center text-xs text-muted-foreground animate-pulse">
                Analyzing monthly attendance, marks, and assignment completion...
              </div>
            ) : monthlyNarrative ? (
              <div className="bg-background/60 rounded-xl p-5 border border-subtle/60 shadow-inner">
                <FormattedText text={monthlyNarrative} />
              </div>
            ) : null}

          </div>
        )}
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
                      <p className="text-[11px] text-muted-foreground mt-0.5">{entry.className}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[11px] font-medium text-foreground">{entry.startTime.slice(0, 5)}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Rm {entry.roomNumber}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
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
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar
                    dataKey={perfMetric}
                    fill={perfMetric === "avgMarks" ? "#06b6d4" : "#10b981"}
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>

      {/* Row 3: Interactive Assistant + Proactive AI Insights & Announcements */}
      <section className="grid gap-6 lg:grid-cols-12 items-stretch">
        {/* Interactive Co-Pilot Q&A â€” wider left column */}
        <div className="lg:col-span-7 flex flex-col">
          {/* AI Faculty Co-Pilot Interactive Q&A */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-md flex flex-col h-full transition-colors duration-200">
            <div className="shrink-0 mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400">
                  ðŸ’¬
                </span>
                <div>
                  <h2 className="text-base font-semibold text-foreground tracking-tight">Ask Co-Pilot</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Interactive Q&A on your students and classes</p>
                </div>
              </div>
            </div>

            {/* Dynamic Quick Prompt Chips */}
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {[
                "Which students need attention today?",
                "Show students with low attendance",
                "How to improve my class score average?",
                "Summary of my pending grading",
              ].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => handleAskAssistant(chip)}
                  disabled={isAskingAI}
                  className="rounded-lg border border-subtle bg-hover/30 px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-cyan-400 hover:border-cyan-500/30 transition disabled:opacity-50 text-left"
                >
                  âš¡ {chip}
                </button>
              ))}
            </div>

            {/* Chat Response Area */}
            <div className="flex-1 overflow-y-auto max-h-[380px] min-h-[260px] scrollbar-hide space-y-2.5 rounded-xl border border-subtle bg-background/50 p-3.5">
              {assistantMessages.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-xs font-medium text-muted-foreground">
                    Ask any question about your students, weak topics, or lesson strategy.
                  </p>
                  <p className="text-[10px] text-muted-foreground/70 mt-1">
                    Tap a quick chip above or type your question below.
                  </p>
                </div>
              ) : (
                assistantMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`rounded-xl p-3 text-xs leading-relaxed ${
                      msg.role === "user"
                        ? "bg-cyan-500/10 text-cyan-200 border border-cyan-500/20 ml-6 font-medium"
                        : "bg-card border border-border text-foreground mr-2 shadow-sm font-normal"
                    }`}
                  >
                    {msg.role === "user" ? (
                      msg.text
                    ) : (
                      <FormattedText text={msg.text} />
                    )}
                  </div>
                ))
              )}
              {isAskingAI && (
                <div className="flex items-center gap-2 rounded-xl bg-card border border-border p-3 text-xs text-muted-foreground animate-pulse">
                  <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                  Generating live response from your database records...
                </div>
              )}
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (assistantInput.trim()) handleAskAssistant(assistantInput);
              }}
              className="mt-3.5 flex gap-2"
            >
              <input
                type="text"
                placeholder="Ask about a student, class trend, or teaching plan..."
                className="input-theme flex-1 text-xs"
                value={assistantInput}
                onChange={(e) => setAssistantInput(e.target.value)}
                disabled={isAskingAI}
              />
              <button
                type="submit"
                disabled={isAskingAI || !assistantInput.trim()}
                className="btn-cyan rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-50 shrink-0"
              >
                Ask
              </button>
            </form>

          </div>
        </div>

        {/* Proactive AI Insights + Announcements â€” right column */}
        <div className="lg:col-span-5 space-y-6 flex flex-col">
          {/* Proactive Class Insights */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-md flex flex-col transition-colors duration-200">
            <div className="shrink-0 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 text-sm">
                  ðŸ§ 
                </span>
                <div>
                  <h2 className="text-base font-semibold text-foreground tracking-tight">Proactive Class Insights</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Automated detection from real database records</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold text-cyan-400 border border-cyan-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" /> Live DB Scan
              </span>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[300px] space-y-3 scrollbar-hide">
              {isLoadingInsights ? (
                <div className="space-y-3 p-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 rounded-xl bg-hover/40 animate-pulse border border-subtle" />
                  ))}
                </div>
              ) : allClearMessage && proactiveInsights.length === 0 ? (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center">
                  <span className="text-2xl mb-1 block">âœ…</span>
                  <p className="text-xs font-semibold text-emerald-400">All Clear!</p>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{allClearMessage}</p>
                </div>
              ) : proactiveInsights.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  No active insights surfaced for your classes.
                </div>
              ) : (
                proactiveInsights.map((insight, idx) => {
                  const isExpanded = expandedInsightIdx === idx;
                  const severityBorder =
                    insight.severity === "high"
                      ? "border-rose-500/30 bg-rose-500/5"
                      : insight.severity === "medium"
                      ? "border-amber-500/30 bg-amber-500/5"
                      : "border-cyan-500/30 bg-cyan-500/5";

                  const badgeColor =
                    insight.severity === "high"
                      ? "bg-rose-500/20 text-rose-400"
                      : insight.severity === "medium"
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-cyan-500/20 text-cyan-400";

                  return (
                    <div
                      key={idx}
                      className={`rounded-xl border p-3.5 transition-all duration-200 ${severityBorder}`}
                    >
                      <div
                        className="flex items-start justify-between gap-2 cursor-pointer"
                        onClick={() => setExpandedInsightIdx(isExpanded ? null : idx)}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${badgeColor}`}>
                              {insight.severity}
                            </span>
                            <h3 className="text-xs font-bold text-foreground truncate">{insight.title}</h3>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed line-clamp-2">
                            {insight.recommendation}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0 mt-0.5">
                          {isExpanded ? "â–²" : "â–¼"}
                        </span>
                      </div>

                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-subtle space-y-2">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 mb-1">
                              ðŸ“Š Database Evidence:
                            </p>
                            <ul className="space-y-1">
                              {insight.evidence.map((ev, eIdx) => (
                                <li key={eIdx} className="text-[11px] text-foreground flex items-start gap-1.5">
                                  <span className="text-cyan-400 text-xs shrink-0">â€¢</span>
                                  <span>{ev}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          {insight.affectedStudents && insight.affectedStudents.length > 0 && (
                            <div className="pt-1">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                                Students Involved:
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {insight.affectedStudents.map((st, sIdx) => (
                                  <span key={sIdx} className="rounded-md bg-hover border border-subtle px-1.5 py-0.5 text-[10px] text-foreground">
                                    {st}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Recent Announcements â€” placed below PCI */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-md flex flex-col transition-colors duration-200">
            <div className="shrink-0 mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-foreground tracking-tight">Recent Announcements</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Teacher notifications</p>
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide space-y-2 max-h-[140px]">
              {recentAnnouncements.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-16 rounded-xl border border-dashed border-border text-center">
                  <p className="text-xs text-muted-foreground">No unread announcements</p>
                </div>
              ) : (
                recentAnnouncements.map((ann) => (
                  <div
                    key={ann.id}
                    className="rounded-xl border border-subtle border-l-4 border-l-cyan-500 bg-hover/20 p-2.5 hover:bg-hover transition duration-200"
                  >
                    <p className="text-xs font-semibold text-foreground">{ann.title}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground line-clamp-1">{ann.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
