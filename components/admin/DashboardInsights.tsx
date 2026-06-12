"use client";

type Props = {
  totalStudents: number;
  totalTeachers: number;
  averageAttendance: number;
  passRate: number;
  upcomingExamCount: number;
  atRiskCount: number;
};

function InsightItem({
  label,
  value,
  sub,
  color,
  icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-4 hover:bg-white/[0.04] transition duration-200">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide truncate">{label}</p>
        <p className="mt-0.5 text-xl font-bold text-white leading-none">{value}</p>
        {sub && <p className="mt-1 text-[11px] text-slate-500">{sub}</p>}
      </div>
    </div>
  );
}

export default function DashboardInsights({
  totalStudents,
  totalTeachers,
  averageAttendance,
  passRate,
  upcomingExamCount,
  atRiskCount,
}: Props) {
  const ratio =
    totalTeachers > 0 ? Math.round(totalStudents / totalTeachers) : 0;

  const insights = [
    {
      label: "Student–Teacher Ratio",
      value: ratio > 0 ? `${ratio}:1` : "—",
      sub: `${totalStudents} students, ${totalTeachers} teachers`,
      color: "bg-violet-500/15 text-violet-400",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
        </svg>
      ),
    },
    {
      label: "Attendance Health",
      value: `${averageAttendance}%`,
      sub: averageAttendance >= 80 ? "Good standing" : averageAttendance >= 70 ? "Needs attention" : "Critical — action required",
      color: averageAttendance >= 80 ? "bg-emerald-500/15 text-emerald-400" : averageAttendance >= 70 ? "bg-amber-500/15 text-amber-400" : "bg-rose-500/15 text-rose-400",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 2v4M8 2v4M3 10h18M9 16l2 2 4-4" />
        </svg>
      ),
    },
    {
      label: "Academic Pass Rate",
      value: `${passRate}%`,
      sub: passRate >= 80 ? "Excellent academic health" : passRate >= 60 ? "Moderate performance" : "Below target — review curriculum",
      color: passRate >= 80 ? "bg-cyan-500/15 text-cyan-400" : passRate >= 60 ? "bg-amber-500/15 text-amber-400" : "bg-rose-500/15 text-rose-400",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 17l6-6 4 4 6-6M4 21h16" />
        </svg>
      ),
    },
    {
      label: "Upcoming Exams",
      value: upcomingExamCount,
      sub: upcomingExamCount === 0 ? "No exams scheduled" : "Within the next period",
      color: "bg-blue-500/15 text-blue-400",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" />
        </svg>
      ),
    },
    {
      label: "At-Risk Students",
      value: atRiskCount,
      sub: atRiskCount === 0 ? "All students on track" : `${atRiskCount} need immediate support`,
      color: atRiskCount === 0 ? "bg-emerald-500/15 text-emerald-400" : atRiskCount <= 3 ? "bg-amber-500/15 text-amber-400" : "bg-rose-500/15 text-rose-400",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
      ),
    },
  ];

  return (
    <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/40 to-white/[0.035] p-4 shadow-xl shadow-black/20 h-[497px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
      {/* HEADER */}
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-white tracking-tight">School Insights</h2>
        <p className="text-xs text-slate-500 mt-0.5">Key indicators at a glance</p>
      </div>

      {/* GRID */}
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
        {insights.map((item) => (
          <InsightItem key={item.label} {...item} />
        ))}
      </div>
    </section>
  );
}
