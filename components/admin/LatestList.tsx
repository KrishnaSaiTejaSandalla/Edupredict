"use client";

import React from "react";
import Link from "next/link";
import type { Route } from "next";

export default function LatestList({
  title,
  items,
  viewAllHref,
}: {
  title: string;
  items: {
    id: number;
    name: string;
    className: string;
    admissionDate: string;
    initials: string;
    riskLevel: "low" | "medium" | "high" | null;
  }[];
  viewAllHref: Route;
}) {
  const getAvatarGradient = (name: string) => {
    const colors = [
      "from-blue-500/20 to-indigo-500/20 border-blue-500/30 text-blue-600 dark:text-blue-300",
      "from-purple-500/20 to-pink-500/20 border-purple-500/30 text-purple-600 dark:text-purple-300",
      "from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-600 dark:text-emerald-300",
      "from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-600 dark:text-amber-300",
      "from-rose-500/20 to-red-500/20 border-rose-500/30 text-rose-600 dark:text-rose-300",
    ];
    let sum = 0;
    for (let i = 0; i < name.length; i++) {
      sum += name.charCodeAt(i);
    }
    return colors[sum % colors.length];
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-md h-[450px] flex flex-col transition-colors duration-200">
      <div className="shrink-0 mb-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Real-time status tracking for recently enrolled students
          </p>
        </div>

        <Link
          href={viewAllHref}
          className="shrink-0 text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 transition duration-150"
        >
          View All →
        </Link>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pr-1 scrollbar-hide">
        <ul className="space-y-2.5">
          {items.map((item) => (
            <li
              key={item.id}
              className="group rounded-xl border border-subtle bg-hover/20 p-4 transition-all duration-300 hover:bg-hover hover:border-border"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between w-full">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border font-bold text-xs bg-gradient-to-br ${getAvatarGradient(item.name)} shadow-md`}>
                    {item.initials}
                  </div>

                  <div className="min-w-0">
                    <Link
                      href={`/admin/students/${item.id}`}
                      className="text-sm font-semibold text-foreground hover:text-cyan-600 dark:hover:text-cyan-400 transition duration-150 truncate block"
                    >
                      {item.name}
                    </Link>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {item.className}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 sm:gap-6 justify-between sm:justify-end shrink-0">
                  <div className="text-left sm:text-right">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Admitted</p>
                    <p className="text-xs font-medium text-foreground mt-0.5">
                      {item.admissionDate}
                    </p>
                  </div>

                  <div className="shrink-0">
                    {item.riskLevel === "high" ? (
                      <span className="inline-flex items-center rounded-full bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 text-xs font-semibold text-rose-500 dark:text-rose-400">
                        <span className="mr-1 h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                        High Risk
                      </span>
                    ) : item.riskLevel === "medium" ? (
                      <span className="inline-flex items-center rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 text-xs font-semibold text-amber-500 dark:text-amber-400">
                        <span className="mr-1 h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                        Medium Risk
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-500 dark:text-emerald-400">
                        <span className="mr-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        On Track
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </li>
          ))}

          {items.length === 0 && (
            <li className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground bg-transparent">
              No recent students found.
            </li>
          )}
        </ul>
      </div>
    </section>
  );
}