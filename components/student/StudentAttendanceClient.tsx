"use client";

import { useState, useEffect } from "react";
import PageHeader from "@/components/shared/PageHeader";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import CustomSelect from "../ui/CustomSelect";

type RecordType = {
  id: number;
  date: string;
  status: string;
  remarks: string | null;
  topicTaught: string | null;
};

type Props = {
  initialRecords: RecordType[];
};

export default function StudentAttendanceClient({ initialRecords }: Props) {
  const [filter, setFilter] = useState<"all" | "present" | "absent" | "late">("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, selectedMonth, selectedYear, searchQuery]);

  // Extract years present in database records
  const uniqueYears = Array.from(new Set(initialRecords.map(r => new Date(r.date).getFullYear()))).sort((a, b) => b - a);

  const months = [
    { value: "all", label: "All Months" },
    { value: "0", label: "January" },
    { value: "1", label: "February" },
    { value: "2", label: "March" },
    { value: "3", label: "April" },
    { value: "4", label: "May" },
    { value: "5", label: "June" },
    { value: "6", label: "July" },
    { value: "7", label: "August" },
    { value: "8", label: "September" },
    { value: "9", label: "October" },
    { value: "10", label: "November" },
    { value: "11", label: "December" },
  ];

  // Filtering
  const filtered = initialRecords.filter((r) => {
    const d = new Date(r.date);
    const matchesStatus = filter === "all" || r.status.toLowerCase() === filter;
    const matchesMonth = selectedMonth === "all" || d.getMonth().toString() === selectedMonth;
    const matchesYear = selectedYear === "all" || d.getFullYear().toString() === selectedYear;
    const matchesSearch = searchQuery.trim() === "" ||
      (r.remarks && r.remarks.toLowerCase().includes(searchQuery.toLowerCase())) ||
      r.date.includes(searchQuery);
    return matchesStatus && matchesMonth && matchesYear && matchesSearch;
  });

  // Compute monthly trends from initialRecords (last 6 months, sorted chronologically)
  const computeMonthlyTrends = () => {
    const monthlyStats: Record<string, { present: number; total: number }> = {};
    initialRecords.forEach((r) => {
      const yearMonth = r.date.substring(0, 7); // "YYYY-MM"
      if (!monthlyStats[yearMonth]) {
        monthlyStats[yearMonth] = { present: 0, total: 0 };
      }
      monthlyStats[yearMonth].total += 1;
      const s = r.status.toLowerCase();
      if (s === "present" || s === "late" || s === "leave" || s === "excused" || s === "sick") {
        monthlyStats[yearMonth].present += 1;
      }
    });

    return Object.entries(monthlyStats)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, value]) => {
        const [year, month] = key.split("-");
        const monthName = new Date(Number(year), Number(month) - 1, 1).toLocaleString("default", { month: "short" });
        return {
          month: `${monthName} ${year}`,
          rate: value.total > 0 ? Math.round((value.present / value.total) * 100) : 0,
        };
      })
      .slice(-6); // last 6 months
  };

  const monthlyTrends = computeMonthlyTrends();

  // Calculate counts based on FILTERED records
  const totalFiltered = filtered.length;
  const presentFiltered = filtered.filter((r) => r.status.toLowerCase() === "present").length;
  const absentFiltered = filtered.filter((r) => r.status.toLowerCase() === "absent").length;
  const lateFiltered = filtered.filter((r) => r.status.toLowerCase() === "late").length;
  // Support excused / leave statuses
  const leaveFiltered = filtered.filter((r) => {
    const s = r.status.toLowerCase();
    return s === "leave" || s === "excused" || s === "sick";
  }).length;

  const attendanceRate = totalFiltered > 0 ? Math.round(((presentFiltered + lateFiltered + leaveFiltered) / totalFiltered) * 100) : 0;

  // Pie chart data
  const chartData = [
    { name: "Present", value: presentFiltered + lateFiltered, color: "#34d399" },
    { name: "Absent", value: absentFiltered, color: "#f87171" },
    { name: "Leave", value: leaveFiltered, color: "#fb923c" },
  ].filter(d => d.value > 0);

  // Pagination
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginatedData = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      <PageHeader tag="Student Portal" title="My Attendance" description="Keep track of your classes and consistency." />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* KPI Cards (Col Span 2) */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          <div className="rounded-2xl p-5 border border-theme bg-surface relative overflow-hidden flex flex-col justify-between">
            <div>
              <p className="text-xs font-semibold text-muted uppercase tracking-wider">Attendance Rate</p>
              <p className="mt-2 text-3xl font-black text-violet-400">{attendanceRate}%</p>
            </div>
            <p className="mt-1 text-xs text-secondary">Target: 75% or higher</p>
            <div className="absolute top-2 right-2 text-4xl opacity-10">📈</div>
          </div>
          <div className="rounded-2xl p-5 border border-theme bg-surface relative overflow-hidden flex flex-col justify-between">
            <div>
              <p className="text-xs font-semibold text-muted uppercase tracking-wider">Present Days</p>
              <p className="mt-2 text-3xl font-black text-emerald-400">{presentFiltered + lateFiltered}</p>
            </div>
            <p className="mt-1 text-xs text-secondary">In selected period</p>
            <div className="absolute top-2 right-2 text-4xl opacity-10">✅</div>
          </div>
          <div className="rounded-2xl p-5 border border-theme bg-surface relative overflow-hidden flex flex-col justify-between">
            <div>
              <p className="text-xs font-semibold text-muted uppercase tracking-wider">Absent Days</p>
              <p className="mt-2 text-3xl font-black text-rose-400">{absentFiltered}</p>
            </div>
            <p className="mt-1 text-xs text-secondary">Please try to avoid absences</p>
            <div className="absolute top-2 right-2 text-4xl opacity-10">❌</div>
          </div>
          <div className="rounded-2xl p-5 border border-theme bg-surface relative overflow-hidden flex flex-col justify-between">
            <div>
              <p className="text-xs font-semibold text-muted uppercase tracking-wider">Approved Leave</p>
              <p className="mt-2 text-3xl font-black text-amber-400">{leaveFiltered}</p>
            </div>
            <p className="mt-1 text-xs text-secondary">Formal leave submissions</p>
            <div className="absolute top-2 right-2 text-4xl opacity-10">⏰</div>
          </div>
        </div>

        {/* Donut Chart Card (Col Span 1) */}
        <div className="rounded-2xl border border-theme bg-surface p-5 flex flex-col justify-between items-center shadow-xl">
          <p className="text-xs font-bold text-primary uppercase tracking-wider self-start">Attendance Ratio</p>
          <div className="w-full flex-1 flex items-center justify-center min-h-[180px]">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={65}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#1e1b4b', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 12, color: '#e2e8f0', fontSize: 11 }} />
                  <Legend verticalAlign="bottom" height={36} iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-muted">No attendance data to plot</p>
            )}
          </div>
        </div>
      </div>

      {/* Attendance Trends */}
      <div className="rounded-2xl border border-theme bg-surface p-5 shadow-xl space-y-4">
        <p className="text-xs font-bold text-primary uppercase tracking-wider">Attendance Trends (Last 6 Months)</p>
        <div className="h-64 w-full">
          {monthlyTrends.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrends}>
                <defs>
                  <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d2d30" />
                <XAxis dataKey="month" stroke="#71717a" fontSize={10} />
                <YAxis stroke="#71717a" fontSize={10} unit="%" domain={[0, 100]} />
                <Tooltip contentStyle={{ background: '#1e1b4b', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 12, color: '#e2e8f0', fontSize: 11 }} />
                <Area type="monotone" dataKey="rate" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorRate)" strokeWidth={2} name="Attendance Rate" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted">No monthly trends data available</div>
          )}
        </div>
      </div>

      {/* Filter and Table */}
      <div className="rounded-2xl border border-theme bg-surface overflow-hidden">
        <div className="p-5 border-b border-theme flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <h2 className="text-sm font-bold text-primary flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-violet-400" />
            Attendance History
          </h2>
          <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
            {/* Search Bar */}
            <div className="relative w-full sm:w-60">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search remarks/dates..."
                className="h-10 w-full rounded-xl border border-theme bg-hover pl-9 pr-4 text-xs text-primary placeholder-muted focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted text-xs">
                🔍
              </span>
            </div>

            {/* Month Filter */}
            <div className="flex items-center gap-1.5 z-40">
              <span className="text-[10px] uppercase font-bold text-secondary">Month:</span>
              <CustomSelect
                options={months}
                value={selectedMonth}
                onChange={(val) => setSelectedMonth(String(val))}
                className="w-36"
              />
            </div>

            {/* Year Filter */}
            <div className="flex items-center gap-1.5 z-40">
              <span className="text-[10px] uppercase font-bold text-secondary">Year:</span>
              <CustomSelect
                options={[{ value: "all", label: "All Years" }, ...uniqueYears.map(yr => ({ value: yr.toString(), label: yr.toString() }))]}
                value={selectedYear}
                onChange={(val) => setSelectedYear(String(val))}
                className="w-28"
              />
            </div>

            {/* Status Filter */}
            <div className="flex rounded-xl bg-hover p-1 border border-theme">
              {(["all", "present", "absent", "late"] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setFilter(opt)}
                  className={`rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-all duration-200 ${
                    filter === opt
                      ? "bg-violet-500/20 text-violet-400 border border-violet-500/30"
                      : "text-secondary border border-transparent hover:text-primary"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {paginatedData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-theme bg-hover/50 text-[10px] font-bold uppercase tracking-wider text-secondary">
                  <th className="py-4 px-6">Date</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme">
                {paginatedData.map((r) => {
                  const statusColors: Record<string, string> = {
                    present: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
                    absent: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
                    late: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
                    leave: "bg-orange-500/10 text-orange-400 border border-orange-500/20",
                  };
                  return (
                    <tr key={r.id} className="hover:bg-hover/30 transition-colors">
                      <td className="py-4 px-6 text-xs font-semibold text-primary">
                        {new Date(r.date).toLocaleDateString("en-US", {
                          weekday: "short",
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${statusColors[r.status.toLowerCase()] || "bg-hover text-secondary"}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-xs text-muted max-w-xs truncate">
                        {r.remarks || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center text-muted text-sm">
            No matching attendance records found.
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-theme flex items-center justify-between">
            <span className="text-xs text-secondary">
              Page {currentPage} of {totalPages} ({filtered.length} total records)
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
    </div>
  );
}
