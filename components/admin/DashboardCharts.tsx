"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const SUBJECT_COLORS = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#8b5cf6",
  "#f97316",
  "#ec4899",
];

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
type SubjectDatum = { subject: string; percentage: number };

type Props = {
  trend: TrendDatum[];
  subjects: SubjectDatum[];
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
function CustomSubjectTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as SubjectDatum;
  const pct = d.percentage;
  const status = pct >= 75 ? "Good" : pct >= 55 ? "Average" : "Needs review";
  const statusColor = pct >= 75 ? "#10b981" : pct >= 55 ? "#f59e0b" : "#ef4444";
  return (
    <div style={tooltipStyle}>
      <p className="font-semibold text-foreground text-xs mb-1">{d.subject}</p>
      <p className="mt-1 text-lg font-bold" style={{ color: statusColor }}>
        {pct}%
      </p>
      <p className="text-[10px]" style={{ color: statusColor }}>
        {status}
      </p>
    </div>
  );
}

export default function DashboardCharts({ trend, subjects }: Props) {
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

      {/* ── Subject Performance – Multi-Color Bar Chart ──────────────── */}
      <section className="rounded-2xl border border-subtle bg-card p-6 shadow-md hover:border-border transition-all duration-300">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
          Subject Performance
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">Average scores by subject area</p>

        <div className="mt-6 h-52">
          {subjects.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subjects} margin={{ left: -15, right: 10, top: 10, bottom: 5 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.3} />
                <XAxis
                  dataKey="subject"
                  tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
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
                <ReferenceLine
                  y={75}
                  stroke="rgba(16,185,129,0.35)"
                  strokeDasharray="4 3"
                  label={{ value: "75%", position: "insideTopRight", fill: "#34d399", fontSize: 10 }}
                />
                <Tooltip content={<CustomSubjectTooltip />} />
                <Bar dataKey="percentage" radius={[6, 6, 0, 0]} maxBarSize={40} animationDuration={600}>
                  {subjects.map((entry, i) => (
                    <Cell
                      key={`subject-bar-${i}`}
                      fill={SUBJECT_COLORS[i % SUBJECT_COLORS.length]}
                      fillOpacity={entry.percentage >= 75 ? 0.9 : 0.6}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2">
              <svg viewBox="0 0 24 24" className="h-8 w-8 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 17V9h2v8H7Zm4 0V5h2v12h-2Zm4 0v-6h2v6h-2Z" />
              </svg>
              <p className="text-xs text-muted-foreground">No subject data yet</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}