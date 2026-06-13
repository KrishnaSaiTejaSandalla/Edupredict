"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const BAR_COLORS = [
  "#6366f1", // indigo
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#06b6d4", // cyan
  "#8b5cf6", // violet
  "#f97316", // orange
  "#ec4899", // pink
];

type TrendDatum = { exam: string; examDate: string; percentage: number };
type SubjectDatum = { subject: string; percentage: number };
type ClassDatum = { name: string; count: number };

const tooltipStyle = {
  backgroundColor: "var(--card)",
  backdropFilter: "blur(12px)",
  border: "1px solid var(--border)",
  borderRadius: "14px",
  color: "var(--foreground)",
  boxShadow: "var(--shadow-md)",
  padding: "10px 14px",
  fontSize: "12px",
};

export default function AnalyticsCharts({
  trend,
  subjects,
  classes,
  passRate,
}: {
  trend: TrendDatum[];
  subjects: SubjectDatum[];
  classes: ClassDatum[];
  passRate: number;
}) {
  const passData = [
    { name: "Passed", value: passRate, fill: "#10b981" },
    { name: "Needs Support", value: Math.max(0, 100 - passRate), fill: "#ef4444" },
  ];

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      {/* Performance Trends */}
      <section className="rounded-2xl border border-subtle bg-card p-6 shadow-md hover:border-border transition-all duration-300">
        <h2 className="text-sm font-semibold tracking-tight text-foreground uppercase tracking-wider">Performance Trends</h2>
        <p className="text-xs text-muted-foreground mt-1">Average exam percentages over time</p>
        <div className="mt-6 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend} margin={{ left: -15, right: 10, top: 10, bottom: 5 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.3} />
              <XAxis dataKey="examDate" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} tickLine={false} axisLine={false} dy={8} />
              <YAxis domain={[0, 100]} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} dx={-4} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${value}%`, "Average"]} />
              <Line type="monotone" dataKey="percentage" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, fill: "#6366f1", strokeWidth: 0 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Pass Rate Analytics */}
      <section className="rounded-2xl border border-subtle bg-card p-6 shadow-md hover:border-border transition-all duration-300">
        <h2 className="text-sm font-semibold tracking-tight text-foreground uppercase tracking-wider">Pass Rate Distribution</h2>
        <p className="text-xs text-muted-foreground mt-1">Current class passing indexes</p>
        <div className="mt-6 h-72 relative flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={passData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={65} outerRadius={85} paddingAngle={2} startAngle={90} endAngle={-270}>
                {passData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${value}%`, "Share"]} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ color: "var(--foreground)", fontSize: 11, paddingTop: 10 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute flex flex-col items-center justify-center">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {passRate}%
            </span>
            <span className="text-[10px] text-muted-foreground uppercase font-medium">Pass Rate</span>
          </div>
        </div>
      </section>

      {/* Subject Analytics */}
      <section className="rounded-2xl border border-subtle bg-card p-6 shadow-md hover:border-border transition-all duration-300">
        <h2 className="text-sm font-semibold tracking-tight text-foreground uppercase tracking-wider">Subject Analytics</h2>
        <p className="text-xs text-muted-foreground mt-1">Average student scores by subject area</p>
        <div className="mt-6 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={subjects} margin={{ left: -15, right: 10, top: 10, bottom: 5 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.3} />
              <XAxis dataKey="subject" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} tickLine={false} axisLine={false} dy={8} />
              <YAxis domain={[0, 100]} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} dx={-4} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${value}%`, "Average"]} />
              <Bar dataKey="percentage" radius={[6, 6, 0, 0]} maxBarSize={45}>
                {subjects.map((_, i) => (
                  <Cell key={`subj-${i}`} fill={BAR_COLORS[i % BAR_COLORS.length]} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Class Analytics */}
      <section className="rounded-2xl border border-subtle bg-card p-6 shadow-md hover:border-border transition-all duration-300">
        <h2 className="text-sm font-semibold tracking-tight text-foreground uppercase tracking-wider">Class Analytics</h2>
        <p className="text-xs text-muted-foreground mt-1">Total student enrollment count per class</p>
        <div className="mt-6 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={classes} margin={{ left: -15, right: 10, top: 10, bottom: 5 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.3} />
              <XAxis dataKey="name" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} tickLine={false} axisLine={false} dy={8} />
              <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} tickLine={false} axisLine={false} dx={-4} />
              <Tooltip contentStyle={tooltipStyle} labelClassName="text-muted-foreground font-bold" />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={45}>
                {classes.map((_, i) => (
                  <Cell key={`cls-${i}`} fill={BAR_COLORS[i % BAR_COLORS.length]} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
