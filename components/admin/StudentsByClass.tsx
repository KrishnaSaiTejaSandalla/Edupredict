"use client";

import React from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

const COLORS = [
  "#22d3ee", // cyan
  "#6366f1", // indigo
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#f43f5e", // rose
  "#eab308", // amber
  "#10b981", // emerald
];

type Props = {
  data?: { className: string; count: number }[];
};

export default function StudentsByClass({ data = [] }: Props) {
  const totalStudents = data.reduce((sum, item) => sum + item.count, 0);

  const chartData = data
    .filter((item) => item.count > 0)
    .map((item, index) => ({
      name: item.className,
      value: item.count,
      color: COLORS[index % COLORS.length],
    }));

  const tooltipStyle = {
    backgroundColor: "var(--card)",
    backdropFilter: "blur(16px)",
    border: "1px solid var(--border)",
    borderRadius: "14px",
    color: "var(--foreground)",
    boxShadow: "var(--shadow-md)",
    padding: "8px 12px",
    fontSize: "12px",
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const pct = totalStudents > 0 ? ((data.value / totalStudents) * 100).toFixed(1) : 0;
      return (
        <div style={tooltipStyle}>
          <p className="font-semibold text-xs text-foreground">{data.name}</p>
          <p className="mt-1 text-sm font-bold text-cyan-500">
            {data.value} students ({pct}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-md h-[400px] flex flex-col justify-between transition-colors duration-200">
      <div className="shrink-0 mb-1">
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          Students by Class
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">Class-wise enrollment demographics</p>
      </div>

      <div className="flex-1 min-h-0 relative flex flex-col justify-center gap-3">
        {chartData.length > 0 ? (
          <>
            <div className="w-full h-[210px] relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip content={<CustomTooltip />} />
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Classes</span>
                <span className="text-lg font-bold text-foreground">{chartData.length}</span>
              </div>
            </div>

            {/* Scrollable Legend */}
            <div className="w-full max-h-[75px] overflow-y-auto pr-1 scrollbar-hide space-y-1.5">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                {chartData.map((entry, idx) => {
                  const pct = totalStudents > 0 ? ((entry.value / totalStudents) * 100).toFixed(0) : 0;
                  return (
                    <div key={`${entry.name}-${idx}`} className="flex items-center justify-between text-xs gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-muted-foreground truncate font-medium">{entry.name}</span>
                      </div>
                      <span className="font-semibold text-foreground shrink-0">
                        {entry.value} ({pct}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center text-center py-6">
            <svg viewBox="0 0 24 24" className="h-9 w-9 text-muted-foreground/30 mb-2" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
            </svg>
            <p className="text-xs font-semibold text-muted-foreground">No students enrolled</p>
          </div>
        )}
      </div>

      <div className="shrink-0 mt-1 pt-2 border-t border-subtle flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium">Total Enrollment</span>
        <span className="text-sm font-bold text-cyan-500 dark:text-cyan-400">
          {totalStudents.toLocaleString()} Students
        </span>
      </div>
    </section>
  );
}
