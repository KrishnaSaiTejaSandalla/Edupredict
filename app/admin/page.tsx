export const dynamic = "force-dynamic";
export const revalidate = 0;

import AiInsightsCard from "@/components/admin/AiInsightsCard";
import LatestList from "@/components/admin/LatestList";
import { getAdminDashboardData } from "@/lib/admin-dashboard";
import { DynamicDashboardCharts } from "@/components/admin/ClientChartWrappers";
import GenderDistribution from "@/components/admin/GenderDistribution";
import StudentsByClass from "@/components/admin/StudentsByClass";


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

export default async function AdminPage() {
  const dashboard = await getAdminDashboardData();

  // Derived: count high-risk students from recentStudents
  const atRiskCount = dashboard.recentStudents.filter((s) => s.riskLevel === "high").length;

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

  return (
    <main className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8 space-y-8 transition-colors duration-200">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-500 dark:text-cyan-400">Overview</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          School Admin Dashboard
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Monitor real-time academic metrics, staffing structures, student logs, and upcoming activities.
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
        {/* Left Panel: Recent Students (Large card, scrollable list inside) */}
        <div className="lg:col-span-8">
          <LatestList
            title="Recent Students"
            items={dashboard.recentStudents}
            viewAllHref="/admin/students"
          />
        </div>

        {/* Right Panel: Upcoming Exams (top) & System Alerts (below) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Upcoming Exams */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-md h-[213px] flex flex-col transition-colors duration-200">
            <div className="shrink-0 mb-3">
              <h2 className="text-base font-semibold text-foreground tracking-tight">Upcoming Exams</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Next scheduled assessments</p>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 scrollbar-hide space-y-2.5">
              {dashboard.upcomingExams.map((exam) => (
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
              {dashboard.alerts.map((alert) => {
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
              })}
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
