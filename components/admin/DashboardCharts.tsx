"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// Distinct palette – one per subject/bar
const SUBJECT_COLORS = [
  "#6366f1", // indigo
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#06b6d4", // cyan
  "#8b5cf6", // violet
  "#f97316", // orange
  "#ec4899", // pink
];

const tooltipStyle = {
  backgroundColor: "rgba(11, 16, 32, 0.95)",
  backdropFilter: "blur(12px)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  borderRadius: "14px",
  color: "#f8fafc",
  boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.5)",
  padding: "10px 14px",
  fontSize: "12px",
};

type TrendDatum = { exam: string; examDate: string; percentage: number };
type SubjectDatum = { subject: string; percentage: number };

type Props = {
  trend: TrendDatum[];
  subjects: SubjectDatum[];
};

export default function DashboardCharts({ trend, subjects }: Props) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* ── Performance Trend – Area Chart ───────────────────────────────── */}
      <section className="rounded-2xl border border-white/5 bg-gradient-to-br from-slate-950/50 to-white/[0.02] p-6 shadow-xl shadow-black/30 hover:border-white/10 transition-all duration-300">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-white">
          Performance Trend
        </h2>
        <p className="mt-1 text-xs text-slate-500">Average exam scores over time</p>

        <div className="mt-6 h-52">
          {trend.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={trend}
                margin={{ left: -15, right: 10, top: 10, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="perfGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
                <XAxis
                  dataKey="examDate"
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  dy={8}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}%`}
                  dx={-4}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v) => [`${v}%`, "Avg Score"]}
                />
                <Area
                  type="monotone"
                  dataKey="percentage"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  fill="url(#perfGradient)"
                  dot={{ r: 4, fill: "#6366f1", strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: "#818cf8" }}
                  animationDuration={600}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2">
              <svg viewBox="0 0 24 24" className="h-8 w-8 text-slate-700 fill-current">
                <path d="M3 3h18v2H5v13H3V3Zm4 14 5-5 3 3 5-7 1.5 1-6.5 9-3-3-4 4L7 17Z" />
              </svg>
              <p className="text-xs text-slate-600">No exam data yet</p>
            </div>
          )}
        </div>
      </section>

      {/* ── Subject Performance – Multi-Color Bar Chart ───────────────────── */}
      <section className="rounded-2xl border border-white/5 bg-gradient-to-br from-slate-950/50 to-white/[0.02] p-6 shadow-xl shadow-black/30 hover:border-white/10 transition-all duration-300">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-white">
          Subject Performance
        </h2>
        <p className="mt-1 text-xs text-slate-500">Average scores by subject area</p>

        <div className="mt-6 h-56">
          {subjects.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={subjects}
                margin={{ left: -15, right: 10, top: 10, bottom: 5 }}
              >
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
                <XAxis
                  dataKey="subject"
                  tick={{ fill: "#94a3b8", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  dy={8}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}%`}
                  dx={-4}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v) => [`${v}%`, "Avg Score"]}
                />
                <Bar
                  dataKey="percentage"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={40}
                  animationDuration={600}
                >
                  {subjects.map((_, i) => (
                    <Cell
                      key={`subject-bar-${i}`}
                      fill={SUBJECT_COLORS[i % SUBJECT_COLORS.length]}
                      fillOpacity={0.85}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2">
              <svg viewBox="0 0 24 24" className="h-8 w-8 text-slate-700 fill-current">
                <path d="M7 17V9h2v8H7Zm4 0V5h2v12h-2Zm4 0v-6h2v6h-2Z" />
              </svg>
              <p className="text-xs text-slate-600">No subject data yet</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}