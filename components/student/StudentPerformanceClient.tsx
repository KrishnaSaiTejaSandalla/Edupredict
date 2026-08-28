"use client";

import { useState } from "react";
import PageHeader from "@/components/shared/PageHeader";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";

type PredictionItem = {
  subjectName: string | null;
  currentScore: string;
  predictedScoreMin: string;
  predictedScoreMax: string;
  riskLevel: string;
  confidence: string;
  academicHealthScore: number;
  attendanceImpact: string | null;
  assignmentImpact: string | null;
};

type RecommendationItem = {
  id: number;
  type: string;
  title: string;
  description: string;
  resourceId: number | null;
  resourceTitle: string | null;
  resourceFileUrl: string | null;
};

type Props = {
  data: {
    overallHealth: number;
    predictions: PredictionItem[];
    recommendations: RecommendationItem[];
    performanceTrend: { month: string; score: number }[];
    subjectStats: { subject: string; score: number; predictedMin: number; predictedMax: number }[];
    attendanceData: { subject: string; attendance: number; score: number }[];
  } | null;
  insufficientMessage: string | null;
};

export default function StudentPerformanceClient({ data, insufficientMessage }: Props) {
  // Empty state if insufficient data
  if (insufficientMessage || !data || data.predictions.length === 0) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
        <PageHeader tag="Student Portal" title="AI Performance Insight" description="Analyze your academic performance trends and predictions." />
        <div className="rounded-3xl border border-dashed border-theme p-12 text-center max-w-md mx-auto">
          <p className="text-4xl mb-3">📈</p>
          <p className="text-sm font-bold text-primary">Not enough academic data available yet to generate predictions.</p>
          <p className="text-xs text-secondary mt-1.5 leading-relaxed">
            We need exam results or classroom assignment submissions in at least one subject to calculate forecasts and performance metrics.
          </p>
        </div>
      </div>
    );
  }

  const { overallHealth, predictions, recommendations, performanceTrend, subjectStats, attendanceData } = data;

  // Determine current status
  const getStatusText = (score: number) => {
    if (score >= 85) return "Excellent";
    if (score >= 70) return "Improving";
    return "Needs Attention";
  };

  const getStatusStyle = (status: string) => {
    if (status === "Excellent") return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    if (status === "Improving") return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
    return "bg-rose-500/10 text-rose-400 border-rose-500/20";
  };

  const getRiskStyle = (risk: string) => {
    if (risk.toLowerCase() === "low") return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    if (risk.toLowerCase() === "medium") return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    return "bg-rose-500/10 text-rose-400 border-rose-500/20";
  };

  // Build graph data comparisons
  const compareData = subjectStats.map(s => ({
    subject: s.subject.length > 10 ? s.subject.slice(0, 8) + ".." : s.subject,
    Current: s.score,
    Predicted: Math.round((s.predictedMin + s.predictedMax) / 2),
  }));

  // Dynamic multi-subject analysis across all performance aspects
  const sortedPreds = [...predictions].sort((a, b) => Number(b.currentScore) - Number(a.currentScore));
  const topSubject = sortedPreds[0];
  const lowSubject = sortedPreds[sortedPreds.length - 1];

  let performanceSummary = `Your Academic Health Score is estimated at ${overallHealth}/100 based on your aggregated marks, class attendance, and assignment completion.`;
  if (topSubject && lowSubject && topSubject !== lowSubject) {
    performanceSummary = `Your Academic Health Score is ${overallHealth}/100. You are performing strongest in ${topSubject.subjectName} (projected ${Math.round(Number(topSubject.predictedScoreMin))}-${Math.round(Number(topSubject.predictedScoreMax))}%), while ${lowSubject.subjectName} needs targeted focus to raise your overall grade bracket.`;
  } else if (topSubject) {
    performanceSummary = `Your Academic Health Score is ${overallHealth}/100 with ${topSubject.subjectName} tracking toward ${Math.round(Number(topSubject.predictedScoreMin))}-${Math.round(Number(topSubject.predictedScoreMax))}%.`;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Hero Section */}
      <div className="rounded-3xl border border-theme bg-surface/50 p-6 relative overflow-hidden shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="inline-flex items-center rounded-full bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 text-[10px] font-bold text-cyan-400 uppercase tracking-widest">
            AI Academic Insight
          </span>
          <h1 className="mt-3 text-3xl font-black text-primary">Academic Projections</h1>
          <p className="mt-1.5 text-xs text-secondary max-w-lg">
            Understand your holistic forecast factoring in exam marks, attendance consistency, and homework submissions.
          </p>
        </div>

        {/* Dynamic Status Display */}
        <div className="flex items-center gap-4 shrink-0">
          <div>
            <p className="text-[10px] uppercase font-bold text-secondary text-right">Academic Status</p>
            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wider mt-1.5 ${getStatusStyle(getStatusText(overallHealth))}`}>
              {getStatusText(overallHealth)}
            </span>
          </div>
          <div className="h-10 w-px bg-theme" />
          <div>
            <p className="text-[10px] uppercase font-bold text-secondary">Health Score</p>
            <p className="text-2xl font-black text-cyan-400 mt-1">{overallHealth}/100</p>
          </div>
        </div>
      </div>

      {/* AI Score Overview Card */}
      <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-transparent p-5 relative overflow-hidden shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-violet-400 flex items-center gap-1.5">
            <span>🧠</span> AI Multi-Pillar Performance Analysis
          </h3>
          <span className="text-[10px] font-bold text-muted uppercase tracking-wider">
            Marks · Attendance · Assignments
          </span>
        </div>
        <p className="text-sm font-semibold text-primary leading-relaxed">
          {performanceSummary}
        </p>
      </div>

      {/* Expected Performance Cards */}
      <div className="space-y-4">
        <h2 className="text-xs font-black uppercase tracking-wider text-cyan-400">Expected Performance</h2>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          {predictions.map((pred, i) => (
            <div key={i} className="rounded-2xl border border-theme bg-surface p-4 space-y-4 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start gap-2">
                  <h3 className="text-xs font-bold text-primary uppercase tracking-wide truncate max-w-[140px]">{pred.subjectName}</h3>
                  <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${getRiskStyle(pred.riskLevel)}`}>
                    {pred.riskLevel} Risk
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4">
                  <div className="rounded-xl bg-hover/20 border border-theme p-2 text-center">
                    <p className="text-[9px] uppercase font-bold text-secondary">Current Score</p>
                    <p className="text-sm font-black text-primary mt-0.5">{Math.round(Number(pred.currentScore))}%</p>
                  </div>
                  <div className="rounded-xl bg-hover/20 border border-theme p-2 text-center">
                    <p className="text-[9px] uppercase font-bold text-secondary">AI Prediction</p>
                    <p className="text-sm font-black text-cyan-400 mt-0.5">
                      {Math.round(Number(pred.predictedScoreMin))}-{Math.round(Number(pred.predictedScoreMax))}%
                    </p>
                  </div>
                </div>

                {/* Impacts detail */}
                <div className="mt-4 space-y-2 text-[10px] text-secondary font-medium leading-relaxed border-t border-theme pt-3">
                  <p className="flex items-start gap-1.5">
                    <span>📅</span>
                    <span>{pred.attendanceImpact}</span>
                  </p>
                  <p className="flex items-start gap-1.5">
                    <span>📝</span>
                    <span>{pred.assignmentImpact}</span>
                  </p>
                </div>
              </div>

              <div className="pt-3">
                <span className="text-[9px] font-bold text-secondary uppercase tracking-widest block text-right">
                  Confidence: {pred.confidence}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Graphs / Subject Analysis */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
        {/* Trend Area Chart */}
        <div className="rounded-2xl border border-theme bg-surface p-5 space-y-4 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400">Performance Trend</h3>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceTrend}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" stroke="rgba(255,255,255,0.4)" fontSize={10} tickLine={false} />
                <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} tickLine={false} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)" }} />
                <Area type="monotone" dataKey="score" stroke="#22d3ee" strokeWidth={2.5} fillOpacity={1} fill="url(#colorScore)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Current vs Predicted Comparison */}
        <div className="rounded-2xl border border-theme bg-surface p-5 space-y-4 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400">Current vs AI Prediction</h3>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={compareData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="subject" stroke="rgba(255,255,255,0.4)" fontSize={10} tickLine={false} />
                <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} tickLine={false} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)" }} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="Current" fill="rgba(255,255,255,0.3)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Predicted" fill="#22d3ee" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Attendance vs Grade Correlation */}
        <div className="rounded-2xl border border-theme bg-surface p-5 space-y-4 shadow-sm md:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400">Attendance vs Grade Impact</h3>
            <div className="flex items-center gap-4 text-[10px] text-secondary">
              <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-0.5 rounded bg-orange-400"></span>Attendance %</span>
              <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-0.5 rounded bg-cyan-400"></span>Grade Score %</span>
            </div>
          </div>
          <div className="h-64 w-full">
            {attendanceData.length < 2 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-muted">
                <span className="text-3xl">📊</span>
                <p className="text-xs text-center">More data needed across subjects to show the correlation wave.<br/>Keep attending classes to unlock this chart.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={attendanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="attendanceGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#fb923c" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#fb923c" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                  <XAxis
                    dataKey="subject"
                    stroke="rgba(255,255,255,0.3)"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "rgba(255,255,255,0.5)" }}
                  />
                  <YAxis
                    stroke="rgba(255,255,255,0.3)"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    domain={[50, 100]}
                    tick={{ fill: "rgba(255,255,255,0.5)" }}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(10,10,20,0.95)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: "10px",
                      fontSize: "11px",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.4)"
                    }}
                    formatter={(value: number, name: string) => [`${value}%`, name]}
                    labelStyle={{ color: "rgba(255,255,255,0.7)", marginBottom: "4px", fontWeight: 600 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="attendance"
                    stroke="#fb923c"
                    strokeWidth={2.5}
                    fill="url(#attendanceGrad)"
                    name="Attendance %"
                    dot={{ r: 4, fill: "#fb923c", strokeWidth: 2, stroke: "rgba(0,0,0,0.4)" }}
                    activeDot={{ r: 6, fill: "#fb923c", stroke: "#fff", strokeWidth: 2 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="#22d3ee"
                    strokeWidth={2.5}
                    fill="url(#scoreGrad)"
                    name="Grade Score %"
                    dot={{ r: 4, fill: "#22d3ee", strokeWidth: 2, stroke: "rgba(0,0,0,0.4)" }}
                    activeDot={{ r: 6, fill: "#22d3ee", stroke: "#fff", strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Personalized AI Suggestions */}
      <div className="rounded-2xl border border-theme bg-surface p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-theme pb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
            <span>✨</span> Personalized AI Suggestions & Strategies
          </h3>
          <span className="text-[10px] text-muted font-medium">Tailored for your academic profile</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {recommendations.filter(r => r.type !== "resource").map((rec, i) => {
            const getIcon = () => {
              if (rec.type === "attendance") return "📅";
              if (rec.type === "assignment") return "📝";
              if (rec.type === "strategy") return "⚡";
              if (rec.type === "mindset") return "🏆";
              if (rec.title.includes("AI Coach")) return "🤖";
              return "💡";
            };

            const getTagColor = () => {
              if (rec.type === "attendance") return "bg-amber-500/10 text-amber-400 border-amber-500/20";
              if (rec.type === "assignment") return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
              if (rec.type === "strategy" || rec.title.includes("AI Coach")) return "bg-violet-500/10 text-violet-400 border-violet-500/20";
              return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
            };

            return (
              <div key={i} className="rounded-xl border border-theme bg-hover/20 p-4 flex gap-3.5 items-start transition hover:border-cyan-500/30">
                <span className="text-2xl p-2 rounded-xl bg-white/5 border border-white/5 shrink-0">{getIcon()}</span>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-bold text-primary truncate">{rec.title}</h4>
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 ${getTagColor()}`}>
                      {rec.type.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-[11px] text-secondary leading-relaxed">{rec.description}</p>
                </div>
              </div>
            );
          })}
          {recommendations.filter(r => r.type !== "resource").length === 0 && (
            <p className="text-xs text-muted-foreground italic col-span-2 py-4 text-center">
              No critical interventions required right now. Keep up your regular revision schedule!
            </p>
          )}
        </div>
      </div>

      {/* Learning Recommendations */}
      <div className="rounded-2xl border border-theme bg-surface p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-theme pb-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <span>📚</span> Target Learning Recommendations
            </h3>
            <p className="text-[11px] text-secondary mt-0.5">
              Subject-specific study material and guidance mapped from your performance diagnostics:
            </p>
          </div>
          <a
            href="/student/resources"
            className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 transition shrink-0 hidden sm:block"
          >
            Explore Library Grid →
          </a>
        </div>

        <div className="space-y-3 pt-1">
          {recommendations.filter(r => r.resourceId !== null).map((rec, i) => (
            <div key={i} className="rounded-xl border border-theme bg-hover/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition hover:border-cyan-500/30">
              <div className="flex gap-3 items-start min-w-0">
                <span className="text-2xl p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">📖</span>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-primary truncate">{rec.resourceTitle || rec.title}</h4>
                  <p className="text-[11px] text-secondary mt-0.5 leading-relaxed">{rec.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {rec.resourceFileUrl ? (
                  <a
                    href={rec.resourceFileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 px-4 py-2 text-[10px] font-bold text-center transition shadow-sm"
                  >
                    Open Resource 🔗
                  </a>
                ) : (
                  <a
                    href="/student/resources"
                    className="rounded-xl border border-theme bg-hover px-4 py-2 text-[10px] font-bold text-primary hover:bg-surface transition text-center"
                  >
                    View in Library
                  </a>
                )}
              </div>
            </div>
          ))}

          {recommendations.filter(r => r.resourceId !== null).length === 0 && (
            <div className="rounded-xl border border-dashed border-theme p-6 text-center">
              <p className="text-xs text-muted font-medium">All subjects are currently performing above risk thresholds. Keep revising regularly!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
