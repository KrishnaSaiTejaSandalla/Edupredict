"use client";

import { useState, useEffect, useMemo } from "react";
import PageHeader from "@/components/shared/PageHeader";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import CustomSelect from "../ui/CustomSelect";

// ── Holistic Prediction Card ──────────────────────────────────────────────────────────
function PredictionCard({
  trendData,
  avgPct,
  attendancePercent = 85,
  assignmentStats = { total: 0, submitted: 0, completionRate: 100, avgGrade: 85 },
}: {
  trendData: { percentage: number }[];
  avgPct: number;
  attendancePercent?: number;
  assignmentStats?: { total: number; submitted: number; completionRate: number; avgGrade: number };
}) {
  const prediction = useMemo(() => {
    const n = trendData.length;
    let baseScore = avgPct;
    let slope = 0;

    if (n >= 2) {
      // Linear regression on index → percentage
      const xs = trendData.map((_, i) => i);
      const ys = trendData.map((d) => d.percentage);
      const meanX = xs.reduce((a, b) => a + b, 0) / n;
      const meanY = ys.reduce((a, b) => a + b, 0) / n;
      const num = xs.reduce((s, x, i) => s + (x - meanX) * (ys[i] - meanY), 0);
      const den = xs.reduce((s, x) => s + (x - meanX) ** 2, 0);
      slope = den !== 0 ? num / den : 0;
      const intercept = meanY - slope * meanX;
      baseScore = intercept + slope * n;
    }

    // 1. Attendance Modifier (-8% to +4%)
    let attendanceMod = 0;
    let attendanceReason = "";
    let attendanceColor = "text-cyan-400";
    if (attendancePercent >= 92) {
      attendanceMod = +3;
      attendanceReason = `Attendance is high (${attendancePercent}%) · Boosts exam readiness`;
      attendanceColor = "text-emerald-400";
    } else if (attendancePercent >= 80) {
      attendanceMod = 0;
      attendanceReason = `Attendance is balanced (${attendancePercent}%) · Stable foundation`;
      attendanceColor = "text-cyan-400";
    } else if (attendancePercent >= 70) {
      attendanceMod = -3;
      attendanceReason = `Attendance is sub-optimal (${attendancePercent}%) · Minor drag on forecast`;
      attendanceColor = "text-amber-400";
    } else {
      attendanceMod = -7;
      attendanceReason = `Attendance is low (${attendancePercent}%) · Significant drag on performance`;
      attendanceColor = "text-rose-400";
    }

    // 2. Assignment Submission Modifier (-6% to +3%)
    let assignmentMod = 0;
    let assignmentReason = "";
    let assignmentColor = "text-cyan-400";
    const compRate = assignmentStats.completionRate;
    if (compRate >= 90) {
      assignmentMod = +2;
      assignmentReason = `Assignment completion is high (${compRate}%) · Strong practice retention`;
      assignmentColor = "text-emerald-400";
    } else if (compRate >= 70) {
      assignmentMod = 0;
      assignmentReason = `Assignment submission is balanced (${compRate}%)`;
      assignmentColor = "text-cyan-400";
    } else if (compRate >= 50) {
      assignmentMod = -3;
      assignmentReason = `Assignment submission is low (${compRate}%) · Missing practical reinforcement`;
      assignmentColor = "text-amber-400";
    } else {
      assignmentMod = -6;
      assignmentReason = `Assignment submission is very low (${compRate}%) · Holding back grade potential`;
      assignmentColor = "text-rose-400";
    }

    // 3. Exam Momentum
    let momentumReason = "";
    let momentumColor = "text-cyan-400";
    if (slope > 1) {
      momentumReason = "Exam trajectory is accelerating upward";
      momentumColor = "text-emerald-400";
    } else if (slope < -1) {
      momentumReason = "Recent exam scores show downward variance";
      momentumColor = "text-rose-400";
    } else {
      momentumReason = "Exam score consistency is steady";
      momentumColor = "text-cyan-400";
    }

    // Holistic composite predicted score
    const finalPredicted = Math.min(100, Math.max(0, Math.round(baseScore + attendanceMod + assignmentMod)));

    // Confidence calculation (considers volume of data + consistency)
    const ys = trendData.map((d) => d.percentage);
    const meanY = ys.length > 0 ? ys.reduce((a, b) => a + b, 0) / ys.length : avgPct;
    const variance = ys.length > 0 ? ys.reduce((s, y) => s + (y - meanY) ** 2, 0) / ys.length : 10;
    const dataBonus = Math.min(20, n * 3 + (assignmentStats.total > 0 ? 5 : 0));
    const confidence = Math.max(35, Math.min(96, Math.round(80 - variance / 15 + dataBonus)));

    const trend = slope > 1 ? "up" : slope < -1 ? "down" : "stable";

    const drivers = [
      { icon: "📅", label: "Attendance Impact", reason: attendanceReason, impact: attendanceMod, color: attendanceColor },
      { icon: "📝", label: "Assignments Impact", reason: assignmentReason, impact: assignmentMod, color: assignmentColor },
      { icon: "📈", label: "Exam Momentum", reason: momentumReason, impact: slope > 1 ? +2 : slope < -1 ? -2 : 0, color: momentumColor },
    ];

    return { score: finalPredicted, confidence, trend, drivers } as const;
  }, [trendData, avgPct, attendancePercent, assignmentStats]);

  const trendColor =
    prediction.trend === "up" ? "text-emerald-400" : prediction.trend === "down" ? "text-rose-400" : "text-amber-400";
  const trendIcon = prediction.trend === "up" ? "▲" : prediction.trend === "down" ? "▼" : "→";
  const trendLabel = prediction.trend === "up" ? "Improving Trajectory" : prediction.trend === "down" ? "Needs Attention" : "Stable Performance";

  return (
    <div className="rounded-2xl border border-fuchsia-500/20 bg-gradient-to-br from-fuchsia-500/10 via-purple-500/5 to-surface p-6 shadow-xl flex flex-col justify-between gap-5">
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <p className="text-xs font-bold text-secondary uppercase tracking-wider flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-fuchsia-400" />
            Predicted Next Score
          </p>
          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-fuchsia-500/10 text-fuchsia-300 border border-fuchsia-500/20">
            Overall AI Forecast
          </span>
        </div>

        <div className="flex items-baseline gap-3">
          <span className="text-5xl font-black text-fuchsia-400 tracking-tight">{prediction.score}%</span>
          <span className="text-xs text-muted font-medium">Marks + Attendance + Assignments</span>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <span className={`text-xs font-bold ${trendColor}`}>{trendIcon} {trendLabel}</span>
          <span className="text-[10px] text-muted">· {prediction.confidence}% AI confidence</span>
        </div>

        {/* Confidence bar */}
        <div className="mt-3 h-1.5 w-full bg-hover rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-500 transition-all duration-700"
            style={{ width: `${prediction.confidence}%` }}
          />
        </div>
      </div>

      {/* Diagnostic Forecast Drivers / Reasons */}
      <div className="border-t border-theme/60 pt-4 space-y-2.5">
        <p className="text-[10px] font-bold text-secondary uppercase tracking-wider">
          Prediction Breakdown & Drivers:
        </p>
        <div className="space-y-2">
          {prediction.drivers.map((d, i) => (
            <div key={i} className="rounded-xl bg-surface/70 border border-theme/50 p-2.5 flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 min-w-0">
                <span className="text-xs shrink-0 mt-0.5">{d.icon}</span>
                <p className="text-[11px] text-primary leading-snug truncate">
                  {d.reason}
                </p>
              </div>
              <span className={`text-[10px] font-bold shrink-0 ${d.impact > 0 ? "text-emerald-400" : d.impact < 0 ? "text-rose-400" : "text-secondary"}`}>
                {d.impact > 0 ? `+${d.impact}%` : d.impact < 0 ? `${d.impact}%` : "0%"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

type ResultType = {
  id: number;
  marks: string;
  remarks: string | null;
  recordedDate: string;
  examId: number | null;
  examName: string | null;
  maxMarks: string | null;
  subjectName: string | null;
};

type Props = {
  initialResults: ResultType[];
  classRank: number;
  classSize: number;
  subjectMetrics: { subjectName: string; studentAvg: number; classAvg: number }[];
  gpa: number;
  attendancePercent?: number;
  assignmentStats?: { total: number; submitted: number; completionRate: number; avgGrade: number };
};

export default function StudentResultsClient({
  initialResults,
  classRank,
  classSize,
  subjectMetrics,
  gpa,
  attendancePercent = 85,
  assignmentStats = { total: 0, submitted: 0, completionRate: 100, avgGrade: 85 },
}: Props) {
  const [filterSubject, setFilterSubject] = useState("all");
  const [filterExamType, setFilterExamType] = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterSubject, filterExamType, filterMonth]);

  // Overall KPI metrics (calculated on ALL results)
  const totalExams = initialResults.length;
  const examPcts = initialResults.map((r) => {
    const max = Number(r.maxMarks) || 100;
    const obtained = Number(r.marks) || 0;
    return Math.round((obtained / max) * 100);
  });

  const avgPct = examPcts.length > 0 ? Math.round(examPcts.reduce((a, b) => a + b, 0) / examPcts.length) : 0;
  const maxPct = examPcts.length > 0 ? Math.max(...examPcts) : 0;

  // Compute class overall average from subject metrics
  const classAvgSum = subjectMetrics.reduce((sum, s) => sum + s.classAvg, 0);
  const classAvgOverall = subjectMetrics.length > 0 ? Math.round(classAvgSum / subjectMetrics.length) : 75;
  const diffFromClassAvg = avgPct - classAvgOverall;
  
  // Filter option lists
  const subjectsList = Array.from(new Set(initialResults.map((r) => r.subjectName).filter(Boolean)));
  const examTypesList = Array.from(new Set(initialResults.map((r) => r.examName).filter(Boolean)));
  const monthsList = Array.from(new Set(initialResults.map((r) => {
    const d = new Date(r.recordedDate);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }))).sort((a, b) => b.localeCompare(a));

  const formatMonthYear = (my: string) => {
    const [y, m] = my.split("-");
    const monthName = new Date(Number(y), Number(m) - 1, 1).toLocaleString('default', { month: 'long' });
    return `${monthName} ${y}`;
  };

  // Filtered dataset
  const filtered = initialResults.filter((r) => {
    const d = new Date(r.recordedDate);
    const matchesSubject = filterSubject === "all" || r.subjectName === filterSubject;
    const matchesExamType = filterExamType === "all" || r.examName === filterExamType;
    const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const matchesMonth = filterMonth === "all" || monthStr === filterMonth;
    return matchesSubject && matchesExamType && matchesMonth;
  });

  // Sort trend chronologically (ascending date)
  const trendData = [...initialResults]
    .sort((a, b) => a.recordedDate.localeCompare(b.recordedDate))
    .map(r => {
      const max = Number(r.maxMarks) || 100;
      const obtained = Number(r.marks) || 0;
      return {
        date: new Date(r.recordedDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        percentage: Math.round((obtained / max) * 100),
        subject: r.subjectName || "Subject"
      };
    });

  // Paginated dataset
  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginatedData = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      <PageHeader tag="Student Portal" title="My Exam Results" description="Check your performance grades, marksheets, and academic history." />

      {initialResults.length > 0 ? (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-2xl p-5 border border-theme bg-surface relative overflow-hidden flex flex-col justify-between shadow-md">
              <div>
                <p className="text-xs font-semibold text-muted uppercase tracking-wider">Calculated GPA</p>
                <p className="mt-2 text-3xl font-black text-violet-400">{gpa.toFixed(2)} / 4.0</p>
              </div>
              <p className="mt-1 text-xs text-secondary">Based on average score</p>
              <div className="absolute top-2 right-2 text-4xl opacity-10">🎓</div>
            </div>

            <div className="rounded-2xl p-5 border border-theme bg-surface relative overflow-hidden flex flex-col justify-between shadow-md">
              <div>
                <p className="text-xs font-semibold text-muted uppercase tracking-wider">Class Rank</p>
                <p className="mt-2 text-3xl font-black text-emerald-400">#{classRank} <span className="text-xs font-normal text-muted">/ {classSize} classmates</span></p>
              </div>
              <p className="mt-1 text-xs text-secondary">Academic cohort rank</p>
              <div className="absolute top-2 right-2 text-4xl opacity-10">🏆</div>
            </div>

            <div className="rounded-2xl p-5 border border-theme bg-surface relative overflow-hidden flex flex-col justify-between shadow-md">
              <div>
                <p className="text-xs font-semibold text-muted uppercase tracking-wider">Highest Score</p>
                <p className="mt-2 text-3xl font-black text-amber-400">{maxPct}%</p>
              </div>
              <p className="mt-1 text-xs text-secondary">Top marks achieved</p>
              <div className="absolute top-2 right-2 text-4xl opacity-10">🌟</div>
            </div>

            <div className="rounded-2xl p-5 border border-theme bg-surface relative overflow-hidden flex flex-col justify-between shadow-md">
              <div>
                <p className="text-xs font-semibold text-muted uppercase tracking-wider">Comparison</p>
                <p className="mt-2 text-3xl font-black text-purple-400">
                  {diffFromClassAvg >= 0 ? `+${diffFromClassAvg}%` : `${diffFromClassAvg}%`}
                </p>
              </div>
              <p className="mt-1 text-xs text-secondary">{diffFromClassAvg >= 0 ? "Above" : "Below"} class average ({classAvgOverall}%)</p>
              <div className="absolute top-2 right-2 text-4xl opacity-10">📈</div>
            </div>
          </div>

          {/* Results Trend Chart + Prediction Card */}
          {trendData.length > 0 && (
            <div className="grid gap-4 lg:grid-cols-3">
              {/* Trend Chart (spans 2/3) */}
              <div className="lg:col-span-2 rounded-2xl border border-theme bg-surface p-6 shadow-xl">
                <h3 className="text-sm font-bold text-primary flex items-center gap-2 mb-4">
                  <span className="h-2.5 w-2.5 rounded-full bg-violet-400" />
                  Performance Trend
                </h3>
                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                      <defs>
                        <linearGradient id="resultsGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 10 }} />
                      <YAxis tick={{ fill: "#64748b", fontSize: 10 }} domain={[0, 100]} />
                      <Tooltip contentStyle={{ background: "#1e1b4b", border: "1px solid rgba(139,92,246,0.3)", borderRadius: 16, color: "#e2e8f0", fontSize: 11 }} />
                      <Area type="monotone" dataKey="percentage" stroke="#8b5cf6" strokeWidth={3} fill="url(#resultsGrad)" dot={{ fill: "#8b5cf6", r: 4 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Predicted Next Exam Score Card (1/3) */}
              <PredictionCard
                trendData={trendData}
                avgPct={avgPct}
                attendancePercent={attendancePercent}
                assignmentStats={assignmentStats}
              />
            </div>
          )}

          {/* Subject Cards & Class Average Comparison */}
          {subjectMetrics.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-violet-400" />
                Performance Comparison vs Class Average
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {subjectMetrics.map((sm) => {
                  const diff = sm.studentAvg - sm.classAvg;
                  return (
                    <div key={sm.subjectName} className="rounded-2xl border border-theme bg-surface p-5 space-y-4 shadow-xl">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-violet-400 uppercase tracking-wider">{sm.subjectName}</span>
                        <span className="text-xs font-bold text-primary">{sm.studentAvg}%</span>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-[10px] text-secondary mb-1">
                            <span>Your Average</span>
                            <span>{sm.studentAvg}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-hover rounded-full overflow-hidden">
                            <div className="h-full bg-violet-500 rounded-full" style={{ width: `${sm.studentAvg}%` }} />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-[10px] text-secondary mb-1">
                            <span>Class Average</span>
                            <span>{sm.classAvg}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-hover rounded-full overflow-hidden">
                            <div className="h-full bg-zinc-500/50 rounded-full" style={{ width: `${sm.classAvg}%` }} />
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-theme flex items-center justify-between">
                        <span className="text-[10px] text-muted">vs. Cohort</span>
                        <span className={`text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded ${diff >= 0 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"}`}>
                          {diff >= 0 ? `▲ +${diff}% above` : `▼ ${diff}% below`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Table Container */}
          <div className="rounded-2xl border border-theme bg-surface overflow-hidden">
            <div className="p-5 border-b border-theme flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
              <h2 className="text-sm font-bold text-primary flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-violet-400" />
                Score sheet
              </h2>
              
              <div className="flex flex-wrap items-center gap-3">
                {/* Subject Filter */}
                <div className="flex items-center gap-1.5 z-40">
                  <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">Subject:</span>
                  <CustomSelect
                    options={[{ value: "all", label: "All Subjects" }, ...subjectsList.map(s => ({ value: s!, label: s! }))]}
                    value={filterSubject}
                    onChange={(val) => setFilterSubject(String(val))}
                    className="w-40"
                  />
                </div>

                {/* Exam Type Filter */}
                <div className="flex items-center gap-1.5 z-40">
                  <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">Exam:</span>
                  <CustomSelect
                    options={[{ value: "all", label: "All Types" }, ...examTypesList.map(et => ({ value: et!, label: et! }))]}
                    value={filterExamType}
                    onChange={(val) => setFilterExamType(String(val))}
                    className="w-36"
                  />
                </div>

                {/* Month Filter */}
                <div className="flex items-center gap-1.5 z-40">
                  <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">Month:</span>
                  <CustomSelect
                    options={[{ value: "all", label: "All Months" }, ...monthsList.map(m => ({ value: m, label: formatMonthYear(m) }))]}
                    value={filterMonth}
                    onChange={(val) => setFilterMonth(String(val))}
                    className="w-44"
                  />
                </div>
              </div>
            </div>

            {paginatedData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-theme bg-hover/50 text-[10px] font-bold uppercase tracking-wider text-secondary">
                      <th className="py-4 px-6">Subject</th>
                      <th className="py-4 px-6">Assessment / Exam</th>
                      <th className="py-4 px-6">Marks Obtained</th>
                      <th className="py-4 px-6">Percentage</th>
                      <th className="py-4 px-6">Remarks</th>
                      <th className="py-4 px-6 text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-theme">
                    {paginatedData.map((r) => {
                      const max = Number(r.maxMarks) || 100;
                      const obtained = Number(r.marks) || 0;
                      const pct = Math.round((obtained / max) * 100);

                      let pctColor = "text-rose-400";
                      let pctBg = "bg-rose-500/10 border border-rose-500/20";
                      if (pct >= 75) {
                        pctColor = "text-emerald-400";
                        pctBg = "bg-emerald-500/10 border border-emerald-500/20";
                      } else if (pct >= 50) {
                        pctColor = "text-amber-400";
                        pctBg = "bg-amber-500/10 border border-amber-500/20";
                      }

                      return (
                        <tr key={r.id} className="hover:bg-hover/30 transition-colors">
                          <td className="py-4 px-6 text-xs font-bold text-violet-400 uppercase tracking-wider">
                            {r.subjectName || "Unknown"}
                          </td>
                          <td className="py-4 px-6 text-xs font-semibold text-primary">
                            {r.examName || "Class Assessment"}
                          </td>
                          <td className="py-4 px-6 text-xs font-bold text-primary">
                            {r.marks} <span className="text-muted font-normal">/ {r.maxMarks || "100"}</span>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] font-bold ${pctBg} ${pctColor}`}>
                              {pct}%
                            </span>
                          </td>
                          <td className="py-4 px-6 text-xs text-secondary max-w-xs truncate italic">
                            {r.remarks ? `"${r.remarks}"` : "—"}
                          </td>
                          <td className="py-4 px-6 text-xs text-muted text-right">
                            {new Date(r.recordedDate).toLocaleDateString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-10 text-center text-muted text-sm">
                No matching exam results found.
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-theme flex items-center justify-between">
                <span className="text-xs text-secondary">
                  Page {currentPage} of {totalPages} ({filtered.length} total results)
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="rounded-xl border border-theme bg-hover hover:bg-surface disabled:opacity-50 px-3 py-1.5 text-xs font-bold transition"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="rounded-xl border border-theme bg-hover hover:bg-surface disabled:opacity-50 px-3 py-1.5 text-xs font-bold transition"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="rounded-3xl border border-dashed border-theme p-12 text-center max-w-md mx-auto">
          <p className="text-4xl mb-3">🏆</p>
          <p className="text-sm font-bold text-primary">No Exam Results</p>
          <p className="text-xs text-muted mt-1">There are no published exam scores or marks for your account yet.</p>
        </div>
      )}
    </div>
  );
}
