export const dynamic = "force-dynamic";
export const revalidate = 0;

import LatestList from "@/components/admin/LatestList";
import DashboardCharts from "@/components/admin/DashboardCharts";
import GenderDistribution from "@/components/admin/GenderDistribution";
import DashboardInsights from "@/components/admin/DashboardInsights";
import { getAdminDashboardData } from "@/lib/admin-dashboard";

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
      accent: "from-blue-500/20 to-blue-600/10 border-blue-500/20",
      iconBg: "bg-blue-500/15 text-blue-400",
      href: "/admin/students",
    },
    {
      label: "Total Teachers",
      value: dashboard.kpis.totalTeachers.toLocaleString(),
      icon: cardIcons.teachers,
      accent: "from-indigo-500/20 to-indigo-600/10 border-indigo-500/20",
      iconBg: "bg-indigo-500/15 text-indigo-400",
      href: "/admin/teachers",
    },
    {
      label: "Attendance Rate",
      value: `${dashboard.kpis.averageAttendance}%`,
      icon: cardIcons.attendance,
      accent: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/20",
      iconBg: "bg-emerald-500/15 text-emerald-400",
      href: "/admin/attendance",
    },
    {
      label: "Pass Rate",
      value: `${dashboard.kpis.passRate}%`,
      icon: cardIcons.passRate,
      accent: "from-amber-500/20 to-amber-600/10 border-amber-500/20",
      iconBg: "bg-amber-500/15 text-amber-400",
      href: "/admin/marks/results",
    },
  ];

  return (
    <main className="min-h-screen bg-[#070b16] p-4 sm:p-6 lg:p-8 space-y-8">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-400">Overview</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          School Admin Dashboard
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
          Monitor real-time academic metrics, staffing structures, student logs, and upcoming activities.
        </p>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────────── */}
      <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card) => (
          <a
            key={card.label}
            href={card.href}
            className={`rounded-2xl border border-white/10 bg-gradient-to-br ${card.accent} p-6 shadow-xl shadow-black/40 hover:-translate-y-1 hover:border-white/20 transition-all duration-300 group`}
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{card.label}</p>
                <p className="mt-3 text-3xl font-bold tracking-tight text-white group-hover:text-cyan-300 transition duration-300">
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
          <DashboardCharts trend={dashboard.trend} subjects={dashboard.subjects} />
        </div>
        <div className="lg:col-span-4">
          <GenderDistribution data={dashboard.genderDistribution} />
        </div>
      </section>

      {/* ── Row 2: Recent Students + School Insights ───────────────────── */}
      <section className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <LatestList
            title="Recent Students"
            items={dashboard.recentStudents}
            viewAllHref="/admin/students"
          />
        </div>
        <div className="lg:col-span-4">
          <DashboardInsights
            totalStudents={dashboard.kpis.totalStudents}
            totalTeachers={dashboard.kpis.totalTeachers}
            averageAttendance={dashboard.kpis.averageAttendance}
            passRate={dashboard.kpis.passRate}
            upcomingExamCount={dashboard.upcomingExams.length}
            atRiskCount={atRiskCount}
          />
        </div>
      </section>

      {/* ── Row 3: Upcoming Exams + System Alerts ──────────────────────── */}
      <section className="grid gap-8 lg:grid-cols-12">

        {/* Upcoming Exams */}
        <div className="lg:col-span-4">
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/40 to-white/[0.035] p-6 shadow-xl shadow-black/20 h-full">
            <div className="mb-5">
              <h2 className="text-base font-semibold text-white tracking-tight">Upcoming Exams</h2>
              <p className="text-xs text-slate-500 mt-0.5">Next scheduled assessments</p>
            </div>
            <div className="space-y-3">
              {dashboard.upcomingExams.map((exam) => (
                <div
                  key={exam.id}
                  className="group rounded-xl border border-white/5 bg-white/[0.02] p-4 hover:bg-white/[0.06] hover:border-white/10 transition duration-200"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white group-hover:text-cyan-400 transition truncate">
                        {exam.subjectName}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">{exam.className}</p>
                    </div>
                    <span className="inline-flex shrink-0 items-center rounded-lg bg-blue-500/10 px-2.5 py-1 text-[10px] font-semibold text-blue-300 border border-blue-500/20">
                      {exam.examDate}
                    </span>
                  </div>
                </div>
              ))}
              {dashboard.upcomingExams.length === 0 && (
                <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">
                  No upcoming exams scheduled.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* System Alerts */}
        <div className="lg:col-span-8">
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/40 to-white/[0.035] p-6 shadow-xl shadow-black/20 h-full">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-white tracking-tight">System Alerts</h2>
                <p className="text-xs text-slate-500 mt-0.5">Unread notifications and urgent feeds</p>
              </div>
              <a
                href="/admin/notifications"
                className="text-xs text-cyan-400 hover:text-cyan-300 transition"
              >
                View All →
              </a>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {dashboard.alerts.map((alert) => {
                const borderTone =
                  alert.tone === "danger"
                    ? "border-l-4 border-l-rose-500 bg-rose-500/5 border-white/5"
                    : alert.tone === "warning"
                      ? "border-l-4 border-l-amber-500 bg-amber-500/5 border-white/5"
                      : "border-l-4 border-l-cyan-500 bg-cyan-500/5 border-white/5";

                return (
                  <div
                    key={alert.id}
                    className={`rounded-xl border p-4 transition hover:bg-white/[0.02] duration-200 ${borderTone}`}
                  >
                    <p className="text-sm font-semibold text-white">{alert.title}</p>
                    <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">{alert.message}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </section>
    </main>
  );
}
