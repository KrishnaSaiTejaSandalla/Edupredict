"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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

type TrendDatum = { exam: string; examDate: string; percentage: number };
type AttendanceDatum = { day: string; thisWeek: number | null; lastWeek: number | null };

type Props = {
  trend: TrendDatum[];
  attendanceTrend: AttendanceDatum[];
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTrendTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as TrendDatum;
  return (
    <div style={tooltipStyle}>
      <p className="font-semibold text-foreground text-xs mb-1">{d.exam}</p>
      <p className="text-muted-foreground text-[11px]">{d.examDate}</p>
      <p className="mt-2 text-lg font-bold text-indigo-400">{d.percentage}%</p>
      <p className="text-[10px] text-muted-foreground">class average</p>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomAttendanceTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as AttendanceDatum;
  return (
    <div style={tooltipStyle}>
      <p className="font-semibold text-foreground text-xs mb-1">{d.day}</p>
      {d.thisWeek !== null && (
        <p className="text-cyan-500 dark:text-cyan-400 font-bold text-xs">
          This Week: {d.thisWeek}%
        </p>
      )}
      {d.lastWeek !== null && (
        <p className="text-muted-foreground font-semibold text-xs mt-0.5">
          Last Week: {d.lastWeek}%
        </p>
      )}
    </div>
  );
}

export default function DashboardCharts({ trend, attendanceTrend = [] }: Props) {
  const hasAttendanceData = attendanceTrend.some(
    (d) => d.thisWeek !== null || d.lastWeek !== null
  );

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* ── Performance Trend – Area Chart ──────────────────────────── */}
      <section className="rounded-2xl border border-subtle bg-card p-6 shadow-md hover:border-border transition-all duration-300">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
          Performance Trend
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">Average exam scores over time</p>
 
        <div className="mt-6 h-52">
          {trend.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ left: -15, right: 10, top: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="perfGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.3} />
                <XAxis
                  dataKey="examDate"
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
                {/* Pass threshold reference line */}
                <ReferenceLine
                  y={40}
                  stroke="rgba(239,68,68,0.4)"
                  strokeDasharray="4 3"
                  label={{ value: "Pass", position: "insideTopRight", fill: "#f87171", fontSize: 10 }}
                />
                <Tooltip content={<CustomTrendTooltip />} />
                <Area
                  type="monotone"
                  dataKey="percentage"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  fill="url(#perfGradient)"
                  dot={{ r: 4, fill: "#6366f1", strokeWidth: 2, stroke: "#818cf8" }}
                  activeDot={{ r: 6, fill: "#818cf8", stroke: "#6366f1", strokeWidth: 2 }}
                  animationDuration={600}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2">
              <svg viewBox="0 0 24 24" className="h-8 w-8 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
              </svg>
              <p className="text-xs text-muted-foreground">No exam data yet</p>
            </div>
          )}
        </div>
      </section>

      {/* ── Attendance Overview – Dual Line Chart ──────────────── */}
      <section className="rounded-2xl border border-subtle bg-card p-6 shadow-md hover:border-border transition-all duration-300 flex flex-col justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
            Attendance Overview
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">Weekly comparison: This Week vs Last Week</p>
        </div>

        <div className="h-52 mt-6 relative">
          {hasAttendanceData ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={attendanceTrend} margin={{ left: -15, right: 10, top: 10, bottom: 5 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.3} />
                <XAxis
                  dataKey="day"
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
                <Tooltip content={<CustomAttendanceTooltip />} />
                <Line
                  type="monotone"
                  dataKey="thisWeek"
                  stroke="#06b6d4"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#06b6d4", strokeWidth: 2, stroke: "#22d3ee" }}
                  activeDot={{ r: 6, fill: "#22d3ee", stroke: "#06b6d4", strokeWidth: 2 }}
                  name="This Week"
                />
                <Line
                  type="monotone"
                  dataKey="lastWeek"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 3, fill: "#475569", strokeWidth: 1.5, stroke: "#94a3b8" }}
                  activeDot={{ r: 5, fill: "#94a3b8", stroke: "#475569", strokeWidth: 1.5 }}
                  name="Last Week"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <svg viewBox="0 0 24 24" className="h-8 w-8 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              <p className="text-xs text-muted-foreground">No attendance data available</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}