"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
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
  Legend,
} from "recharts";

type ResultRecord = {
  id: number;
  marks: string | number;
  maxMarks: number;
  remarks: string | null;
  recordedDate: string;
  examName: string;
  subjectName: string;
};

type SubjectMetric = {
  subjectName: string;
  studentAvg: number;
  classAvg: number;
};

type Props = {
  initialResults: ResultRecord[];
  classRank: number;
  classSize: number;
  subjectMetrics: SubjectMetric[];
  gpa: number;
  studentName: string;
  displayClass?: string;
  rollNumber?: string | null;
  attendancePercent?: number;
};

const selectCls = "h-10 rounded-xl border border-theme bg-surface px-3 text-xs text-primary outline-none focus:border-cyan-500 transition";

function percentToGrade(pct: number): string {
  if (pct >= 95) return "A+";
  if (pct >= 90) return "A";
  if (pct >= 85) return "A-";
  if (pct >= 80) return "B+";
  if (pct >= 75) return "B";
  if (pct >= 70) return "B-";
  if (pct >= 65) return "C+";
  if (pct >= 60) return "C";
  if (pct >= 50) return "D";
  return "F";
}

export default function ParentResultsClient({
  initialResults,
  classRank,
  classSize,
  subjectMetrics,
  gpa,
  studentName,
  displayClass = "",
  rollNumber = "",
  attendancePercent = 0,
}: Props) {
  const [resultsList] = useState<ResultRecord[]>(initialResults);
  
  // Report Card Generator State
  const [reportExamType, setReportExamType] = useState("all");
  const [reportStartDate, setReportStartDate] = useState("");
  const [reportEndDate, setReportEndDate] = useState("");
  const [generatedReport, setGeneratedReport] = useState<{
    subjects: { subjectName: string; obtained: number; max: number; percentage: number; grade: string }[];
    overallPercentage: number;
    overallGrade: string;
    remarks: string;
  } | null>(null);

  const handleGenerateReport = () => {
    const filtered = resultsList.filter((r) => {
      const matchesExam = reportExamType === "all" || r.examName.toLowerCase().includes(reportExamType.toLowerCase());
      const date = new Date(r.recordedDate);
      const matchesStart = !reportStartDate || date >= new Date(reportStartDate + "T00:00:00");
      const matchesEnd = !reportEndDate || date <= new Date(reportEndDate + "T23:59:59");
      return matchesExam && matchesStart && matchesEnd;
    });

    if (filtered.length === 0) {
      toast.error("No assessment data found matching these filters.");
      setGeneratedReport(null);
      return;
    }

    const subjectMap: Record<string, { obtained: number; max: number }> = {};
    filtered.forEach((r) => {
      if (!subjectMap[r.subjectName]) {
        subjectMap[r.subjectName] = { obtained: 0, max: 0 };
      }
      subjectMap[r.subjectName].obtained += Number(r.marks) || 0;
      subjectMap[r.subjectName].max += r.maxMarks || 100;
    });

    const subjectsArray = Object.entries(subjectMap).map(([subjName, val]) => {
      const percentage = val.max > 0 ? Math.round((val.obtained / val.max) * 100) : 0;
      return {
        subjectName: subjName,
        obtained: val.obtained,
        max: val.max,
        percentage,
        grade: percentToGrade(percentage),
      };
    });

    let totalObtained = 0;
    let totalMax = 0;
    subjectsArray.forEach((s) => {
      totalObtained += s.obtained;
      totalMax += s.max;
    });

    const overallPercentage = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0;
    const overallGrade = percentToGrade(overallPercentage);

    let remarks = "Excellent academic performance. Consistently shows great focus.";
    if (overallPercentage < 40) {
      remarks = "Needs immediate attention. Urgent tutorial support is required.";
    } else if (overallPercentage < 50) {
      remarks = "Pass grade. Requires additional guidance and tutorial support.";
    } else if (overallPercentage < 65) {
      remarks = "Satisfactory results, needs focus on weak areas and revisions.";
    } else if (overallPercentage < 80) {
      remarks = "Good progress, showing strong grasp of key syllabus themes.";
    }

    setGeneratedReport({
      subjects: subjectsArray,
      overallPercentage,
      overallGrade,
      remarks,
    });
    toast.success("Academic report card generated successfully!");
  };

  const handleDownloadPDF = () => {
    if (!generatedReport) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Failed to open print window. Please allow popups.");
      return;
    }

    const examLabel = reportExamType === "all" ? "All Examinations" : reportExamType;
    const dateRangeLabel = reportStartDate || reportEndDate 
      ? `Period: ${reportStartDate || 'Beginning'} to ${reportEndDate || 'Present'}`
      : "Academic Term";

    const subjectsHtml = generatedReport.subjects.map(s => `
      <tr>
        <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #e2e8f0; text-align: left;">${s.subjectName}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">${s.obtained} / ${s.max}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: bold;">${s.percentage}%</td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: bold;">${s.grade}</td>
      </tr>
    `).join("");

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Report Card - ${studentName}</title>
        <meta charset="utf-8">
        <style>
          body {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            color: #1e293b;
            line-height: 1.5;
            margin: 0;
            padding: 40px;
            background-color: #fff;
          }
          .report-container {
            max-width: 800px;
            margin: 0 auto;
            border: 2px solid #e2e8f0;
            border-radius: 16px;
            padding: 40px;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 4px double #0284c7;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .school-info {
            display: flex;
            align-items: center;
            gap: 15px;
          }
          .logo-placeholder {
            width: 55px;
            height: 55px;
            background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
            font-size: 24px;
            font-weight: 900;
          }
          .school-name {
            font-size: 22px;
            font-weight: 800;
            color: #0369a1;
            letter-spacing: -0.025em;
          }
          .school-sub {
            font-size: 11px;
            color: #64748b;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.1em;
          }
          .report-title {
            text-align: right;
          }
          .report-title h1 {
            margin: 0;
            font-size: 26px;
            font-weight: 900;
            color: #0f172a;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          .report-title p {
            margin: 5px 0 0 0;
            font-size: 12px;
            color: #64748b;
            font-weight: 700;
          }
          .student-card {
            background-color: #f8fafc;
            border: 1px solid #f1f5f9;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 30px;
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            font-size: 13px;
          }
          .student-detail-item {
            display: flex;
            gap: 10px;
          }
          .student-detail-item label {
            color: #64748b;
            font-weight: 600;
            min-width: 100px;
          }
          .student-detail-item span {
            color: #0f172a;
            font-weight: 700;
          }
          .score-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            font-size: 13px;
          }
          .score-table th {
            background-color: #f1f5f9;
            color: #475569;
            padding: 12px;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: 0.05em;
            border-bottom: 2px solid #e2e8f0;
          }
          .metrics-summary {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            margin-bottom: 30px;
          }
          .metric-box {
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 15px;
            text-align: center;
          }
          .metric-box label {
            display: block;
            font-size: 10px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 5px;
          }
          .metric-box value {
            display: block;
            font-size: 20px;
            font-weight: 900;
            color: #0369a1;
          }
          .remarks-card {
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 40px;
            font-size: 13px;
            background-color: #fafafa;
          }
          .remarks-title {
            font-weight: 700;
            color: #475569;
            margin-bottom: 8px;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          .remarks-text {
            font-style: italic;
            color: #1e293b;
          }
          .signatures {
            display: flex;
            justify-content: space-between;
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px dashed #cbd5e1;
          }
          .signature-block {
            text-align: center;
            width: 200px;
          }
          .signature-line {
            border-top: 1px solid #94a3b8;
            margin-bottom: 8px;
            padding-top: 5px;
          }
          .signature-title {
            font-size: 11px;
            color: #64748b;
            font-weight: 700;
            text-transform: uppercase;
          }
          @media print {
            body {
              padding: 0;
            }
            .report-container {
              border: none;
              box-shadow: none;
              padding: 0;
            }
            @page {
              size: A4;
              margin: 15mm;
            }
          }
        </style>
      </head>
      <body>
        <div class="report-container">
          <div class="header">
            <div class="school-info">
              <div class="logo-placeholder">EP</div>
              <div>
                <div class="school-name">EduPredict Academy</div>
                <div class="school-sub">Continuous Learning Excellence</div>
              </div>
            </div>
            <div class="report-title">
              <h1>Report Card</h1>
              <p>${examLabel} • ${dateRangeLabel}</p>
            </div>
          </div>

          <div class="student-card">
            <div class="student-detail-item">
              <label>Student Name:</label>
              <span>${studentName}</span>
            </div>
            <div class="student-detail-item">
              <label>Class/Grade:</label>
              <span>${displayClass || "N/A"}</span>
            </div>
            <div class="student-detail-item">
              <label>Roll Number:</label>
              <span>${rollNumber || "—"}</span>
            </div>
            <div class="student-detail-item">
              <label>Status:</label>
              <span>Active</span>
            </div>
          </div>

          <table class="score-table">
            <thead>
              <tr>
                <th style="text-align: left; padding: 12px;">Subject</th>
                <th style="text-align: center;">Marks Obtained</th>
                <th style="text-align: center;">Percentage</th>
                <th style="text-align: center;">Grade</th>
              </tr>
            </thead>
            <tbody>
              ${subjectsHtml}
            </tbody>
          </table>

          <div class="metrics-summary">
            <div class="metric-box">
              <label>Overall Avg</label>
              <value>${generatedReport.overallPercentage}%</value>
            </div>
            <div class="metric-box">
              <label>GPA standings</label>
              <value>${gpa.toFixed(2)}</value>
            </div>
            <div class="metric-box">
              <label>Cohort Rank</label>
              <value>#${classRank} / ${classSize}</value>
            </div>
            <div class="metric-box">
              <label>Attendance</label>
              <value>${attendancePercent}%</value>
            </div>
          </div>

          <div class="remarks-card">
            <div class="remarks-title">Teacher Remarks & Recommendations</div>
            <div class="remarks-text">"${generatedReport.remarks}"</div>
          </div>

          <div class="signatures">
            <div class="signature-block">
              <div class="signature-line"></div>
              <div class="signature-title">Class Teacher</div>
            </div>
            <div class="signature-block">
              <div class="signature-line"></div>
              <div class="signature-title">Principal Signature</div>
            </div>
          </div>
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSubject, setFilterSubject] = useState("all");
  const [filterExamType, setFilterExamType] = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Derive unique lists for dropdown filters
  const subjectsList = Array.from(new Set(resultsList.map((r) => r.subjectName)));
  const examTypesList = Array.from(new Set(resultsList.map((r) => r.examName)));
  const monthsList = Array.from(new Set(resultsList.map((r) => r.recordedDate.substring(0, 7))));

  // Filter results
  const filteredResults = resultsList.filter((row) => {
    const matchesSearch =
      row.subjectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.examName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (row.remarks || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSubject = filterSubject === "all" || row.subjectName === filterSubject;
    const matchesExam = filterExamType === "all" || row.examName === filterExamType;
    const matchesMonth = filterMonth === "all" || row.recordedDate.startsWith(filterMonth);

    return matchesSearch && matchesSubject && matchesExam && matchesMonth;
  });

  // Reset page on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterSubject, filterExamType, filterMonth]);

  const totalPages = Math.ceil(filteredResults.length / itemsPerPage) || 1;
  const paginatedResults = filteredResults.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Compute Overall Averages
  let totalObtained = 0;
  let totalMax = 0;
  resultsList.forEach((r) => {
    totalObtained += Number(r.marks) || 0;
    totalMax += r.maxMarks || 100;
  });
  const overallAvg = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0;
  const overallGrade = percentToGrade(overallAvg);

  // Top Subject
  const bestMetric = [...subjectMetrics].sort((a, b) => b.studentAvg - a.studentAvg)[0];
  const topSubject = bestMetric ? `${bestMetric.subjectName} (${bestMetric.studentAvg}%)` : "N/A";

  // Comparison vs cohort
  const cohortAvgSum = subjectMetrics.reduce((s, x) => s + x.classAvg, 0);
  const cohortAvg = subjectMetrics.length > 0 ? Math.round(cohortAvgSum / subjectMetrics.length) : 0;
  const classComparison = overallAvg - cohortAvg;

  // Chart data: Monthly overall average score
  const getMonthlyTrendData = () => {
    const monthlyGroups: Record<string, { obtained: number; max: number }> = {};
    resultsList.forEach((r) => {
      const m = r.recordedDate.substring(0, 7); // "YYYY-MM"
      if (!monthlyGroups[m]) monthlyGroups[m] = { obtained: 0, max: 0 };
      monthlyGroups[m].obtained += Number(r.marks) || 0;
      monthlyGroups[m].max += r.maxMarks || 100;
    });

    return Object.entries(monthlyGroups)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([monthStr, val]) => {
        const [y, mon] = monthStr.split("-");
        const monthName = new Date(Number(y), Number(mon) - 1, 1).toLocaleString("default", { month: "short" });
        return {
          date: monthName,
          percentage: Math.round((val.obtained / val.max) * 100),
        };
      });
  };

  const trendData = getMonthlyTrendData();

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-500 dark:text-cyan-400">
          Academics
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
          Report Card & Exam Results
        </h1>
        <p className="mt-2 text-sm text-secondary">
          Track subject scores, GPA standings, class rankings, and historical progress for {studentName}.
        </p>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <div className="rounded-2xl border border-theme bg-surface p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Overall Average</p>
          <p className="mt-2 text-3xl font-black text-cyan-400">{overallAvg}%</p>
          <p className="text-[10px] text-muted mt-0.5">Average score percentage</p>
        </div>

        <div className="rounded-2xl border border-theme bg-surface p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted">GPA standing</p>
          <p className="mt-2 text-3xl font-black text-blue-400">{gpa.toFixed(2)}</p>
          <p className="text-[10px] text-muted mt-0.5">On a 4.0 scale</p>
        </div>

        <div className="rounded-2xl border border-theme bg-surface p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Overall Grade</p>
          <p className="mt-2 text-3xl font-black text-emerald-400">{overallGrade}</p>
          <p className="text-[10px] text-muted mt-0.5">Equivalent letter grade</p>
        </div>

        <div className="rounded-2xl border border-theme bg-surface p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Class Rank</p>
          <p className="mt-2 text-3xl font-black text-purple-400">
            #{classRank} <span className="text-xs font-normal text-muted">/ {classSize}</span>
          </p>
          <p className="text-[10px] text-muted mt-0.5">In class cohort</p>
        </div>

        <div className="rounded-2xl border border-theme bg-surface p-5 shadow-sm col-span-2 md:col-span-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Top Subject</p>
          <p className="mt-2 text-lg font-black text-amber-400 truncate" title={topSubject}>
            {topSubject}
          </p>
          <p className="text-[10px] text-muted mt-0.5">Highest scoring area</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Trend Area Chart */}
        <div className="rounded-3xl border border-theme bg-surface p-6 shadow-md">
          <h3 className="text-sm font-bold text-primary pb-3 border-b border-subtle">
            Academic Performance Trend
          </h3>
          <div className="h-64 w-full mt-6">
            {trendData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted">No monthly data.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="resultsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} style={{ fontSize: "10px", fill: "var(--text-muted)" }} />
                  <YAxis domain={[0, 100]} tickLine={false} axisLine={false} style={{ fontSize: "10px", fill: "var(--text-muted)" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.9)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="percentage"
                    stroke="#06b6d4"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#resultsGradient)"
                    dot={{ r: 4, stroke: "#06b6d4", strokeWidth: 2, fill: "#0f172a" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Subject Comparison Bar Chart */}
        <div className="rounded-3xl border border-theme bg-surface p-6 shadow-md">
          <h3 className="text-sm font-bold text-primary pb-3 border-b border-subtle">
            Subject Scores vs Class Averages
          </h3>
          <div className="h-64 w-full mt-6">
            {subjectMetrics.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted">No subject scores.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectMetrics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="subjectName" tickLine={false} axisLine={false} style={{ fontSize: "10px", fill: "var(--text-muted)" }} />
                  <YAxis domain={[0, 100]} tickLine={false} axisLine={false} style={{ fontSize: "10px", fill: "var(--text-muted)" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.9)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "10px" }} />
                  <Bar dataKey="studentAvg" name={`${studentName} Score`} fill="#06b6d4" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="classAvg" name="Class Average" fill="#64748b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Report Card Generator Card */}
      <div className="rounded-3xl border border-theme bg-surface p-6 shadow-md space-y-6">
        <div>
          <h3 className="text-sm font-bold text-primary flex items-center gap-2">
            <span>📋</span> Report Card Generator
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Generate and download a professional academic report card for {studentName}.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4 items-end">
          {/* Exam Type Dropdown */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Exam Type</label>
            <select
              value={reportExamType}
              onChange={(e) => setReportExamType(e.target.value)}
              className={selectCls + " w-full"}
            >
              <option value="all">All Exams</option>
              <option value="Weekly Exam">Weekly Exam</option>
              <option value="Monthly Exam">Monthly Exam</option>
              <option value="Quarterly">Quarterly</option>
              <option value="Half Yearly">Half Yearly</option>
              <option value="Annual">Annual</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Start Date</label>
            <input
              type="date"
              value={reportStartDate}
              onChange={(e) => setReportStartDate(e.target.value)}
              className="input-theme h-10 w-full rounded-xl border border-theme bg-surface px-3 text-xs text-primary"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">End Date</label>
            <input
              type="date"
              value={reportEndDate}
              onChange={(e) => setReportEndDate(e.target.value)}
              className="input-theme h-10 w-full rounded-xl border border-theme bg-surface px-3 text-xs text-primary"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleGenerateReport}
              className="flex-1 h-10 rounded-xl btn-blue px-4 text-xs font-bold whitespace-nowrap"
            >
              Generate Report
            </button>
            {generatedReport && (
              <button
                onClick={handleDownloadPDF}
                className="h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 px-4 text-xs font-bold flex items-center justify-center gap-1.5 transition whitespace-nowrap"
              >
                <span>📥</span> Download PDF
              </button>
            )}
          </div>
        </div>

        {/* Preview of Generated Report */}
        {generatedReport && (
          <div className="rounded-2xl border border-theme/40 bg-hover/10 p-5 mt-4 space-y-4 animate-in fade-in duration-300">
            <h4 className="text-xs font-bold text-primary uppercase tracking-wider">Report Preview</h4>
            <div className="grid gap-4 md:grid-cols-3 text-xs">
              <div className="space-y-1.5">
                <p className="text-muted font-medium">Student Name</p>
                <p className="text-primary font-bold">{studentName}</p>
              </div>
              <div className="space-y-1.5">
                <p className="text-muted font-medium">Class</p>
                <p className="text-primary font-bold">{displayClass || "N/A"}</p>
              </div>
              <div className="space-y-1.5">
                <p className="text-muted font-medium">Roll Number</p>
                <p className="text-primary font-bold">{rollNumber || "—"}</p>
              </div>
            </div>
            
            <div className="overflow-x-auto rounded-xl border border-theme/30 bg-surface">
              <table className="w-full text-[11px] text-left">
                <thead>
                  <tr className="border-b border-theme/30 bg-hover/20 font-bold text-muted uppercase">
                    <th className="py-2.5 px-4">Subject</th>
                    <th className="py-2.5 px-4 text-center">Marks</th>
                    <th className="py-2.5 px-4 text-center">Percentage</th>
                    <th className="py-2.5 px-4">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-subtle/50">
                  {generatedReport.subjects.map((s, idx) => (
                    <tr key={idx} className="hover:bg-hover/10">
                      <td className="py-2.5 px-4 font-bold text-primary">{s.subjectName}</td>
                      <td className="py-2.5 px-4 text-center text-primary">{s.obtained} / {s.max}</td>
                      <td className="py-2.5 px-4 text-center text-primary font-semibold">{s.percentage}%</td>
                      <td className="py-2.5 px-4 font-semibold text-primary">{s.grade}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-4 md:grid-cols-4 text-xs font-bold border-t border-theme/30 pt-3">
              <div className="p-3 bg-surface rounded-xl border border-theme/20">
                <p className="text-[10px] text-muted uppercase font-medium">Overall Average</p>
                <p className="mt-1 text-base text-cyan-400 font-black">{generatedReport.overallPercentage}%</p>
              </div>
              <div className="p-3 bg-surface rounded-xl border border-theme/20">
                <p className="text-[10px] text-muted uppercase font-medium">Letter Grade</p>
                <p className="mt-1 text-base text-emerald-400 font-black">{generatedReport.overallGrade}</p>
              </div>
              <div className="p-3 bg-surface rounded-xl border border-theme/20">
                <p className="text-[10px] text-muted uppercase font-medium">Class Rank</p>
                <p className="mt-1 text-base text-purple-400 font-black">#{classRank} / {classSize}</p>
              </div>
              <div className="p-3 bg-surface rounded-xl border border-theme/20">
                <p className="text-[10px] text-muted uppercase font-medium">Attendance</p>
                <p className="mt-1 text-base text-blue-400 font-black">{attendancePercent}%</p>
              </div>
            </div>

            <div className="rounded-xl bg-surface border border-theme/20 p-3.5 text-xs text-secondary">
              <span className="font-bold block text-muted text-[10px] uppercase tracking-wider mb-1">Teacher Remarks</span>
              <p className="italic text-primary">"{generatedReport.remarks}"</p>
            </div>
          </div>
        )}
      </div>

      {/* Cohort Comparison & Score Sheet */}
      <div className="space-y-4">
        {/* Filters and List */}
        <div className="rounded-2xl border border-theme bg-surface overflow-hidden shadow-sm">
          {/* Filters Row */}
          <div className="p-5 border-b border-subtle flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 bg-hover/10">
            <h3 className="text-sm font-bold text-primary">Score Sheet Details</h3>

            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <input
                type="text"
                placeholder="Search exams/remarks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-44 rounded-xl border border-theme bg-surface px-3 text-xs text-primary outline-none focus:border-cyan-500 placeholder:text-muted transition"
              />

              {/* Subject Filter */}
              <select
                value={filterSubject}
                onChange={(e) => setFilterSubject(e.target.value)}
                className={selectCls}
              >
                <option value="all">All Subjects</option>
                {subjectsList.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              {/* Exam Type Filter */}
              <select
                value={filterExamType}
                onChange={(e) => setFilterExamType(e.target.value)}
                className={selectCls}
              >
                <option value="all">All Exams</option>
                {examTypesList.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>

              {/* Month Filter */}
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className={selectCls}
              >
                <option value="all">All Months</option>
                {monthsList.map((m) => {
                  const [y, mon] = m.split("-");
                  const monthName = new Date(Number(y), Number(mon) - 1, 1).toLocaleString("default", { month: "long", year: "numeric" });
                  return (
                    <option key={m} value={m}>
                      {monthName}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Table */}
          {paginatedResults.length === 0 ? (
            <div className="p-12 text-center text-sm font-medium text-muted">
              No results match the selected filter criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-theme bg-hover/30 text-muted font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-4 px-6">Subject</th>
                    <th className="py-4 px-6">Exam Name</th>
                    <th className="py-4 px-6 text-center">Marks Obtained</th>
                    <th className="py-4 px-6 text-center">Percentage</th>
                    <th className="py-4 px-6">Feedback / Remarks</th>
                    <th className="py-4 px-6 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-subtle">
                  {paginatedResults.map((row) => {
                    const pct = Math.round((Number(row.marks) / row.maxMarks) * 100);
                    let badgeCls = "bg-rose-500/10 text-rose-400 border-rose-500/20";
                    if (pct >= 75) {
                      badgeCls = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                    } else if (pct >= 50) {
                      badgeCls = "bg-amber-500/10 text-amber-400 border-amber-500/20";
                    }

                    return (
                      <tr key={row.id} className="hover:bg-hover/20 transition duration-150">
                        <td className="py-4 px-6 font-bold text-primary">{row.subjectName}</td>
                        <td className="py-4 px-6 text-secondary">{row.examName}</td>
                        <td className="py-4 px-6 text-center font-semibold text-primary">
                          {row.marks} <span className="text-muted font-normal">/ {row.maxMarks}</span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className={`inline-flex items-center rounded-lg px-2 py-0.5 font-bold border ${badgeCls}`}>
                            {pct}%
                          </span>
                        </td>
                        <td className="py-4 px-6 text-secondary italic">
                          {row.remarks || "No comments entered"}
                        </td>
                        <td className="py-4 px-6 text-right text-muted">
                          {new Date(row.recordedDate).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Table Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-xs font-semibold text-muted pt-4 border-t border-theme">
            <div>
              {currentPage > 1 && (
                <button
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="rounded-xl border border-theme bg-surface px-4 py-2 hover:bg-hover transition"
                >
                  ← Previous
                </button>
              )}
            </div>
            <span>
              Page {currentPage} of {totalPages} ({filteredResults.length} records)
            </span>
            <div>
              {currentPage < totalPages && (
                <button
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="rounded-xl border border-theme bg-surface px-4 py-2 hover:bg-hover transition"
                >
                  Next →
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
