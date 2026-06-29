"use client";

import { useState, useEffect } from "react";
import PageHeader from "@/components/shared/PageHeader";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from "recharts";
import CustomSelect from "../ui/CustomSelect";
import { generateAIInsightsAction } from "@/lib/student-actions";

function CircularProgress({ value, size = 80, strokeWidth = 8, color = "text-violet-400" }: { value: number; size?: number; strokeWidth?: number; color?: string }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-hover fill-transparent"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className={`fill-transparent transition-all duration-500 ease-out ${color}`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-[10px] font-black text-primary">{Math.round(value)}%</span>
    </div>
  );
}

type Props = {
  data: {
    subjectStats: { subject: string; score: number; maxScore: number; percentage: number }[];
    performanceTrend: { month: string; score: number }[];
    aiAnalysis: {
      paragraph: string;
      predictedGrades: { subject: string; currentGrade: string; predictedGrade: string }[];
      focusSubjects: string[];
      strongSubjects: string[];
      studyTips: string[];
      confidenceScore: number;
      goalGPA: number;
    };
  } | null;
};

type Goal = {
  id: string;
  text: string;
  completed: boolean;
};

export default function StudentPerformanceClient({ data }: Props) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [newGoalText, setNewGoalText] = useState("");
  
  // Local AI simulator states
  const [selectedSubject, setSelectedSubject] = useState("");
  const [aiAction, setAiAction] = useState("schedule");
  const [aiOutput, setAiOutput] = useState("");
  const [loadingAi, setLoadingAi] = useState(false);

  // Load goals from localstorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("student_goals");
    if (saved) {
      try {
        setGoals(JSON.parse(saved));
      } catch (e) {
        // Ignore
      }
    }
  }, []);

  const saveGoals = (newGoals: Goal[]) => {
    setGoals(newGoals);
    localStorage.setItem("student_goals", JSON.stringify(newGoals));
  };

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalText.trim()) return;
    const item: Goal = {
      id: Date.now().toString(),
      text: newGoalText.trim(),
      completed: false,
    };
    saveGoals([...goals, item]);
    setNewGoalText("");
  };

  const handleToggleGoal = (id: string) => {
    saveGoals(
      goals.map((g) => (g.id === id ? { ...g, completed: !g.completed } : g))
    );
  };

  const handleClearCompleted = () => {
    saveGoals(goals.filter((g) => !g.completed));
  };

  // Local AI Coaching generation
  const handleGenerateCoachFeedback = async () => {
    setLoadingAi(true);
    setAiOutput("");

    try {
      const res = await generateAIInsightsAction(selectedSubject, aiAction);
      setAiOutput(res.insights);
    } catch (e: any) {
      setAiOutput(`### ⚠️ AI Analysis Failed\n\nUnable to generate insights at this time: ${e.message || 'Unknown error'}`);
    } finally {
      setLoadingAi(false);
    }
  };

  if (!data || data.subjectStats.length === 0) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
        <PageHeader tag="Student Portal" title="Performance Insights" description="Analyze your academic performance trends and predictions." />
        <div className="rounded-3xl border border-dashed border-theme p-12 text-center max-w-md mx-auto">
          <p className="text-4xl mb-3">📈</p>
          <p className="text-sm font-bold text-primary">No Analytics Yet</p>
          <p className="text-xs text-muted mt-1">We need exam results in at least one subject to compute academic insights and grade predictions.</p>
        </div>
      </div>
    );
  }

  const { subjectStats, performanceTrend, aiAnalysis } = data;

  useEffect(() => {
    if (subjectStats.length > 0 && !selectedSubject) {
      setSelectedSubject(subjectStats[0].subject);
    }
  }, [subjectStats]);

  // Radar data mapping
  const radarData = subjectStats.map((s) => ({
    subject: s.subject.length > 10 ? s.subject.slice(0, 8) + ".." : s.subject,
    score: s.percentage,
    fullMark: 100,
  }));

  const activeGoals = goals.filter((g) => !g.completed).length;
  const totalGoalsCount = goals.length;
  const completedGoalsCount = goals.filter((g) => g.completed).length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      <PageHeader tag="Student Portal" title="Performance Insights" description="AI-powered analysis and grade forecasts." />

      {/* AI Overview Box */}
      <div className="rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-transparent p-6 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 p-4 text-[70px] opacity-10 leading-none">🧠</div>
        <h2 className="text-sm font-extrabold text-violet-400 uppercase tracking-widest mb-3">🤖 AI Coaching Insights</h2>
        <p className="text-sm font-semibold text-primary leading-relaxed max-w-3xl">{aiAnalysis.paragraph}</p>
        
        {/* Goals / KPI circular indicators */}
        <div className="mt-6 flex flex-wrap gap-4">
          <div className="rounded-2xl bg-surface border border-theme px-4 py-3 flex items-center gap-3">
            <CircularProgress value={(aiAnalysis.goalGPA / 10) * 100} size={45} strokeWidth={4.5} color="text-violet-400" />
            <div>
              <p className="text-[10px] font-bold text-secondary uppercase tracking-widest">Calculated GPA</p>
              <p className="text-sm font-black text-violet-400">{aiAnalysis.goalGPA.toFixed(2)}/10.0</p>
            </div>
          </div>
          <div className="rounded-2xl bg-surface border border-theme px-4 py-3 flex items-center gap-3">
            <CircularProgress value={aiAnalysis.confidenceScore} size={45} strokeWidth={4.5} color="text-emerald-400" />
            <div>
              <p className="text-[10px] font-bold text-secondary uppercase tracking-widest">AI Confidence</p>
              <p className="text-sm font-black text-emerald-400">{aiAnalysis.confidenceScore}%</p>
            </div>
          </div>
          <div className="rounded-2xl bg-surface border border-theme px-4 py-3 flex items-center gap-3">
            <CircularProgress value={totalGoalsCount > 0 ? (completedGoalsCount / totalGoalsCount) * 100 : 0} size={45} strokeWidth={4.5} color="text-amber-400" />
            <div>
              <p className="text-[10px] font-bold text-secondary uppercase tracking-widest">Goal Progress</p>
              <p className="text-sm font-black text-amber-400">{completedGoalsCount} / {totalGoalsCount} completed</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Progress Breakdown & Radar Chart */}
        <div className="rounded-2xl border border-theme bg-surface p-6 space-y-6">
          <h3 className="text-sm font-bold text-primary flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-violet-400" />
            Subject Strength Radar
          </h3>
          <div className="grid gap-6 sm:grid-cols-2 items-center">
            {/* Progress list */}
            <div className="space-y-4">
              {subjectStats.map((s, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-secondary uppercase tracking-wider">{s.subject}</span>
                    <span className="font-bold text-primary">{s.percentage}%</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-hover overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        s.percentage >= 80 ? "bg-emerald-500" : s.percentage >= 60 ? "bg-amber-500" : "bg-rose-500"
                      }`}
                      style={{ width: `${s.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            {/* Radar chart */}
            <div className="h-[200px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.05)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: "#64748b", fontSize: 9 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 8 }} />
                  <Radar name="Student Score" dataKey="score" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Grade Predictions */}
        <div className="rounded-2xl border border-theme bg-surface p-6">
          <h3 className="text-sm font-bold text-primary flex items-center gap-2 mb-4">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            Predicted Next Grades (AI Forecast)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-theme bg-hover/50 text-[10px] font-bold uppercase tracking-wider text-secondary">
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Current Grade</th>
                  <th className="py-3 px-4">Predicted Grade</th>
                  <th className="py-3 px-4 text-right">Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme">
                {aiAnalysis.predictedGrades.map((g, idx) => {
                  const currentIdx = ["F","D","C","C+","B-","B","B+","A-","A","A+"].indexOf(g.currentGrade);
                  const predIdx = ["F","D","C","C+","B-","B","B+","A-","A","A+"].indexOf(g.predictedGrade);
                  const isUp = predIdx > currentIdx;
                  const isDown = predIdx < currentIdx;

                  return (
                    <tr key={idx} className="hover:bg-hover/30 transition-colors">
                      <td className="py-3.5 px-4 text-xs font-bold text-primary uppercase tracking-wider">{g.subject}</td>
                      <td className="py-3.5 px-4 text-xs font-semibold text-secondary">{g.currentGrade}</td>
                      <td className="py-3.5 px-4 text-xs font-black text-violet-400">{g.predictedGrade}</td>
                      <td className="py-3.5 px-4 text-xs font-bold text-right">
                        {isUp ? (
                          <span className="text-emerald-400">▲ Up</span>
                        ) : isDown ? (
                          <span className="text-rose-400">▼ Down</span>
                        ) : (
                          <span className="text-muted">Stable</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Strong Subjects */}
        <div className="rounded-2xl border border-emerald-500/10 bg-emerald-500/5 p-5 space-y-3">
          <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
            🏆 Strong Subjects
          </p>
          <div className="flex flex-wrap gap-2">
            {aiAnalysis.strongSubjects.length > 0 ? (
              aiAnalysis.strongSubjects.map((s, idx) => (
                <span key={idx} className="rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 text-xs font-bold">
                  {s}
                </span>
              ))
            ) : (
              <span className="text-xs text-muted">Analytics warming up...</span>
            )}
          </div>
        </div>

        {/* Improvement Areas */}
        <div className="rounded-2xl border border-rose-500/10 bg-rose-500/5 p-5 space-y-3">
          <p className="text-xs font-bold text-rose-400 uppercase tracking-widest flex items-center gap-1.5">
            🎯 Focus Subjects
          </p>
          <div className="flex flex-wrap gap-2">
            {aiAnalysis.focusSubjects.length > 0 ? (
              aiAnalysis.focusSubjects.map((s, idx) => (
                <span key={idx} className="rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 px-3 py-1.5 text-xs font-bold">
                  {s}
                </span>
              ))
            ) : (
              <span className="text-xs text-muted">All subjects stable!</span>
            )}
          </div>
        </div>

        {/* Action Plan */}
        <div className="rounded-2xl border border-theme bg-surface p-5 space-y-3">
          <p className="text-xs font-bold text-violet-400 uppercase tracking-widest">
            💡 Study & Action Tips
          </p>
          <ul className="space-y-2">
            {aiAnalysis.studyTips.map((tip, idx) => (
              <li key={idx} className="text-xs text-secondary leading-relaxed flex items-start gap-1.5">
                <span className="text-violet-400 shrink-0">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Goal Tracker */}
        <div className="lg:col-span-1 rounded-2xl border border-theme bg-surface p-6 flex flex-col justify-between shadow-md">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                <span>🎯</span> Academic Goal Tracker
              </h3>
              {totalGoalsCount > 0 && (
                <CircularProgress value={totalGoalsCount > 0 ? (completedGoalsCount / totalGoalsCount) * 100 : 0} size={36} strokeWidth={4} color="text-amber-400" />
              )}
            </div>
            <form onSubmit={handleAddGoal} className="flex gap-2 mb-4">
              <input
                type="text"
                value={newGoalText}
                onChange={(e) => setNewGoalText(e.target.value)}
                placeholder="Add study goal..."
                className="flex-1 rounded-xl border border-theme bg-hover px-3 py-2 text-xs text-primary focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
              <button type="submit" className="rounded-xl bg-violet-500 hover:bg-violet-600 text-white px-3 py-2 text-xs font-bold transition">
                +
              </button>
            </form>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {goals.map((g) => (
                <label key={g.id} className="flex items-center gap-3 rounded-xl border border-theme bg-hover/20 p-3 hover:bg-hover cursor-pointer transition">
                  <input type="checkbox" checked={g.completed} onChange={() => handleToggleGoal(g.id)} className="accent-violet-500" />
                  <span className={`text-xs text-primary ${g.completed ? "line-through opacity-50" : ""}`}>{g.text}</span>
                </label>
              ))}
              {goals.length === 0 && (
                <p className="text-xs text-muted text-center py-4">No goals added yet. E.g. &ldquo;Study 2 hours&rdquo;</p>
              )}
            </div>
          </div>
          {goals.some((g) => g.completed) && (
            <button onClick={handleClearCompleted} className="w-full mt-4 text-[10px] uppercase font-bold text-rose-400 hover:underline">
              Clear Completed Goals
            </button>
          )}
        </div>

        {/* Interactive AI Coach Feedback */}
        <div className="lg:col-span-2 rounded-2xl border border-theme bg-surface p-6 shadow-md">
          <h3 className="text-sm font-bold text-primary flex items-center gap-2 mb-4">
            <span>🤖</span> Interactive AI Coaching Feedback
          </h3>
          <div className="grid gap-4 sm:grid-cols-3 mb-4">
            <div className="z-30">
              <label className="block text-[9px] font-bold uppercase text-secondary mb-1">Subject</label>
              <CustomSelect
                options={subjectStats.map((s) => ({ value: s.subject, label: s.subject }))}
                value={selectedSubject}
                onChange={(val) => setSelectedSubject(String(val))}
                className="w-full"
              />
            </div>
            <div className="z-30">
              <label className="block text-[9px] font-bold uppercase text-secondary mb-1">AI Action Plan</label>
              <CustomSelect
                options={[
                  { value: "schedule", label: "📅 Draft Study Schedule" },
                  { value: "mistakes", label: "🎯 Analyze Exam Mistakes" },
                  { value: "mnemonics", label: "🧠 Build Mnemonics" }
                ]}
                value={aiAction}
                onChange={(val) => setAiAction(String(val))}
                className="w-full"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleGenerateCoachFeedback}
                disabled={loadingAi}
                className="w-full rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white p-2.5 text-xs font-bold transition disabled:opacity-50"
              >
                {loadingAi ? "Analyzing..." : "Generate Action Plan"}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-theme bg-hover/30 p-4 min-h-[120px] flex items-center justify-center">
            {loadingAi ? (
              <div className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
                <span className="text-xs text-muted">Running AI Coach analyzer...</span>
              </div>
            ) : aiOutput ? (
              <div className="prose prose-sm prose-invert text-xs text-primary leading-relaxed whitespace-pre-wrap w-full font-sans">
                {aiOutput}
              </div>
            ) : (
              <p className="text-xs text-muted italic">Select a subject and action above, then click generate!</p>
            )}
          </div>
        </div>
      </div>

      {/* Historical Progress Trend Chart */}
      {performanceTrend.length > 0 && (
        <div className="rounded-2xl border border-theme bg-surface p-6 shadow-md">
          <h3 className="text-sm font-bold text-primary flex items-center gap-2 mb-4">
            <span className="h-2.5 w-2.5 rounded-full bg-violet-400" />
            Historical Progress Trend
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={performanceTrend} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="perfTheme" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 10 }} />
              <YAxis tick={{ fill: "#64748b", fontSize: 10 }} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: "#1e1b4b", border: "1px solid rgba(139,92,246,0.3)", borderRadius: 16, color: "#e2e8f0", fontSize: 11 }} />
              <Area type="monotone" dataKey="score" stroke="#8b5cf6" strokeWidth={3} fill="url(#perfTheme)" dot={{ fill: "#8b5cf6", r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Witty Gen-Z Cheat Sheets / Study Hacks */}
      <div className="rounded-2xl border border-theme bg-surface p-6 shadow-md">
        <h3 className="text-sm font-bold text-primary flex items-center gap-2 mb-4">
          <span>🧠</span> Gen-Z Academic Cheat Sheets & Hacks
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          <div className="rounded-xl border border-theme bg-hover/20 p-4 space-y-2">
            <p className="text-xs font-bold text-violet-400 uppercase tracking-wide">🔥 The 25-Min Rule</p>
            <p className="text-[11px] text-secondary leading-relaxed">
              Study for 25 minutes, then scroll TikTok / eat a snack for 5 minutes. Repeating this 4 times gets you 100% focused without burning out.
            </p>
          </div>
          <div className="rounded-xl border border-theme bg-hover/20 p-4 space-y-2">
            <p className="text-xs font-bold text-emerald-400 uppercase tracking-wide">📢 Feynman Method</p>
            <p className="text-[11px] text-secondary leading-relaxed">
              If you can&apos;t explain a topic to a 10-year-old using simple words, you don&apos;t fully understand it. Teach it to your pet or a mirror!
            </p>
          </div>
          <div className="rounded-xl border border-theme bg-hover/20 p-4 space-y-2">
            <p className="text-xs font-bold text-amber-400 uppercase tracking-wide">💤 Sleep Consolidation</p>
            <p className="text-[11px] text-secondary leading-relaxed">
              Reviewing your cheat sheets right before sleeping helps your brain lock them into long-term memory overnight. Sleep is literally study time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
