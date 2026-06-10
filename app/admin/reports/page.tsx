'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  getAllClasses,
  getExamsByClass,
  getStudentReportByClass,
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

export default function ReportsPage() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [reports, setReports] = useState<StudentReport[]>([]);
  const [classId, setClassId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadClasses();
  }, []);

  async function loadClasses() {
    try {
      const classesData = await getAllClasses();
      setClasses(classesData);
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
        setExams(examsData);
        setReports(reportsData);
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
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

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-sm text-slate-300 shadow-md">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Selected Class</p>
            <p className="mt-1 font-semibold text-white">{classId ? `Class ${classId}` : 'None'}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-sm text-slate-300 shadow-md">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Reports</p>
            <p className="mt-1 font-semibold text-white">{reports.length}</p>
          </div>
        </div>
      </div>

      {/* Grouping Filters & Class Insights */}
      <section className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/40 to-white/[0.035] p-6 shadow-xl shadow-black/20">
          <h2 className="text-sm font-semibold text-white tracking-tight uppercase tracking-wider">Filters</h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Class Selection</label>
              <select
                value={classId}
                onChange={(e) => handleClassChange(e.target.value)}
                className="h-11 w-full rounded-xl border border-white/10 bg-[#0b1020] px-3.5 text-sm text-white outline-none transition focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/10 cursor-pointer"
              >
                <option value="">Select Class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Available Exams</label>
              <div className="h-11 rounded-xl border border-white/5 bg-[#0b1020]/60 px-3.5 py-3 text-xs text-slate-400 font-medium">
                {classId ? `${exams.length} exam${exams.length === 1 ? '' : 's'} scheduled` : 'Select a class to load exams'}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/40 to-white/[0.035] p-6 shadow-xl shadow-black/20">
          <div className="flex items-center justify-between gap-6 border-b border-white/5 pb-4">
            <div>
              <h2 className="text-sm font-semibold text-white tracking-tight uppercase tracking-wider">Class Insights</h2>
              <p className="mt-1 text-xs text-slate-500">Summary statistics for the active selection</p>
            </div>
            {loading && <span className="text-xs text-cyan-400 font-medium animate-pulse">Loading data…</span>}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-white/5 bg-[#0b1020]/40 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Generated Reports</p>
              <p className="mt-2 text-2xl font-bold text-white">{reports.length}</p>
            </div>
            <div className="rounded-xl border border-white/5 bg-[#0b1020]/40 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Total Enrolled</p>
              <p className="mt-2 text-2xl font-bold text-white">{classId ? reports.length : '—'}</p>
            </div>
            <div className="rounded-xl border border-white/5 bg-[#0b1020]/40 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Grade Range</p>
              <p className="mt-2 text-xl font-bold text-white">
                {reports.length ? `${Math.min(...reports.map((r) => r.percentage))}% - ${Math.max(...reports.map((r) => r.percentage))}%` : '—'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Reports Table List */}
      {classId && !loading ? (
        <div className="overflow-auto rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/40 to-white/[0.035] shadow-xl shadow-black/20">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="border-b border-white/10 bg-[#070b16]/40 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="p-4 px-6">Student</th>
                <th className="p-4 px-6">Roll No</th>
                <th className="p-4 px-6">Total Marks</th>
                <th className="p-4 px-6">Percentage</th>
                <th className="p-4 px-6">Grade</th>
                <th className="p-4 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-500 font-medium">
                    No report data available for this class.
                  </td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr key={report.studentId} className="hover:bg-white/[0.03] transition duration-200">
                    <td className="p-4 px-6 font-semibold text-white">{report.name}</td>
                    <td className="p-4 px-6 font-medium text-slate-400">{report.rollNumber || '—'}</td>
                    <td className="p-4 px-6 font-medium text-white">{report.total}</td>
                    <td className="p-4 px-6 font-semibold text-white">{report.percentage}%</td>
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
                      <Link
                        href={`/admin/reports/${report.studentId}`}
                        className="inline-flex h-8 items-center rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs font-semibold text-cyan-400 transition hover:bg-white/[0.08] hover:text-cyan-300"
                      >
                        View Report Card
                      </Link>
                    </td>
                  </tr>
                ))
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
    </main>
  );
}
