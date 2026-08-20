"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const SUBJECT_COLORS = ["#06b6d4", "#8b5cf6", "#ec4899", "#10b981", "#f59e0b", "#f43f5e"];

const EmptyState = ({ title, description }: { title: string; description: string }) => (
  <div className="flex flex-col items-center justify-center p-10 text-center bg-card/20 backdrop-blur-md border border-border/30 rounded-3xl min-h-[300px] space-y-4 shadow-sm">
    <div className="text-5xl animate-pulse">📊</div>
    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{title}</h3>
    <p className="text-xs text-secondary max-w-xs leading-relaxed">{description}</p>
  </div>
);

export default function AnalyticsDashboardClient() {
  const { data, error, isLoading, mutate } = useSWR("/api/dashboard/admin/analytics", fetcher);
  const [heatmapDetail, setHeatmapDetail] = useState<{ class: string; subject: string; avg: number } | null>(null);
  const [teacherSearch, setTeacherSearch] = useState<string>("");

  const handleExportCSV = () => {
    if (!data) return;
    try {
      const rows = [
        ["Metric", "Value"],
        ["Total Students", data.kpis.students],
        ["Total Teachers", data.kpis.teachers],
        ["Active Parents", data.kpis.parents],
        ["Attendance Rate %", data.kpis.attendance],
        ["Overall Pass Rate %", data.kpis.marks],
        ["Active Classes", data.kpis.activeClasses],
        ["Pending Leaves", data.kpis.pendingLeaves],
      ];
      const csvContent =
        "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "school_analytics_snapshot.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("CSV export downloaded successfully.");
    } catch (e) {
      toast.error("Failed to export data.");
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8 space-y-8 animate-pulse">
        <div className="h-8 w-64 bg-muted rounded-xl"></div>
        <div className="h-4 w-96 bg-muted rounded-lg mt-2"></div>
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
          <div className="h-80 bg-muted rounded-2xl"></div>
          <div className="h-80 bg-muted rounded-2xl lg:col-span-2"></div>
        </div>
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-28 bg-muted rounded-2xl"></div>
          ))}
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <p className="text-red-500 font-semibold">Failed to load advanced analytics dashboard.</p>
          <button
            onClick={() => mutate()}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm font-semibold transition shadow-md"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  // Filter teachers by name, subject, or class
  const filteredTeachers = (data.teacherAnalytics || []).filter((teacher: any) => {
    if (!teacherSearch.trim()) return true;
    const q = teacherSearch.toLowerCase();
    const nameMatch = teacher.name?.toLowerCase().includes(q);
    const subjectMatch = teacher.subjects?.some((s: string) => s.toLowerCase().includes(q));
    const classMatch = teacher.classes?.some((c: string) => c.toLowerCase().includes(q));
    return nameMatch || subjectMatch || classMatch;
  });

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-rose-500/15 text-rose-400 border-rose-500/30";
      case "high":
        return "bg-amber-500/15 text-amber-400 border-amber-500/30";
      case "medium":
        return "bg-cyan-500/15 text-cyan-400 border-cyan-500/30";
      case "low":
        return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
      default:
        return "bg-violet-500/15 text-violet-400 border-violet-500/30";
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8 space-y-8 transition-all duration-300">
      
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/40 pb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-500 dark:text-cyan-400">OPERATIONAL CENTER</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            School Intelligence Analytics
          </h1>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Complete high-fidelity school operations matrix, predictive AI insights, and academic trends.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 text-xs font-bold border border-border/60 hover:border-border rounded-xl bg-card hover:bg-muted/30 transition flex items-center gap-1.5"
          >
            🖨️ Snapshot PDF
          </button>
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl shadow-lg transition flex items-center gap-1.5"
          >
            📊 Export CSV
          </button>
        </div>
      </div>

      {/* ── SECTION: TOP INSIGHTS (HIGHEST PRIORITY) ─────────────────────────── */}
      <section className="bg-card border border-border/30 rounded-3xl p-6 shadow-xl space-y-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/20 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground tracking-tight">Top AI Insights & Priorities</h2>
              <p className="text-xs text-muted-foreground">Prioritized operational findings surfaced directly from live school records</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-cyan-400 border border-cyan-500/20 w-fit">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
            Live Intelligence
          </span>
        </div>

        {(!data.topInsights || data.topInsights.length === 0) ? (
          <div className="flex flex-col items-center justify-center p-8 text-center bg-background/20 border border-dashed border-border rounded-2xl">
            <p className="text-xs font-semibold text-muted-foreground">All operational indicators are operating within normal baseline limits.</p>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {data.topInsights.map((insight: any) => (
              <div
                key={insight.id}
                className="group rounded-2xl border border-border/40 bg-background/40 p-4 hover:bg-card hover:border-cyan-500/30 transition-all duration-300 flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${getSeverityBadge(insight.severity)}`}>
                      {insight.severity}
                    </span>
                    {insight.entity && (
                      <span className="text-[10px] font-semibold text-muted-foreground truncate max-w-[130px]">
                        {insight.entity}
                      </span>
                    )}
                  </div>
                  <h3 className="text-xs font-bold text-foreground group-hover:text-cyan-400 transition">
                    {insight.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {insight.message}
                  </p>
                </div>

                <div className="pt-2 border-t border-border/20 flex flex-col gap-1.5">
                  {insight.metric && (
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-muted-foreground">Key Metric:</span>
                      <span className="font-bold text-primary font-mono">{insight.metric}</span>
                    </div>
                  )}
                  {insight.action && (
                    <div className="flex items-center gap-1.5 text-[10px] text-cyan-400 font-medium bg-cyan-500/5 rounded-lg px-2 py-1">
                      <span>⚡</span>
                      <span className="truncate">{insight.action}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── SECTION 1: SCHOOL HEALTH OVERVIEW ──────────────────────────────── */}
      <section className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* School Health Gauge */}
        <div className="bg-card border border-border/30 rounded-3xl p-6 shadow-xl flex flex-col items-center justify-between text-center relative overflow-hidden group">
          <div className="absolute -top-12 -right-12 w-28 h-28 bg-cyan-500/10 rounded-full blur-2xl group-hover:scale-125 transition-all duration-700"></div>
          
          <div className="w-full flex justify-between items-center mb-4">
            <span className="text-[10px] font-bold text-cyan-500 uppercase tracking-widest">AI Command Center</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold">LIVE</span>
          </div>

          <div className="relative flex items-center justify-center h-40 w-40 my-2">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" className="stroke-muted/30" strokeWidth="6" fill="transparent" />
              <circle
                cx="50"
                cy="50"
                r="40"
                className="stroke-cyan-500 transition-all duration-1000 ease-out"
                strokeWidth="6"
                fill="transparent"
                strokeDasharray="251.2"
                strokeDashoffset={251.2 - (251.2 * data.health.score) / 100}
              />
            </svg>
            <div className="absolute text-center">
              <span className="text-4xl font-extrabold tracking-tight text-foreground">{data.health.score}</span>
              <span className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mt-1">Health Score</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 w-full mt-4 text-left border-t border-border/30 pt-4">
            <div>
              <span className="text-[10px] text-muted-foreground block uppercase font-medium">Academic</span>
              <span className="text-sm font-bold text-cyan-500">{data.health.academic}%</span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block uppercase font-medium">Attendance</span>
              <span className="text-sm font-bold text-violet-500">{data.health.attendance}%</span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block uppercase font-medium">Engagement</span>
              <span className="text-sm font-bold text-emerald-500">{data.health.parent}%</span>
            </div>
          </div>
        </div>

        {/* Dynamic KPI Cards (Fees Collection Status Completely Removed) */}
        <div className="lg:col-span-2 grid gap-4 grid-cols-2 sm:grid-cols-3">
          {[
            { label: "Total Students", value: data.kpis.students, color: "text-foreground" },
            { label: "Total Teachers", value: data.kpis.teachers, color: "text-foreground" },
            { label: "Active Classes", value: data.kpis.activeClasses, color: "text-violet-500" },
            { label: "Attendance Rate", value: `${data.kpis.attendance}%`, color: "text-cyan-500" },
            { label: "Pass Percentage", value: `${data.kpis.marks}%`, color: "text-emerald-500" },
            { label: "Leaves Pending", value: data.kpis.pendingLeaves, color: "text-amber-500" },
          ].map((kpi, idx) => (
            <div
              key={idx}
              className="bg-card border border-border/30 rounded-2xl p-5 shadow-sm hover:scale-[1.03] transition-all duration-300 group relative overflow-hidden flex flex-col justify-between"
            >
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">{kpi.label}</span>
              <span className={`text-2xl font-black mt-2 block tracking-tight ${kpi.color}`}>{kpi.value}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── SECTION 2: ATTENDANCE ANALYTICS ────────────────────────────────── */}
      <section className="bg-card border border-border/30 rounded-3xl p-6 shadow-xl space-y-6">
        <div>
          <h2 className="text-base font-bold text-foreground">Attendance Analytics</h2>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">daily logging trend, class aggregates, and distributions</p>
        </div>

        {!data.hasEnoughAttendance ? (
          <EmptyState title="Not enough attendance records" description="Requires attendance logs from at least 5 different days. Continue tracking daily student sessions." />
        ) : (
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
            {/* Daily Attendance Trend */}
            <div className="bg-background/40 border border-border/20 rounded-2xl p-4 h-80 flex flex-col justify-between">
              <span className="text-xs font-bold text-muted-foreground mb-2 block uppercase">Daily Attendance Trend</span>
              <div className="flex-1 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.attendanceAnalytics.dailyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorAtt" cx="0" cy="0" r="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={10} tickLine={false} domain={[0, 100]} />
                    <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "14px" }} />
                    <Area type="monotone" dataKey="rate" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#colorAtt)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Attendance by Class */}
            <div className="bg-background/40 border border-border/20 rounded-2xl p-4 h-80 flex flex-col justify-between">
              <span className="text-xs font-bold text-muted-foreground mb-2 block uppercase">Class Attendance Rates</span>
              <div className="flex-1 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.attendanceAnalytics.byClass}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="class" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={10} tickLine={false} domain={[0, 100]} />
                    <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "14px" }} />
                    <Bar dataKey="rate" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Attendance Distribution */}
            <div className="bg-background/40 border border-border/20 rounded-2xl p-4 h-80 flex flex-col justify-between">
              <span className="text-xs font-bold text-muted-foreground mb-2 block uppercase">Attendance Status Share</span>
              <div className="flex-1 w-full flex justify-center items-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.attendanceAnalytics.distribution}
                      innerRadius={60}
                      outerRadius={75}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {data.attendanceAnalytics.distribution.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={SUBJECT_COLORS[index % SUBJECT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="text-[10px] text-muted-foreground grid grid-cols-3 gap-1 pt-2">
                {data.attendanceAnalytics.distribution.map((item: any, idx: number) => (
                  <div key={idx} className="flex flex-col">
                    <span className="truncate">{item.name}</span>
                    <span className="font-bold text-foreground">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── SECTION 3: ACADEMIC ANALYTICS ────────────────────────────────── */}
      <section className="bg-card border border-border/30 rounded-3xl p-6 shadow-xl space-y-6">
        <div>
          <h2 className="text-base font-bold text-foreground">Academic Analytics</h2>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">exam performance matrices, distributions, and subject indices</p>
        </div>

        {!data.hasEnoughAcademics ? (
          <EmptyState title="No exam data available" description="Requires results from at least 3 exam sessions. Create exams and upload marks to see scores distribution." />
        ) : (
          <>
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
              <div className="bg-background/30 border border-border/20 p-4 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Top Performing Cohort</span>
                <span className="text-sm font-extrabold text-emerald-500 mt-2 block">{data.academicAnalytics.topPerformingClass}</span>
              </div>
              <div className="bg-background/30 border border-border/20 p-4 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Lowest Performing Cohort</span>
                <span className="text-sm font-extrabold text-rose-500 mt-2 block">{data.academicAnalytics.lowestPerformingClass}</span>
              </div>
              <div className="bg-background/30 border border-border/20 p-4 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Overall Pass Percentage</span>
                <span className="text-sm font-extrabold text-cyan-500 mt-2 block">{data.academicAnalytics.passRate}%</span>
              </div>
              <div className="bg-background/30 border border-border/20 p-4 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Overall Fail Percentage</span>
                <span className="text-sm font-extrabold text-rose-400 mt-2 block">{data.academicAnalytics.failRate}%</span>
              </div>
            </div>

            <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
              {/* Subject Wise Performance */}
              <div className="bg-background/40 border border-border/20 rounded-2xl p-4 h-80 flex flex-col justify-between">
                <span className="text-xs font-bold text-muted-foreground mb-2 block uppercase">Subject Performance Index</span>
                <div className="flex-1 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data.academicAnalytics.avgMarksSubject}>
                      <PolarGrid stroke="var(--border)" />
                      <PolarAngleAxis dataKey="subject" stroke="var(--muted-foreground)" fontSize={10} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="var(--muted-foreground)" fontSize={8} />
                      <Radar name="Averages" dataKey="percentage" stroke="#a78bfa" fill="#a78bfa" fillOpacity={0.35} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Class Wise Performance */}
              <div className="bg-background/40 border border-border/20 rounded-2xl p-4 h-80 flex flex-col justify-between">
                <span className="text-xs font-bold text-muted-foreground mb-2 block uppercase">Cohort Performance Index</span>
                <div className="flex-1 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.academicAnalytics.avgMarksClass}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="class" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} />
                      <YAxis stroke="var(--muted-foreground)" fontSize={10} tickLine={false} domain={[0, 100]} />
                      <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "14px" }} />
                      <Bar dataKey="percentage" fill="#ec4899" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* GPA Performance Distribution */}
              <div className="bg-background/40 border border-border/20 rounded-2xl p-4 h-80 flex flex-col justify-between">
                <span className="text-xs font-bold text-muted-foreground mb-2 block uppercase">Performance Grade Share</span>
                <div className="flex-1 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.academicAnalytics.gpaDistribution}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="grade" stroke="var(--muted-foreground)" fontSize={9} tickLine={false} />
                      <YAxis stroke="var(--muted-foreground)" fontSize={10} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "14px" }} />
                      <Bar dataKey="count" fill="#10b981" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Heatmap Matrix Grid */}
            <div className="border border-border/30 rounded-2xl p-4 bg-background/20 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Class-Subject Cohorts Heatmap</h3>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">grade matrix view</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="p-3 text-left text-xs font-semibold text-muted-foreground border-b border-border/40">Class</th>
                      {data.academicAnalytics.avgMarksSubject.map((s: any) => (
                        <th key={s.id} className="p-3 text-center text-xs font-semibold text-muted-foreground border-b border-border/40">{s.subject}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.academicAnalytics.avgMarksClass.map((cls: any) => (
                      <tr key={cls.class} className="hover:bg-muted/10">
                        <td className="p-3 text-xs font-bold text-foreground border-b border-border/20">{cls.class}</td>
                        {data.academicAnalytics.avgMarksSubject.map((subj: any) => {
                          const val = data.heatmapMatrix?.[cls.id]?.[subj.id] ?? 75;
                          const cellBg =
                            val >= 90
                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                              : val >= 80
                                ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
                                : val >= 70
                                  ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                                  : "bg-rose-500/20 text-rose-400 border-rose-500/30";

                          return (
                            <td
                              key={subj.id}
                              onClick={() => setHeatmapDetail({ class: cls.class, subject: subj.subject, avg: val })}
                              className="p-3 text-center border-b border-border/20 cursor-pointer"
                            >
                              <span className={`px-3 py-1 rounded-full text-xs font-black border ${cellBg}`}>
                                {val}%
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </section>

      {/* ── SECTION 4: PERFORMANCE TRENDS ─────────────────────────────────── */}
      <section className="bg-card border border-border/30 rounded-3xl p-6 shadow-xl space-y-6">
        <div>
          <h2 className="text-base font-bold text-foreground">Performance Trends</h2>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Monthly historical averages trend</p>
        </div>

        {!data.hasEnoughHistory ? (
          <EmptyState title="Not enough historical data" description="Waiting for sufficient records. Minimum 30 days / 2 distinct months of historical tracking required." />
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.performanceTrends.monthlyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMonthlyAtt" cx="0" cy="0" r="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorMonthlyAcad" cx="0" cy="0" r="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={10} tickLine={false} domain={[0, 100]} />
                <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "14px" }} />
                <Area name="Attendance" type="monotone" dataKey="attendance" stroke="#06b6d4" strokeWidth={2} fill="url(#colorMonthlyAtt)" />
                <Area name="Academic" type="monotone" dataKey="academic" stroke="#8b5cf6" strokeWidth={2} fill="url(#colorMonthlyAcad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* ── SECTION 5: TEACHER ANALYTICS ─────────────────────────────────── */}
      <section className="bg-card border border-border/30 rounded-3xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/20 pb-4">
          <div>
            <h2 className="text-base font-bold text-foreground">Teacher Analytics</h2>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Teacher performance ratings, assigned cohorts, and workloads</p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            {/* Functional Search Bar */}
            <div className="relative flex-1 sm:w-72">
              <input
                type="text"
                value={teacherSearch}
                onChange={(e) => setTeacherSearch(e.target.value)}
                placeholder="Search teacher, subject, class..."
                className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-border/40 bg-background/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-cyan-500 transition"
              />
              <svg className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground fill-current" viewBox="0 0 24 24">
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
              </svg>
            </div>

            <div className="text-right p-2 bg-cyan-500/10 border border-cyan-500/20 rounded-xl shrink-0 hidden md:block">
              <span className="text-[9px] uppercase font-bold text-cyan-400 block tracking-widest">Most Active Teacher</span>
              <span className="text-xs font-black text-foreground mt-0.5 block">{data.mostActiveTeacher}</span>
            </div>
          </div>
        </div>

        {data.teacherAnalytics.length === 0 ? (
          <EmptyState title="No teachers recorded" description="Add teachers and create subject assignments to generate metrics." />
        ) : filteredTeachers.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center bg-background/20 border border-dashed border-border rounded-2xl">
            <p className="text-xs font-semibold text-muted-foreground">No teachers match the search &quot;{teacherSearch}&quot;.</p>
            <button
              onClick={() => setTeacherSearch("")}
              className="mt-2 text-xs font-bold text-cyan-400 hover:underline"
            >
              Clear search filter
            </button>
          </div>
        ) : (
          /* Smooth horizontal scrolling container for smaller screens */
          <div className="overflow-x-auto pb-3 -mx-2 px-2 scrollbar-thin">
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 min-w-[650px] lg:min-w-0">
              {filteredTeachers.map((teacher: any, idx: number) => (
                <div key={idx} className="bg-background/30 border border-border/20 rounded-2xl p-5 shadow-sm space-y-4 hover:border-border/60 transition">
                  <div className="flex justify-between items-start border-b border-border/20 pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-foreground">{teacher.name}</h3>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {teacher.subjects && teacher.subjects.length > 0 ? (
                          teacher.subjects.map((sub: string, i: number) => (
                            <span key={i} className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                              {sub}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-muted-foreground">Faculty</span>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 font-bold shrink-0">
                      Active
                    </span>
                  </div>

                  {teacher.classes && teacher.classes.length > 0 && (
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-foreground/80">Cohorts:</span>
                      {teacher.classes.map((cls: string, i: number) => (
                        <span key={i} className="px-1.5 py-0.5 rounded bg-muted/40 text-foreground border border-border/30">
                          {cls}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Class Load</span>
                      <span className="font-extrabold text-foreground">{teacher.classLoad} sections</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Student Score Avg</span>
                      <span className="font-extrabold text-cyan-500">{teacher.avgStudentPerformance}%</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Assignments Given</span>
                      <span className="font-extrabold text-foreground">{teacher.assignmentsGiven}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Evaluated (MoM)</span>
                      <span className="font-extrabold text-violet-500">{teacher.assignmentsEvaluated}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Approved Leaves</span>
                      <span className="font-extrabold text-amber-500">{teacher.leaveCount} days</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Resources uploaded</span>
                      <span className="font-extrabold text-foreground">{teacher.resourcesUploaded}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── SECTION 6: PARENT ENGAGEMENT ─────────────────────────────────── */}
      <section className="bg-card border border-border/30 rounded-3xl p-6 shadow-xl space-y-6">
        <div>
          <h2 className="text-base font-bold text-foreground">Parent Engagement</h2>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Dynamic activity log index and interaction statistics</p>
        </div>

        <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
          <div className="bg-background/30 border border-border/20 rounded-2xl p-5 flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block mb-4">Engagement KPI Matrix</span>
            <div className="space-y-3">
              <div className="flex justify-between text-xs pb-2 border-b border-border/10">
                <span className="text-muted-foreground">Feedback Submitted</span>
                <span className="font-bold text-foreground">{data.parentEngagement.feedbackCount}</span>
              </div>
              <div className="flex justify-between text-xs pb-2 border-b border-border/10">
                <span className="text-muted-foreground">Unread Chat Messages</span>
                <span className="font-bold text-violet-500">{data.parentEngagement.unreadMessagesCount}</span>
              </div>
              <div className="flex justify-between text-xs pb-2 border-b border-border/10">
                <span className="text-muted-foreground">Leave Requests</span>
                <span className="font-bold text-amber-500">{data.parentEngagement.leaveRequestsCount}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Parent Portal Views</span>
                <span className="font-bold text-cyan-500">{data.parentEngagement.parentViews}</span>
              </div>
            </div>
            <div className="mt-6 p-3 bg-muted/40 rounded-xl text-[10px] border border-dashed border-border text-center text-muted-foreground">
              Response Time Avg: <span className="font-semibold text-foreground">{data.parentEngagement.responseTime}</span>
            </div>
          </div>

          <div className="bg-background/30 border border-border/20 rounded-2xl p-5 md:col-span-2 flex flex-col justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block mb-2">Notification Read Metrics</span>
              <p className="text-xs text-muted-foreground">Dynamic tracking of alerts processed by users</p>
            </div>
            <div className="h-40 w-full flex items-center justify-center my-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: "Read Alerts", value: data.notificationStats.read },
                      { name: "Ignored/Pending", value: data.notificationStats.unread },
                    ]}
                    innerRadius={50}
                    outerRadius={65}
                    dataKey="value"
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#f59e0b" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="text-xs flex justify-between border-t border-border/20 pt-3">
              <span className="text-emerald-400 font-bold">● {data.notificationStats.readPercentage}% Read</span>
              <span className="text-amber-500 font-bold">● {data.notificationStats.unreadPercentage}% Ignored</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTIONS 7, 8, 9: AI DIAGNOSTICS CENTER ─────────────────────────── */}
      <section className="bg-card border border-border/30 rounded-3xl p-6 shadow-xl space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-violet-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg">🤖</span>
            <h2 className="text-base font-bold text-foreground">AI Intelligence & Diagnostics Center</h2>
          </div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mt-1">school insights, predictions, and recommended actions</p>
        </div>

        {!data.hasEnoughAI ? (
          <div className="flex flex-col items-center justify-center p-12 text-center bg-background/20 border border-dashed border-border rounded-2xl min-h-[250px] space-y-4">
            <span className="text-4xl">🧠</span>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">AI requires more historical data</h3>
            <p className="text-xs text-secondary max-w-sm leading-relaxed">
              Waiting for sufficient records. Connect more student attendance tracks, exam results, and assignments logs to bootstrap AI models.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
            {/* Section 7 - AI Insights */}
            <div className="space-y-4">
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest block border-b border-border/20 pb-2">🎯 AI Generated Insights</span>
              <div className="space-y-3">
                {data.aiInsights.map((insight: any, idx: number) => {
                  const alertBg =
                    insight.type === "success"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : insight.type === "danger"
                        ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                        : insight.type === "warning"
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
                  return (
                    <div key={idx} className={`p-4 border rounded-2xl text-xs leading-relaxed space-y-1.5 ${alertBg}`}>
                      <span className="font-extrabold uppercase block tracking-wider text-[10px]">{insight.category}</span>
                      <p className="font-medium">{insight.message}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section 8 - AI Predictions */}
            <div className="space-y-4">
              <span className="text-xs font-bold text-violet-400 uppercase tracking-widest block border-b border-border/20 pb-2">🔮 AI Predictions</span>
              <div className="space-y-3.5">
                {data.aiPredictions.map((pred: any, idx: number) => (
                  <div key={idx} className="p-4 bg-background/40 border border-border/20 rounded-2xl space-y-1.5 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block tracking-wider">{pred.prediction}</span>
                      <span className="text-sm font-extrabold text-foreground mt-1.5 block">{pred.value}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-muted-foreground border-t border-border/10 pt-2 mt-2">
                      <span>Model Confidence:</span>
                      <span className="font-bold text-emerald-400">{pred.confidence}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 9 - Recommended Actions */}
            <div className="space-y-4">
              <span className="text-xs font-bold text-pink-400 uppercase tracking-widest block border-b border-border/20 pb-2">🚀 Recommended Actions</span>
              <div className="space-y-3">
                {data.recommendedActions.map((rec: any, idx: number) => {
                  const borderCls =
                    rec.priority === "high"
                      ? "border-rose-500/30 bg-rose-500/5 hover:border-rose-500/50"
                      : "border-border/40 bg-background/20 hover:border-border/60";
                  return (
                    <div key={idx} className={`p-4 border rounded-2xl text-xs transition duration-200 ${borderCls} flex gap-3 items-start`}>
                      <span className="text-sm pt-0.5">📌</span>
                      <div className="space-y-1">
                        <span className={`text-[9px] uppercase font-bold ${rec.priority === 'high' ? 'text-rose-400' : 'text-muted-foreground'}`}>{rec.priority} Priority</span>
                        <p className="font-medium text-foreground/90">{rec.action}</p>
                      </div>
                    </div>
                  );
                })}
                {data.recommendedActions.length === 0 && (
                  <div className="p-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-2xl">
                    No recommendations needed. Performance holds at target thresholds.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Interactive Heatmap cohort Detail Modal */}
      {heatmapDetail && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border/40 rounded-3xl p-6 shadow-2xl max-w-sm w-full text-center space-y-4">
            <h3 className="text-lg font-bold text-foreground">Class Cohort Details</h3>
            <p className="text-xs text-muted-foreground uppercase">
              {heatmapDetail.class} • {heatmapDetail.subject}
            </p>
            <div className="my-4">
              <span className="text-5xl font-black text-cyan-500">{heatmapDetail.avg}%</span>
              <span className="block text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Average Performance</span>
            </div>
            <div className="p-3 bg-muted/40 rounded-xl text-[10px] text-muted-foreground text-center border border-dashed border-border">
              Historical average data fetched dynamically from results
            </div>
            <button
              onClick={() => setHeatmapDetail(null)}
              className="w-full py-2 bg-muted hover:bg-muted/80 text-foreground text-xs font-bold rounded-xl transition"
            >
              Close Snapshot
            </button>
          </div>
        </div>
      )}

    </main>
  );
}
