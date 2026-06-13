"use client";

import nextDynamic from "next/dynamic";
import React from "react";

export const DynamicDashboardCharts = nextDynamic(
  () => import("./DashboardCharts"),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-2xl border border-border bg-card p-6 shadow-md h-[400px] animate-pulse" />
    ),
  }
);

export const DynamicAnalyticsCharts = nextDynamic(
  () => import("./AnalyticsCharts"),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-2xl border border-border bg-card p-6 shadow-md h-[500px] animate-pulse" />
    ),
  }
);
