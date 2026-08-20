"use client";

import React from "react";

export type InsightItem = {
  id: string;
  category?: string;
  title?: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  entity?: string;
  message: string;
  metric?: string;
  action?: string;
  confidence?: number;
};

type Props = {
  insights?: InsightItem[];
};

export default function AiInsightsCard({ insights = [] }: Props) {
  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-rose-500/15 text-rose-400 border-rose-500/30";
      case "high":
        return "bg-rose-500/10 text-rose-500 dark:text-rose-400 border-rose-500/20";
      case "medium":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "low":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "info":
      default:
        return "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20";
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-md h-[400px] flex flex-col transition-colors duration-200">
      {/* Fixed Header */}
      <div className="shrink-0 mb-4 pb-3 border-b border-subtle flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground tracking-tight flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-cyan-500" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21m0 0l-.813-5.096L3 15.094l5.096-.813L9 9.125l.813 5.156L15 15.094l-5.188.81Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.071 4.929a10 10 0 00-14.142 0M12 3v2" />
            </svg>
            AI Insights & Priorities
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Automated recommendations and risk predictions</p>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase tracking-wider hidden sm:inline-block">
          Auto-Ranked
        </span>
      </div>

      {/* Content Area - Scrollable */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 scrollbar-hide">
        {insights.length > 0 ? (
          <ul className="space-y-3">
            {insights.map((insight) => (
              <li
                key={insight.id}
                className="group rounded-xl border border-subtle bg-hover/20 p-3.5 hover:bg-hover hover:border-border transition-all duration-300 flex flex-col justify-between gap-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {insight.category && (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                        [{insight.category}]
                      </span>
                    )}
                    <h3 className="text-xs font-bold text-foreground group-hover:text-cyan-400 transition">
                      {insight.title || insight.message}
                    </h3>
                  </div>
                  <span className={`inline-flex shrink-0 items-center rounded-lg border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${getSeverityStyles(insight.severity)}`}>
                    {insight.severity}
                  </span>
                </div>

                {insight.title && (
                  <p className="text-xs text-secondary leading-relaxed font-medium">
                    {insight.message}
                  </p>
                )}

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/10 text-[10px]">
                  {insight.metric ? (
                    <span className="font-mono font-semibold text-cyan-400">
                      {insight.metric}
                    </span>
                  ) : insight.entity ? (
                    <span className="text-muted-foreground">Entity: {insight.entity}</span>
                  ) : <span />}

                  {insight.action && (
                    <span className="text-[10px] text-muted-foreground italic truncate max-w-[200px]">
                      ⚡ {insight.action}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center py-6">
            <svg viewBox="0 0 24 24" className="h-9 w-9 text-muted-foreground/30 mb-2" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21m0 0l-.813-5.096L3 15.094l5.096-.813L9 9.125l.813 5.156L15 15.094l-5.188.81Z" />
            </svg>
            <p className="text-xs font-semibold text-muted-foreground">No critical alerts detected across active records</p>
          </div>
        )}
      </div>
    </div>
  );
}
