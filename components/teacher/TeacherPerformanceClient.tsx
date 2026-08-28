"use client";

import React from "react";
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
} from "recharts";
import type { TeacherPerformanceData } from "@/lib/teacher-performance.service";
import FormattedText from "@/components/shared/FormattedText";

type Props = {
  performance: TeacherPerformanceData;
};

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

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          viewBox="0 0 24 24"
          className={`h-4 w-4 ${star <= Math.round(rating) ? "fill-amber-400" : "fill-muted-foreground/30"}`}
        >
          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
        </svg>
      ))}
    </div>
  );
}

const MOTIVATIONAL_QUOTES = [
  {
    quote: "“The art of teaching is the art of assisting discovery.”",
    author: "Mark Van Doren",
    tip: "Keep high energy today! A 5-minute interactive quiz at the start of class boosts retention by up to 40%."
  },
  {
    quote: "“Education is not the filling of a pail, but the lighting of a fire.”",
    author: "William Butler Yeats",
    tip: "Celebrate small student victories today. A single word of genuine praise can transform a quiet student's term."
  },
  {
    quote: "“Tell me and I forget. Teach me and I remember. Involve me and I learn.”",
    author: "Benjamin Franklin",
    tip: "Try a rapid 2-minute peer-teaching exercise today — have students explain one concept to their bench partner."
  },
  {
    quote: "“Every student can learn, just not on the same day, or in the same way.”",
    author: "George Evans",
    tip: "Use the AI Material Builder in Resources to generate differentiated practice sets for fast and remedial learners."
  },
  {
    quote: "“One child, one teacher, one book, and one pen can change the world.”",
    author: "Malala Yousafzai",
    tip: "Turn upcoming review sessions into a lively quiz competition — friendly team games keep attention razor-sharp!"
  }
];

export default function TeacherPerformanceClient({ performance }: Props) {
  const { kpis, teachingEffectiveness, classOutcomes, aiInsights, feedbackStats } = performance;

  const [activeQuoteIdx, setActiveQuoteIdx] = React.useState(0);

  React.useEffect(() => {
    // Pick random quote on each page load/entry
    const randomIdx = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length);
    setActiveQuoteIdx(randomIdx);
  }, []);

  const activeQuote = MOTIVATIONAL_QUOTES[activeQuoteIdx];

  const kpiCards = [
    {
      label: "Teacher Rating",
      value: kpis.teacherRating > 0 ? `${kpis.teacherRating}/5` : "0",
      sub: kpis.teacherRating > 0 ? <StarRating rating={kpis.teacherRating} /> : <p className="text-[10px] text-muted-foreground">No feedback yet</p>,
      color: "amber",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
        </svg>
      ),
      iconClass: "bg-amber-500/15 text-amber-700 dark:text-amber-500",
    },
    {
      label: "Attendance Completion",
      value: `${kpis.attendanceCompletionRate}%`,
      sub: null,
      color: "emerald",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      iconClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-500",
    },
    {
      label: "Grading Rate",
      value: `${kpis.gradingRate}%`,
      sub: null,
      color: kpis.gradingRate < 70 ? "rose" : "blue",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      iconClass: kpis.gradingRate < 70 ? "bg-rose-500/15 text-rose-700 dark:text-rose-500" : "bg-blue-500/15 text-blue-700 dark:text-blue-500",
    },
    {
      label: "Student Satisfaction",
      value: kpis.studentSatisfaction > 0 ? `${kpis.studentSatisfaction}%` : "0%",
      sub: null,
      color: "violet",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      iconClass: "bg-violet-500/15 text-violet-700 dark:text-violet-500",
    },
  ];

  const colorMap: Record<string, string> = {
    amber: "from-amber-500/15 via-yellow-400/8 to-white dark:from-amber-500/15 dark:via-yellow-400/5 dark:to-transparent border-amber-100 dark:border-amber-500/10 hover:border-amber-300 dark:hover:border-amber-500/30",
    emerald: "from-emerald-500/15 via-green-400/8 to-white dark:from-emerald-500/15 dark:via-green-400/5 dark:to-transparent border-emerald-100 dark:border-emerald-500/10 hover:border-emerald-300 dark:hover:border-emerald-500/30",
    rose: "from-rose-500/15 via-pink-400/8 to-white dark:from-rose-500/15 dark:via-pink-400/5 dark:to-transparent border-rose-100 dark:border-rose-500/10 hover:border-rose-300 dark:hover:border-rose-500/30",
    blue: "from-blue-500/15 via-blue-400/8 to-white dark:from-blue-500/15 dark:via-blue-400/5 dark:to-transparent border-blue-100 dark:border-blue-500/10 hover:border-blue-300 dark:hover:border-blue-500/30",
    violet: "from-violet-500/15 via-indigo-400/8 to-white dark:from-violet-500/15 dark:via-indigo-400/5 dark:to-transparent border-indigo-100 dark:border-indigo-500/10 hover:border-indigo-300 dark:hover:border-indigo-500/30",
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-500 dark:text-cyan-400">
            Faculty Portal
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-primary sm:text-4xl">Performance & Companion</h1>
          <p className="mt-2 text-sm text-secondary">
            Your teaching effectiveness metrics, companion insights, and classroom action plans.
          </p>
        </div>
      </div>

      {/* Motivational Companion Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-cyan-500/30 bg-gradient-to-r from-cyan-500/15 via-blue-600/10 to-purple-600/10 p-6 sm:p-8 shadow-xl backdrop-blur-md">
        <div className="absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-bold">
                ✨
              </span>
              <span className="text-[11px] font-bold uppercase tracking-widest text-cyan-400">
                Daily Faculty Inspiration
              </span>
            </div>
            <h2 className="text-lg sm:text-xl md:text-2xl font-black tracking-tight text-foreground leading-snug">
              {activeQuote.quote}
            </h2>
            <p className="text-xs font-semibold text-cyan-500/80">
              — {activeQuote.author}
            </p>
            <div className="mt-3 pt-3 border-t border-cyan-500/20 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="text-cyan-400 font-bold">💡 Companion Tip:</span>
              <span>{activeQuote.tip}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveQuoteIdx((prev) => (prev + 1) % MOTIVATIONAL_QUOTES.length)}
            className="shrink-0 rounded-2xl border border-cyan-500/30 bg-card/80 px-4 py-2.5 text-xs font-bold text-cyan-400 hover:bg-hover hover:border-cyan-500/50 transition shadow-sm active:scale-95"
          >
            🔄 New Motivation
          </button>
        </div>
      </section>

      {/* KPI Cards */}
      <section className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card) => (
          <div
            key={card.label}
            className={`rounded-2xl border bg-gradient-to-br p-5 shadow-sm hover:-translate-y-1 transition-all duration-300 group ${colorMap[card.color]}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-secondary uppercase tracking-wider">{card.label}</p>
                <p className="mt-3 text-3xl font-bold tracking-tight text-primary">{card.value}</p>
                {card.sub && <div className="mt-2">{card.sub}</div>}
              </div>
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110 ${card.iconClass}`}>
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Charts Row — section header */}
      <section className="grid gap-6 lg:grid-cols-2">
        {/* Teaching Effectiveness */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-md flex flex-col">
          <div className="mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">Teaching Effectiveness</h2>
            <p className="text-xs text-muted-foreground mt-1">Average student scores over time across your classes</p>
          </div>
          <div className="flex-1 min-h-[200px]">
            {teachingEffectiveness.length < 2 ? (
              <div className="h-full flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border">
                <p className="text-xs text-muted-foreground text-center px-4">
                  Insufficient data. Enter marks for at least 2 months to see trends.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={teachingEffectiveness} margin={{ left: -15, right: 10, top: 5, bottom: 5 }}>
                  <defs>
                    <linearGradient id="effectivenessGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.3} />
                  <XAxis dataKey="month" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "#22d3ee", strokeWidth: 1, strokeDasharray: "4 4" }} />
                  <Area dataKey="avgScore" name="Avg Score %" stroke="#22d3ee" fill="url(#effectivenessGrad)" strokeWidth={2} dot={{ fill: "#22d3ee", r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Class Outcomes */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-md flex flex-col">
          <div className="mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">Class Outcomes</h2>
            <p className="text-xs text-muted-foreground mt-1">Average performance by class</p>
          </div>
          <div className="flex-1 min-h-[200px]">
            {classOutcomes.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border">
                <p className="text-xs text-muted-foreground">No results data available yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={classOutcomes} margin={{ left: -15, right: 10, top: 5, bottom: 5 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.3} />
                  <XAxis dataKey="className" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--bg-hover)", radius: 6 }} />
                  <Bar dataKey="avgScore" name="Avg Score %" fill="#a78bfa" radius={[6, 6, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>

      {/* AI Teaching Companion & Performance Analysis */}
      <section className="rounded-3xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/5 via-card to-card p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 text-cyan-400 text-2xl shrink-0 shadow-sm border border-cyan-500/20">
              🤝
            </span>
            <div>
              <h2 className="text-base font-bold uppercase tracking-wider text-foreground">
                AI Teaching Companion & Classroom Strategy
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Personalized pedagogical coaching, student motivation, and exam readiness recommendations
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-400 border border-cyan-500/20">
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" /> Live Analysis Active
          </span>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {/* Card 1: Classroom Games & Active Engagement */}
          <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 to-transparent p-5 space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400 text-base">
                🎮
              </span>
              <p className="text-xs font-bold uppercase tracking-widest text-cyan-400">
                Classroom Engagement & Fun Games
              </p>
            </div>
            <p className="text-xs text-foreground leading-relaxed">
              <strong>Boost participation with lively learning games:</strong> Hold a 5-minute <em>"Speed Quiz Battle"</em> or team buzzer round at the beginning of lessons. Divide the class into two teams to compete on key formulas or vocabulary. Active competitions energize quiet students and double retention rates!
            </p>
          </div>

          {/* Card 2: Student Focus & Weak Topics */}
          <div className="rounded-2xl border border-rose-500/30 bg-gradient-to-br from-rose-500/10 to-transparent p-5 space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/20 text-rose-400 text-base">
                🎯
              </span>
              <p className="text-xs font-bold uppercase tracking-widest text-rose-400">
                Targeted Attention & Focus Areas
              </p>
            </div>
            <div className="text-xs text-foreground leading-relaxed">
              {aiInsights?.noticing ? (
                <FormattedText text={aiInsights.noticing} />
              ) : (
                <p>Focus on foundational concepts for struggling students. Identify students with scores under 60% or attendance below 75% for 1-on-1 encouragement.</p>
              )}
            </div>
          </div>

          {/* Card 3: Exam Prep & Study Packs */}
          <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-transparent p-5 space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 text-base">
                📚
              </span>
              <p className="text-xs font-bold uppercase tracking-widest text-amber-400">
                Exam Readiness & Resource Kits
              </p>
            </div>
            <p className="text-xs text-foreground leading-relaxed">
              <strong>Keep exam readiness proactive:</strong> As chapter tests approach, generate a <em>7-Day High-Yield Revision Plan</em> or <em>Diagnostic Quiz</em> using the <strong>AI Material Builder</strong> in the Resources tab. Distribute formula sheets and model question papers 10 days before exams to eliminate test anxiety.
            </p>
          </div>

          {/* Card 4: Actionable Teaching Experiments */}
          <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-transparent p-5 space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 text-base">
                💡
              </span>
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                Companion Pedagogical Strategy
              </p>
            </div>
            <div className="text-xs text-foreground leading-relaxed">
              {aiInsights?.tryAction ? (
                <FormattedText text={aiInsights.tryAction} />
              ) : (
                <p>Encourage quiet students to participate by using think-pair-share. Clear pending grading promptly so students can learn from mistakes before the next assessment.</p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-subtle bg-background/50 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-muted-foreground flex items-center gap-2">
            <span className="text-cyan-400">✨</span>
            <span>Your companion suggestions automatically adapt as marks, attendance, and exam dates are recorded.</span>
          </p>
          <a
            href="/teacher/resources"
            className="text-xs font-bold text-cyan-400 hover:text-cyan-300 underline underline-offset-4 shrink-0"
          >
            Open AI Material Builder →
          </a>
        </div>
      </section>



      {/* Student Feedback Section */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-md space-y-6">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">Student Feedback</h2>
          <p className="text-xs text-muted-foreground mt-1">Review ratings and comments submitted by your students</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Average Rating Card */}
          <div className="rounded-xl border border-border bg-muted/5 p-5 flex flex-col justify-between">
            <div>
              <p className="text-xs font-medium text-secondary uppercase tracking-wider">Average Rating</p>
              <p className="mt-3 text-4xl font-bold text-primary">
                {feedbackStats?.averageRating || 0} <span className="text-sm font-normal text-muted-foreground">/ 5</span>
              </p>
            </div>
            <div className="mt-4">
              <StarRating rating={feedbackStats?.averageRating || 0} />
            </div>
          </div>

          {/* Feedback Count Card */}
          <div className="rounded-xl border border-border bg-muted/5 p-5 flex flex-col justify-between">
            <div>
              <p className="text-xs font-medium text-secondary uppercase tracking-wider">Feedback Count</p>
              <p className="mt-3 text-4xl font-bold text-primary">
                {feedbackStats?.feedbackCount || 0}
              </p>
            </div>
            <p className="text-[10px] text-muted-foreground mt-4">Total ratings received this academic year</p>
          </div>

          {/* Recent Feedback Comments Card */}
          <div className="rounded-xl border border-border bg-muted/5 p-5 md:col-span-1 flex flex-col">
            <p className="text-xs font-medium text-secondary uppercase tracking-wider mb-3">Recent Feedback</p>
            <div className="flex-1 space-y-3 overflow-y-auto max-h-[120px] scrollbar-hide">
              {!feedbackStats?.recentFeedback || feedbackStats.recentFeedback.length === 0 ? (
                <p className="text-xs italic text-muted-foreground">"No feedback available yet."</p>
              ) : (
                feedbackStats.recentFeedback.map((comment, index) => (
                  <div key={index} className="text-xs text-foreground bg-card border border-border p-2.5 rounded-lg">
                    "{comment}"
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
