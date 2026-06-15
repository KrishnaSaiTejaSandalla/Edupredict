"use client";

import React from "react";

type Insight = {
  id: string;
  message: string;
  severity: "high" | "medium" | "low";
};

type Props = {
  insights?: Insight[];
};

export default function AiInsightsCard({ insights = [] }: Props) {
  const getSeverityStyles = (severity: "high" | "medium" | "low") => {
    switch (severity) {
      case "high":
        return "bg-rose-500/10 text-rose-500 dark:text-rose-400 border-rose-500/20";
      case "medium":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "low":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-md h-[400px] flex flex-col transition-colors duration-200">
      {/* Fixed Header */}
      <div className="shrink-0 mb-4 pb-3 border-b border-subtle">
        <h2 className="text-base font-semibold text-foreground tracking-tight flex items-center gap-2">
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-cyan-500" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21m0 0l-.813-5.096L3 15.094l5.096-.813L9 9.125l.813 5.156L15 15.094l-5.188.81Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.071 4.929a10 10 0 00-14.142 0M12 3v2" />
          </svg>
          AI Insights
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">Automated recommendations and risk predictions</p>
      </div>

      {/* Content Area - Scrollable Only */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 scrollbar-hide">
        {insights.length > 0 ? (
          <ul className="space-y-2.5">
            {insights.map((insight) => (
              <li
                key={insight.id}
                className="group rounded-xl border border-subtle bg-hover/20 p-3.5 hover:bg-hover hover:border-border transition-all duration-300 flex items-start justify-between gap-3"
              >
                <p className="text-xs text-secondary leading-relaxed font-medium">
                  {insight.message}
                </p>
                <span className={`inline-flex shrink-0 items-center rounded-lg border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${getSeverityStyles(insight.severity)}`}>
                  {insight.severity}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center py-6">
            <svg viewBox="0 0 24 24" className="h-9 w-9 text-muted-foreground/30 mb-2" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21m0 0l-.813-5.096L3 15.094l5.096-.813L9 9.125l.813 5.156L15 15.094l-5.188.81Z" />
            </svg>
            <p className="text-xs font-semibold text-muted-foreground">No AI insights available yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
