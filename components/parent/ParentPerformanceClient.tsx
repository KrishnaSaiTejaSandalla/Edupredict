"use client";

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from "recharts";

type SubjectStat = {
  subject: string;
  score: number;
  maxScore: number;
  percentage: number;
  classAvg: number;
};

type TrendPoint = {
  month: string;
  score: number;
  attendanceRate: number;
};

type PredictionPoint = {
  subject: string;
  currentGrade: string;
  predictedGrade: string;
  predictedScore: number;
  riskLevel: string;
};

type Props = {
  subjectStats: SubjectStat[];
  performanceTrend: TrendPoint[];
  strongSubjects: string[];
  weakSubjects: string[];
  predictedGrades: PredictionPoint[];
  aiParagraph: string;
  confidenceScore: number;
  studentName: string;
};

export default function ParentPerformanceClient({
  subjectStats,
  performanceTrend,
  strongSubjects,
  weakSubjects,
  predictedGrades,
  aiParagraph,
  confidenceScore,
  studentName,
}: Props) {
  // Radar data format
  const radarData = subjectStats.map((s) => ({
    subject: s.subject.length > 10 ? s.subject.substring(0, 10) + ".." : s.subject,
    Student: s.percentage,
    ClassAverage: s.classAvg,
  }));

  const getRiskBadge = (risk: string) => {
    switch (risk.toLowerCase()) {
      case "high":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      case "medium":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      default:
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-500 dark:text-cyan-400">
          Academics
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
          Performance Analytics
        </h1>
        <p className="mt-2 text-sm text-secondary">
          Deep-dive AI analysis, cohort benchmarks, correlation charts, and predictions for {studentName}.
        </p>
      </div>

      {/* Row 1: AI Predictive Insights Block */}
      <div className="rounded-3xl border border-theme bg-surface p-6 sm:p-8 shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-cyan-500/5 blur-3xl" />
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-500 dark:text-cyan-400">
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
            </svg>
          </span>
          <div>
            <h3 className="text-sm font-bold text-primary">AI Academic Predictions</h3>
            <p className="text-[10px] text-muted">Analysis confidence index: {confidenceScore}%</p>
          </div>
        </div>

        <p className="mt-4 text-xs text-secondary leading-relaxed whitespace-pre-wrap italic">
          "{aiParagraph}"
        </p>
      </div>

      {/* Row 2: Radar Chart & Strengths / Weaknesses */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Radar Chart (2/3 col) */}
        <div className="lg:col-span-2 rounded-3xl border border-theme bg-surface p-6 shadow-md">
          <h3 className="text-sm font-bold text-primary pb-3 border-b border-subtle">
            Subject Strengths Distribution
          </h3>
          <div className="h-72 w-full mt-6 flex justify-center">
            {radarData.length === 0 ? (
              <div className="flex items-center justify-center text-xs text-muted">No radar data.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.05)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: "var(--text-muted)", fontSize: 10 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "var(--text-muted)", fontSize: 8 }} />
                  <Radar name={`${studentName}`} dataKey="Student" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.2} />
                  <Radar name="Class Average" dataKey="ClassAverage" stroke="#64748b" fill="#64748b" fillOpacity={0.1} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.9)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "10px" }} />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Strong / Weak Subjects Lists (1/3 col) */}
        <div className="rounded-3xl border border-theme bg-surface p-6 shadow-md flex flex-col justify-between">
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-primary pb-3 border-b border-subtle">
              Subject Highlights
            </h3>

            {/* Strengths */}
            <div className="space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <span>👍</span> Strong Subjects
              </p>
              {strongSubjects.length === 0 ? (
                <p className="text-xs text-muted italic">Analyzing scores...</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {strongSubjects.map((s) => (
                    <span
                      key={s}
                      className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold px-2.5 py-1"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Weaknesses */}
            <div className="space-y-3 pt-4 border-t border-subtle">
              <p className="text-[10px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                <span>⚠️</span> Focus Areas
              </p>
              {weakSubjects.length === 0 ? (
                <p className="text-xs text-muted italic">Analyzing scores...</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {weakSubjects.map((s) => (
                    <span
                      key={s}
                      className="rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold px-2.5 py-1"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <p className="text-[10px] text-muted italic pt-4 border-t border-subtle leading-relaxed">
            * Highlighting areas where student average is above or below cohort benchmark.
          </p>
        </div>
      </div>

      {/* Row 3: Class Average Comparison & Monthly Growth / Attendance Correlation */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Subject Comparison Bar Chart */}
        <div className="rounded-3xl border border-theme bg-surface p-6 shadow-md">
          <h3 className="text-sm font-bold text-primary pb-3 border-b border-subtle">
            Class Average Comparison
          </h3>
          <div className="h-64 w-full mt-6">
            {subjectStats.length === 0 ? (
              <div className="flex items-center justify-center text-xs text-muted">No comparison data.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="subject" tickLine={false} axisLine={false} style={{ fontSize: "10px", fill: "var(--text-muted)" }} />
                  <YAxis domain={[0, 100]} tickLine={false} axisLine={false} style={{ fontSize: "10px", fill: "var(--text-muted)" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.9)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "10px" }} />
                  <Bar dataKey="percentage" name={`${studentName}`} fill="#06b6d4" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="classAvg" name="Class Average" fill="#64748b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Attendance Correlation & Monthly Growth LineChart */}
        <div className="rounded-3xl border border-theme bg-surface p-6 shadow-md">
          <h3 className="text-sm font-bold text-primary pb-3 border-b border-subtle">
            Attendance Correlation & Growth
          </h3>
          <div className="h-64 w-full mt-6">
            {performanceTrend.length === 0 ? (
              <div className="flex items-center justify-center text-xs text-muted">No trend data.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performanceTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} style={{ fontSize: "10px", fill: "var(--text-muted)" }} />
                  <YAxis domain={[0, 100]} tickLine={false} axisLine={false} style={{ fontSize: "10px", fill: "var(--text-muted)" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.9)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "10px" }} />
                  <Line
                    type="monotone"
                    dataKey="score"
                    name="Academic Score %"
                    stroke="#06b6d4"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="attendanceRate"
                    name="Attendance Rate %"
                    stroke="#10b981"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Row 4: AI Predictions Table */}
      <div className="rounded-2xl border border-theme bg-surface overflow-hidden shadow-sm">
        <div className="p-5 border-b border-subtle bg-hover/10">
          <h3 className="text-sm font-bold text-primary">Subject Performance Forecast</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-theme bg-hover/30 text-muted font-bold uppercase tracking-wider text-[10px]">
                <th className="py-4 px-6">Subject</th>
                <th className="py-4 px-6 text-center">Current Grade</th>
                <th className="py-4 px-6 text-center">Predicted Exam Grade</th>
                <th className="py-4 px-6 text-center">Predicted Score</th>
                <th className="py-4 px-6 text-right">Risk Forecast</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-subtle">
              {predictedGrades.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted">
                    No forecast predictions available.
                  </td>
                </tr>
              ) : (
                predictedGrades.map((row) => (
                  <tr key={row.subject} className="hover:bg-hover/20 transition duration-150">
                    <td className="py-4 px-6 font-bold text-primary">{row.subject}</td>
                    <td className="py-4 px-6 text-center font-semibold text-secondary">
                      {row.currentGrade}
                    </td>
                    <td className="py-4 px-6 text-center font-bold text-cyan-400">
                      {row.predictedGrade}
                    </td>
                    <td className="py-4 px-6 text-center font-semibold text-primary">
                      {row.predictedScore}%
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span
                        className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[9px] font-bold border uppercase tracking-wider ${getRiskBadge(
                          row.riskLevel
                        )}`}
                      >
                        {row.riskLevel}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
