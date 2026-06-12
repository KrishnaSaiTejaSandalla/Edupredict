'use client';

import { useState, useEffect } from 'react';
import {
  getAllClasses,
  getExamsByClass,
  getStudentReportByClass,
  getStudentReport,
} from '@/lib/actions';

interface Class {
  id: number;
  name: string;
}

interface Exam {
  id: number;
  name: string;
  examDate: Date | string;
}

interface StudentReport {
  studentId: number;
  name: string;
  rollNumber: string;
  total: number;
  percentage: number;
  grade: string;
}

interface SubjectScore {
  subjectId: number;
  subjectName: string;
  marks: number[];
  average: number;
}

interface DetailedReportData {
  student: {
    id: number;
    name: string;
    rollNumber: string;
    classId: number;
  };
  subjectScores: SubjectScore[];
  total: number;
  percentage: number;
  grade: string;
}

export default function ReportsPage() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [reports, setReports] = useState<StudentReport[]>([]);
  const [classId, setClassId] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  const [detailedReport, setDetailedReport] = useState<DetailedReportData | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    loadClasses();
  }, []);

  async function loadClasses() {
    try {
      const classesData = await getAllClasses();
      setClasses(classesData as Class[]);
    } catch (err) {
      console.error('Load error:', err);
    }
  }

  async function handleClassChange(cId: string) {
    setClassId(cId);
    setExams([]);
    setReports([]);

    if (cId) {
      try {
        setLoading(true);
        const [examsData, reportsData] = await Promise.all([
          getExamsByClass(Number(cId)),
          getStudentReportByClass(Number(cId)),
        ]);
        setExams(examsData as Exam[]);
        setReports(reportsData as StudentReport[]);
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    }
  }

  async function openReportModal(studentId: number) {
    setSelectedReportId(studentId);
    setDetailedReport(null);
    setModalLoading(true);
    try {
      const details = await getStudentReport(studentId);
      setDetailedReport(details as DetailedReportData);
    } catch (err) {
      console.error('Error fetching student report:', err);
    } finally {
      setModalLoading(false);
    }
  }

  // ── Metrics Calculation ───────────────────────────────────────────────────
  const totalReports = reports.length;
  const avgPercentage = reports.length > 0 ? reports.reduce((sum, r) => sum + r.percentage, 0) / reports.length : 0;
  const avgGPA = ((avgPercentage / 100) * 4.0).toFixed(2);
  const studentsPassed = reports.filter((r) => r.percentage >= 40).length;
  const studentsAtRisk = reports.filter((r) => r.percentage < 40).length;

  function getGpa(pct: number) {
    return ((pct / 100) * 4.0).toFixed(1);
  }

  function getRemarks(grade: string) {
    switch (grade) {
      case 'A+':
      case 'A':
        return 'Excellent academic performance. Consistently shows great focus.';
      case 'B+':
      case 'B':
        return 'Good progress, showing strong grasp of key syllabus themes.';
      case 'C':
        return 'Satisfactory results, needs focus on weak areas and revisions.';
      case 'D':
        return 'Pass grade. Requires additional guidance and tutorial support.';
      default:
        return 'Needs immediate attention. Urgent tutorial support is required.';
    }
  }

  return (
    <main className="min-h-screen bg-[#070b16] p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Header section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-400">Reports</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">Report Cards</h1>
          <p className="mt-2 text-sm text-slate-400">Generate and review class-wise academic report cards.</p>
        </div>

        <div className="flex gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-3.5 text-sm text-slate-300 shadow-md">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Selected Class</p>
            <p className="mt-1 font-semibold text-white">{classId ? `Class ${classId}` : 'None'}</p>
          </div>
        </div>
      </div>

      {/* Analytics Dashboard Grid */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Reports */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/40 to-white/[0.035] p-5 shadow-xl shadow-black/25">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Reports</p>
          <div className="flex items-baseline justify-between mt-3">
            <p className="text-3xl font-bold text-white">{classId ? totalReports : '—'}</p>
            <span className="text-xs font-medium text-slate-400">Generated</span>
          </div>
        </div>
        {/* Average GPA */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/40 to-white/[0.035] p-5 shadow-xl shadow-black/25">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Average GPA</p>
          <div className="flex items-baseline justify-between mt-3">
            <p className="text-3xl font-bold text-cyan-400">{classId ? `${avgGPA} / 4.0` : '—'}</p>
            <span className="text-xs font-medium text-cyan-400/80">Class Mean</span>
          </div>
        </div>
        {/* Students Passed */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/40 to-white/[0.035] p-5 shadow-xl shadow-black/25">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Students Passed</p>
          <div className="flex items-baseline justify-between mt-3">
            <p className="text-3xl font-bold text-emerald-400">{classId ? studentsPassed : '—'}</p>
            {classId && reports.length > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {Math.round((studentsPassed / reports.length) * 100)}% Rate
              </span>
            )}
          </div>
        </div>
        {/* Students At Risk */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/40 to-white/[0.035] p-5 shadow-xl shadow-black/25">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Students At Risk</p>
          <div className="flex items-baseline justify-between mt-3">
            <p className="text-3xl font-bold text-rose-500">{classId ? studentsAtRisk : '—'}</p>
            {classId && reports.length > 0 && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${studentsAtRisk > 0 ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-slate-500/10 text-slate-400 border border-white/10'}`}>
                {studentsAtRisk} At Risk
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Grouping Filters & Class Insights */}
      <section className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Filters Panel */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/40 to-white/[0.035] p-6 shadow-xl shadow-black/20 self-start space-y-6">
          <h2 className="text-sm font-semibold text-white tracking-tight uppercase tracking-wider">Academic Filters</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Class Selection</label>
              <select
                value={classId}
                onChange={(e) => handleClassChange(e.target.value)}
                className="h-11 w-full rounded-xl border border-white/10 bg-[#0b1020] px-3.5 text-sm text-white outline-none transition focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/10 cursor-pointer"
              >
                <option value="">Select Class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    Class {c.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Available Exams</label>
              <div className="h-11 rounded-xl border border-white/5 bg-[#0b1020]/60 px-3.5 py-3 text-xs text-slate-400 font-semibold flex items-center justify-between">
                <span>{classId ? `${exams.length} Exams scheduled` : 'Select a class'}</span>
                {classId && <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 animate-pulse" />}
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Class Information Panel */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/40 to-white/[0.035] p-6 shadow-xl shadow-black/20 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-6 border-b border-white/5 pb-4">
              <div>
                <h2 className="text-sm font-semibold text-white tracking-tight uppercase tracking-wider font-bold">Class Analytics & Insight</h2>
                <p className="mt-1 text-xs text-slate-500">Summary statistics for the active academic selection</p>
              </div>
              {loading && <span className="text-xs text-cyan-400 font-semibold animate-pulse flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />Loading data…</span>}
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-white/5 bg-[#0b1020]/40 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Highest Score Percentage</p>
                <p className="mt-2 text-2xl font-bold text-emerald-400">
                  {reports.length ? `${Math.max(...reports.map((r) => r.percentage))}%` : '—'}
                </p>
              </div>
              <div className="rounded-xl border border-white/5 bg-[#0b1020]/40 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Lowest Score Percentage</p>
                <p className="mt-2 text-2xl font-bold text-rose-500">
                  {reports.length ? `${Math.min(...reports.map((r) => r.percentage))}%` : '—'}
                </p>
              </div>
              <div className="rounded-xl border border-white/5 bg-[#0b1020]/40 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-semibold">Grade Range</p>
                <p className="mt-2 text-xl font-bold text-white uppercase">
                  {reports.length ? `${reports.reduce((min, r) => r.percentage < min.percentage ? r : min).grade} - ${reports.reduce((max, r) => r.percentage > max.percentage ? r : max).grade}` : '—'}
                </p>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-white/5 text-[10px] text-slate-500 font-medium flex items-center justify-between">
            <span>EduPredict grading limits mapping: A+ (90%+), A (80%+), B+ (70%+), B (60%+), C (50%+), D (40%+)</span>
            <span>Active Selection: Class {classId || 'N/A'}</span>
          </div>
        </div>
      </section>

      {/* Reports Table List */}
      {classId && !loading ? (
        <div className="overflow-auto rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/40 to-white/[0.035] shadow-xl shadow-black/20 animate-in fade-in duration-300">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="border-b border-white/10 bg-[#070b16]/40 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="p-4 px-6">Student</th>
                <th className="p-4 px-6">Roll No</th>
                <th className="p-4 px-6">Total Marks</th>
                <th className="p-4 px-6">GPA Equivalent</th>
                <th className="p-4 px-6">Percentage</th>
                <th className="p-4 px-6">Grade</th>
                <th className="p-4 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-500 font-medium">
                    No report data available for this class.
                  </td>
                </tr>
              ) : (
                reports.map((report) => {
                  const isPassed = report.percentage >= 40;
                  return (
                    <tr key={report.studentId} className="hover:bg-white/[0.03] transition duration-200">
                      <td className="p-4 px-6 font-semibold text-white">{report.name}</td>
                      <td className="p-4 px-6 font-medium text-slate-400">{report.rollNumber || '—'}</td>
                      <td className="p-4 px-6 font-medium text-white">{report.total}</td>
                      <td className="p-4 px-6">
                        <span className="inline-flex rounded-lg bg-cyan-500/10 px-2 py-1 text-xs font-bold text-cyan-300 border border-cyan-500/20">
                          {getGpa(report.percentage)} GPA
                        </span>
                      </td>
                      <td className="p-4 px-6">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">{report.percentage}%</span>
                          <div className="hidden sm:block w-16 h-1.5 rounded-full bg-white/5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${isPassed ? 'bg-cyan-400' : 'bg-rose-500'}`}
                              style={{ width: `${report.percentage}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-4 px-6">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                          report.grade === 'A+' || report.grade === 'A'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : report.grade === 'B+' || report.grade === 'B'
                              ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                              : report.grade === 'C'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : report.grade === 'D'
                                  ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>{report.grade}</span>
                      </td>
                      <td className="p-4 px-6 text-right">
                        <button
                          onClick={() => openReportModal(report.studentId)}
                          className="inline-flex h-8 items-center rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs font-bold text-cyan-400 transition hover:bg-white/[0.08] hover:text-cyan-300"
                        >
                          View Report Card
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : !classId ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-transparent p-12 text-center shadow-xl shadow-black/25">
          <svg className="mx-auto h-10 w-10 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-4 text-sm font-semibold text-white">No class selected</h3>
          <p className="mt-1 text-xs text-slate-500">Choose a class from the filters on the left to review report cards.</p>
        </div>
      ) : null}

      {/* Premium Centered Report Card Modal */}
      {selectedReportId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm transition-all duration-300">
          <div
            className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-[#070b16] shadow-[0_20px_50px_rgba(0,0,0,0.6)] animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Close */}
            <button
              onClick={() => setSelectedReportId(null)}
              className="absolute right-5 top-5 z-10 flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08] transition duration-200"
            >
              ✕
            </button>

            {modalLoading ? (
              <div className="p-16 flex flex-col items-center justify-center gap-3 text-slate-400 font-semibold">
                <svg className="animate-spin h-8 w-8 text-cyan-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Fetching detailed report data...</span>
              </div>
            ) : detailedReport ? (
              <div className="flex flex-col h-full max-h-[85vh] overflow-y-auto">
                
                {/* Modal Header */}
                <div className="border-b border-white/10 px-8 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-b from-white/[0.02] to-transparent">
                  <div>
                    <h2 className="text-2xl font-bold text-white">Academic Report Card</h2>
                    <p className="mt-1.5 text-xs text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
                      <span>Name: <strong className="text-white">{detailedReport.student.name}</strong></span>
                      <span>Roll Number: <strong className="text-white">{detailedReport.student.rollNumber || '—'}</strong></span>
                      <span>Class: <strong className="text-white">{detailedReport.student.classId}</strong></span>
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        // Open a printable page directly in a new tab or trigger printer
                        const printWindow = window.open(`/admin/reports/${detailedReport.student.id}`);
                        if (printWindow) {
                          printWindow.addEventListener('load', () => {
                            printWindow.print();
                          });
                        }
                      }
                    }}
                    className="self-start sm:self-center inline-flex h-10 items-center rounded-xl bg-blue-500 px-4 text-xs font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-400 hover:scale-[1.02] active:scale-[0.98] transition-all whitespace-nowrap"
                  >
                    Print Report
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-8 space-y-6">
                  {/* Detailed Performance Table */}
                  <div>
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-cyan-400">Subject-wise Performance</h3>
                    <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0b1020]/40">
                      <table className="w-full text-left text-xs text-slate-300">
                        <thead>
                          <tr className="border-b border-white/10 bg-white/[0.02] text-slate-400 font-bold uppercase">
                            <th className="p-3 px-5">Subject</th>
                            <th className="p-3 px-5 text-center">Exam Marks</th>
                            <th className="p-3 px-5 text-center">Weighted Average</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {detailedReport.subjectScores.length === 0 ? (
                            <tr>
                              <td colSpan={3} className="p-6 text-center text-slate-500">
                                No exam marks recorded for this student.
                              </td>
                            </tr>
                          ) : (
                            detailedReport.subjectScores.map((score) => (
                              <tr key={score.subjectId}>
                                <td className="p-3 px-5 font-semibold text-white">{score.subjectName}</td>
                                <td className="p-3 px-5 text-center font-mono">{score.marks.join(', ')}</td>
                                <td className="p-3 px-5 text-center font-bold text-cyan-400">{score.average}%</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Summary / GPA Section */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* Metrics grid */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* GPA Box */}
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 flex flex-col justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">GPA Earned</span>
                        <div className="mt-2">
                          <p className="text-2xl font-black text-cyan-400">{getGpa(detailedReport.percentage)}</p>
                          <p className="text-[9px] text-slate-500 font-medium mt-0.5">Scale 4.0</p>
                        </div>
                      </div>
                      {/* Grade Box */}
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 flex flex-col justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Overall Grade</span>
                        <div className="mt-2">
                          <p className="text-2xl font-black text-emerald-400">{detailedReport.grade}</p>
                          <p className="text-[9px] text-slate-500 font-medium mt-0.5">Academic Band</p>
                        </div>
                      </div>
                      {/* Total Marks */}
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 flex flex-col justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Score</span>
                        <div className="mt-2">
                          <p className="text-2xl font-black text-white">{detailedReport.total}</p>
                          <p className="text-[9px] text-slate-500 font-medium mt-0.5">Sum of Exams</p>
                        </div>
                      </div>
                      {/* Attendance Mock */}
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 flex flex-col justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Attendance</span>
                        <div className="mt-2">
                          <p className="text-2xl font-black text-cyan-400">96.8%</p>
                          <p className="text-[9px] text-slate-500 font-medium mt-0.5">Satisfactory</p>
                        </div>
                      </div>
                    </div>

                    {/* Remarks Card */}
                    <div className="rounded-xl border border-white/10 bg-[#0b1020]/30 p-5 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Teacher Remarks</span>
                        <p className="mt-2 text-xs leading-relaxed text-slate-300 font-medium italic">
                          "{getRemarks(detailedReport.grade)}"
                        </p>
                      </div>
                      <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-[9px] text-slate-500">
                        <span>Class Teacher Assessment</span>
                        <span className="font-semibold text-white">EduPredict System</span>
                      </div>
                    </div>
                  </div>

                </div>

              </div>
            ) : (
              <div className="p-8 text-center text-slate-400">Failed to load detailed report.</div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
