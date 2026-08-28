"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { toggleHomeworkCompleted } from "@/lib/student-actions";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

type ClassEntry = {
  subjectName: string;
  topicTaught: string | null;
  homework: string | null;
  teacherName: string;
  startTime: string;
  endTime: string;
  diaryId: number | null;
  isHomeworkCompleted: boolean;
};

type AIStudyBuddy = {
  tier: "high" | "mid" | "needs_boost";
  stars: number;
  starLabel: string;
  badge: string;
  headline: string;
  quote: string;
  actionPoints: { icon: string; title: string; detail: string; tag?: string }[];
  quickTips: string[];
};

type DashboardData = {
  student: { id: number; classId: number; rollNumber: string | null; displayClass: string };
  kpis: { attendancePercent: number; averageScore: number; pendingAssignments: number; upcomingExams: number };
  recentResults: { subjectName: string; examName: string; marks: number; maxMarks: number; date: string }[];
  todaysClasses: ClassEntry[];
  aiStudyTips: string[];
  aiStudyBuddy?: AIStudyBuddy;
  performanceTrend: { month: string; avgScore: number }[];
  attendanceTrend: { month: string; present: number; total: number }[];
  predictions: {
    subjectName: string;
    predictedScore: number;
    riskLevel: string;
    confidence: number;
  }[];
} | null;

type Props = { userName: string; data: DashboardData };

function getGreeting(name: string) {
  const h = new Date().getHours();
  const g = h < 12 ? "Good Morning" : h < 17 ? "Good Afternoon" : "Good Evening";
  return `${g}, ${name.split(" ")[0]} 👋`;
}

function getPersonalizedGreetingSubtext(data: DashboardData, name: string) {
  const firstName = name.split(" ")[0];
  if (!data) return "You're doing great!";
  
  const phrases = [];
  
  if (data.predictions && data.predictions.length > 0) {
    const mathPred = data.predictions.find(p => p.subjectName.toLowerCase() === 'mathematics' || p.subjectName.toLowerCase() === 'math');
    if (mathPred && mathPred.predictedScore >= 80) {
      phrases.push(`${firstName} — ready to conquer Mathematics 🚀`);
    }
    
    const englishPred = data.predictions.find(p => p.subjectName.toLowerCase() === 'english');
    if (englishPred && englishPred.predictedScore >= 80) {
      phrases.push(`AI predicts an A in English 📚`);
    }

    const highRisk = data.predictions.find(p => p.riskLevel === 'high' || p.riskLevel === 'medium');
    if (highRisk) {
      phrases.push(`AI predicts extra practice could boost your ${highRisk.subjectName} grade! 📈`);
    }

    const bestPred = data.predictions.reduce((a, b) => (a.predictedScore > b.predictedScore ? a : b));
    if (bestPred.predictedScore >= 75) {
      phrases.push(`AI predicts a fantastic ${bestPred.predictedScore}% in ${bestPred.subjectName}! 🌟`);
    }
  }

  if (data.kpis.attendancePercent >= 85) {
    phrases.push(`Keep your ${data.kpis.attendancePercent}% attendance streak alive 🔥`);
  }

  phrases.push("Ready to learn something new today? 🧠");
  phrases.push("You're doing great, keep going! 💪");

  return phrases[0] || "You're doing great!";
}

function KPICard({ title, value, subtitle, gradient, icon }: { title: string; value: string; subtitle: string; gradient: string; icon: React.ReactNode }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br ${gradient} border border-white/10 shadow-xl`}>
      <div className="absolute top-0 right-0 opacity-10 text-[80px] leading-none select-none">{icon}</div>
      <p className="text-xs font-semibold uppercase tracking-wider text-white/70">{title}</p>
      <p className="mt-2 text-4xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs text-white/60">{subtitle}</p>
    </div>
  );
}

function HomeworkCheck({ entry, onToggle }: { entry: ClassEntry; onToggle: (diaryId: number, done: boolean) => void }) {
  return (
    <div className={`rounded-2xl p-5 border transition-all duration-300 ${entry.isHomeworkCompleted ? "border-emerald-500/30 bg-emerald-500/5" : "border-theme bg-surface hover:bg-hover"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2 flex-1">
          <div className="flex items-center justify-between gap-2 border-b border-theme pb-2">
            <span className="text-xs font-bold text-violet-400 uppercase tracking-wider">{entry.subjectName}</span>
            <span className="text-[10px] text-muted">{entry.startTime} – {entry.endTime}</span>
          </div>
          <div>
            <span className="block text-[9px] font-bold text-secondary uppercase tracking-widest">Topic</span>
            <p className="text-xs font-semibold text-primary">{entry.topicTaught || "Not logged yet"}</p>
          </div>
          <div>
            <span className="block text-[9px] font-bold text-secondary uppercase tracking-widest">Homework</span>
            <p className="text-xs text-primary leading-relaxed whitespace-pre-wrap">{entry.homework || "No homework assigned"}</p>
          </div>
          <div className="flex items-center gap-1.5 pt-1 text-[9px] text-muted">
            <span>👩‍🏫 {entry.teacherName}</span>
          </div>
        </div>
        {entry.diaryId && entry.homework && (
          <button onClick={() => onToggle(entry.diaryId!, !entry.isHomeworkCompleted)}
            className={`shrink-0 flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-bold transition-all duration-200 ${entry.isHomeworkCompleted ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-violet-500/10 text-violet-400 border border-violet-500/20 hover:bg-violet-500/20"}`}>
            {entry.isHomeworkCompleted ? "✓ Done" : "Mark Done"}
          </button>
        )}
      </div>
    </div>
  );
}

export default function StudentDashboardClient({ userName, data }: Props) {
  const [classes, setClasses] = useState(data?.todaysClasses || []);
  const [_, startTransition] = useTransition();

  const handleToggle = (diaryId: number, done: boolean) => {
    setClasses(prev => prev.map(c => c.diaryId === diaryId ? { ...c, isHomeworkCompleted: done } : c));
    startTransition(async () => {
      try {
        await toggleHomeworkCompleted(diaryId, done);
        toast.success(done ? "Homework marked as completed! 🎉" : "Homework unmarked");
      } catch (e: any) {
        toast.error(e.message || "Failed to update homework");
        setClasses(prev => prev.map(c => c.diaryId === diaryId ? { ...c, isHomeworkCompleted: !done } : c));
      }
    });
  };

  const pendingCount = data?.kpis.pendingAssignments || 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 shadow-2xl shadow-violet-500/20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.1),transparent_60%)]" />
        <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-white/5 blur-2xl" />
        <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-purple-300/10 blur-2xl" />
        <div className="relative z-10">
          <h1 className="text-2xl sm:text-3xl font-black text-white">{getGreeting(userName)}</h1>
          <p className="mt-1.5 text-base text-violet-100/90 font-medium">{getPersonalizedGreetingSubtext(data, userName)}</p>
          <p className="mt-1 text-sm text-violet-100/80 font-semibold">
            {pendingCount > 0 ? `${pendingCount} assignment${pendingCount !== 1 ? 's' : ''} remaining this week.` : "0 assignments remaining this week."}
          </p>
        </div>
      </div>

      {/* KPIs */}
      {data ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KPICard title="Attendance" value={`${data.kpis.attendancePercent}%`} subtitle="Overall attendance" gradient="from-emerald-500 to-teal-600" icon="📅" />
          <KPICard title="Avg Score" value={`${data.kpis.averageScore}%`} subtitle="Across all exams" gradient="from-violet-500 to-purple-600" icon="⭐" />
          <KPICard title="Pending" value={String(data.kpis.pendingAssignments)} subtitle="Assignments due" gradient="from-amber-500 to-orange-600" icon="📌" />
          <KPICard title="Upcoming" value={String(data.kpis.upcomingExams)} subtitle="Exams this month" gradient="from-rose-500 to-pink-600" icon="📝" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {['Attendance', 'Avg Score', 'Pending', 'Upcoming'].map(t => (
            <div key={t} className="rounded-2xl p-5 border border-theme bg-surface animate-pulse">
              <p className="text-xs text-muted">{t}</p>
              <div className="mt-2 h-9 w-16 rounded bg-hover" />
            </div>
          ))}
        </div>
      )}

      {/* Row 2: Results + AI Tips */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Results */}
        <div className="rounded-2xl border border-theme bg-surface p-6">
          <h2 className="text-sm font-bold text-primary mb-4 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-violet-400" />
            Recent Results
          </h2>
          {data?.recentResults.length ? (
            <div className="space-y-3">
              {data.recentResults.map((r, i) => {
                const pct = Math.round((r.marks / r.maxMarks) * 100);
                const color = pct >= 80 ? "bg-emerald-500" : pct >= 60 ? "bg-amber-500" : "bg-rose-500";
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`h-9 w-9 rounded-xl flex items-center justify-center text-xs font-black text-white shrink-0 ${pct >= 80 ? 'bg-gradient-to-br from-emerald-400 to-teal-500' : pct >= 60 ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-gradient-to-br from-rose-400 to-pink-500'}`}>
                      {pct}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-primary truncate">{r.subjectName} – {r.examName}</p>
                      <div className="mt-1 h-1.5 rounded-full bg-hover overflow-hidden">
                        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <span className="text-xs font-bold text-primary shrink-0">{r.marks}/{r.maxMarks}</span>
                  </div>
                );
              })}
            </div>
          ) : <p className="text-sm text-muted text-center py-8">No results recorded yet.</p>}
        </div>

        {/* AI Study Buddy & Tips */}
        {(() => {
          const buddy = data?.aiStudyBuddy;
          const tier = buddy?.tier || "mid";
          const borderClass =
            tier === "high"
              ? "border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-purple-500/5 to-transparent"
              : tier === "mid"
              ? "border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 via-violet-500/5 to-transparent"
              : "border-rose-500/30 bg-gradient-to-br from-rose-500/10 via-amber-500/5 to-transparent";

          const badgeBg =
            tier === "high"
              ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
              : tier === "mid"
              ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
              : "bg-rose-500/15 text-rose-300 border-rose-500/30";

          return (
            <div className={`rounded-2xl border p-6 shadow-xl relative overflow-hidden flex flex-col justify-between ${borderClass}`}>
              <div className="space-y-4">
                {/* Header with Buddy Persona & Star Rating */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-base shadow-sm">
                      🤖
                    </span>
                    <div>
                      <h2 className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
                        AI Study Buddy
                        <span className="text-[10px] text-muted font-normal">· Your 24/7 Companion</span>
                      </h2>
                      <p className="text-[10px] text-secondary font-medium">
                        {buddy?.starLabel || "⭐⭐⭐⭐ Daily Progress"}
                      </p>
                    </div>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wider ${badgeBg}`}>
                    {buddy?.badge || "Study Mode ⚡"}
                  </span>
                </div>

                {/* Headline & Friendly Motivation */}
                <div className="rounded-xl bg-white/5 border border-white/5 p-3.5 space-y-1.5">
                  <p className="text-xs font-bold text-primary leading-snug">
                    {buddy?.headline || "Hey buddy! Let's make today count!"}
                  </p>
                  <p className="text-[11px] text-secondary italic leading-relaxed">
                    "{buddy?.quote || "Every step you take today brings you closer to your academic dreams. Let's do this together!"}"
                  </p>
                </div>

                {/* Tailored Action Points */}
                <div className="space-y-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-secondary">
                    Personalized Action Plan:
                  </p>
                  {buddy?.actionPoints && buddy.actionPoints.length > 0 ? (
                    buddy.actionPoints.map((pt, i) => (
                      <div
                        key={i}
                        className="rounded-xl bg-surface/80 border border-theme/60 p-3 flex items-start gap-2.5 transition hover:border-accent/40"
                      >
                        <span className="text-base shrink-0 mt-0.5">{pt.icon}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <span className="text-xs font-bold text-primary truncate">{pt.title}</span>
                            {pt.tag && (
                              <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/5 text-secondary shrink-0 border border-white/5">
                                {pt.tag}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-secondary leading-relaxed">{pt.detail}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    (data?.aiStudyTips || ["Start revising your subjects 20 mins per day.", "Practice 5 problems in your weakest subject.", "You're making great progress — keep it up!"]).map((tip, i) => (
                      <div key={i} className="flex items-start gap-2.5 rounded-xl bg-white/5 border border-white/5 px-3 py-2">
                        <span className="text-xs font-black text-cyan-400 shrink-0 mt-0.5">{i + 1}.</span>
                        <p className="text-xs text-secondary leading-relaxed">{tip}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Row 3: Charts */}
      {data && (data.performanceTrend.length > 0 || data.attendanceTrend.length > 0) && (
        <div className="grid gap-6 lg:grid-cols-2">
          {data.performanceTrend.length > 0 && (
            <div className="rounded-2xl border border-theme bg-surface p-6">
              <h2 className="text-sm font-bold text-primary mb-4 flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-violet-400" />Performance Trend</h2>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={data.performanceTrend} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                  <defs><linearGradient id="perfGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} /><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} domain={[0, 100]} />
                  <Tooltip contentStyle={{ background: '#1e1b4b', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 12, color: '#e2e8f0' }} />
                  <Area type="monotone" dataKey="avgScore" stroke="#8b5cf6" strokeWidth={2} fill="url(#perfGrad)" dot={{ fill: '#8b5cf6', r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
          {data.attendanceTrend.length > 0 && (
            <div className="rounded-2xl border border-theme bg-surface p-6">
              <h2 className="text-sm font-bold text-primary mb-4 flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-400" />Attendance Trend</h2>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={data.attendanceTrend.map(t => ({ ...t, pct: t.total > 0 ? Math.round((t.present / t.total) * 100) : 0 }))} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                  <defs><linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} domain={[0, 100]} />
                  <Tooltip contentStyle={{ background: '#0f2818', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 12, color: '#e2e8f0' }} />
                  <Area type="monotone" dataKey="pct" stroke="#10b981" strokeWidth={2} fill="url(#attGrad)" dot={{ fill: '#10b981', r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Row 4: Today's Diary */}
      <div className="rounded-2xl border border-theme bg-surface p-6">
        <h2 className="text-sm font-bold text-primary mb-4 flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          Today's Diary
        </h2>
        {classes.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {classes.map((c, i) => <HomeworkCheck key={i} entry={c} onToggle={handleToggle} />)}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-theme p-10 text-center">
            <p className="text-3xl mb-2">📅</p>
            <p className="text-sm text-muted">No homeworks posted for today.</p>
          </div>
        )}
      </div>
    </div>
  );
}
