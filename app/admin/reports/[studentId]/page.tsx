'use client';

import { useState, useEffect } from 'react';
import { getStudentReport } from '@/lib/actions';

interface SubjectScore {
  subjectId: number;
  subjectName: string;
  marks: number[];
  average: number;
}

interface StudentReportData {
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

type Props = {
  params: Promise<{ studentId: string }>;
};

export default function StudentReportPage({ params }: Props) {
  const [report, setReport] = useState<StudentReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadReport() {
      try {
        const p = await params;
        const studentId = Number(p.studentId);
        const data = await getStudentReport(studentId);
        setReport(data as StudentReportData);
      } catch (err: any) {
        setError(err.message || 'Failed to load report');
      } finally {
        setLoading(false);
      }
    }
    loadReport();
  }, [params]);

  function getGpa(pct: number) {
    return ((pct / 100) * 4.0).toFixed(2);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8 text-muted-foreground font-medium animate-pulse flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
        Loading report...
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen bg-background p-8 text-rose-400 font-medium">
        Error: {error}
      </div>
    );
  }
  if (!report) {
    return (
      <div className="min-h-screen bg-background p-8 text-muted-foreground font-medium">
        No report found.
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8 space-y-6 print:bg-white print:p-0 print:min-h-0">
      <div className="max-w-4xl mx-auto print:max-w-full">
        
        {/* Header with Print / Back Button */}
        <div className="flex justify-between items-center mb-6 print:hidden">
          <a
            href="/admin/reports"
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground hover:text-cyan-500 dark:hover:text-cyan-400 transition"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            Back to Reports
          </a>
          <button
            onClick={() => window.print()}
            className="rounded-xl btn-blue px-5 py-2.5 text-xs font-bold whitespace-nowrap"
          >
            Print Report Card
          </button>
        </div>

        {/* Printable Content Card */}
        <div className="rounded-3xl border border-border bg-card p-8 shadow-md print:border-0 print:bg-white print:text-slate-950 print:p-0 print:shadow-none">
          
          {/* Header Info */}
          <div className="border-b border-border pb-6 mb-8 print:border-slate-300">
            <h1 className="text-3xl font-bold tracking-tight text-foreground print:text-black">EduPredict Report Card</h1>
            <p className="mt-2 text-sm text-muted-foreground print:text-slate-600">Official academic transcript of accomplishments.</p>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 mt-6 p-5 rounded-2xl bg-background border border-border print:bg-slate-50 print:border-slate-200 print:text-black">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground print:text-slate-500">Student Name</span>
                <p className="text-lg font-bold text-foreground mt-0.5 print:text-black">{report.student.name}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground print:text-slate-500">Roll Number</span>
                <p className="text-lg font-bold text-foreground mt-0.5 print:text-black">{report.student.rollNumber || '—'}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground print:text-slate-500">Class Room</span>
                <p className="text-lg font-bold text-foreground mt-0.5 print:text-black">Class {report.student.classId}</p>
              </div>
            </div>
          </div>

          {/* Marks Table */}
          <div className="space-y-4 mb-8">
            <h2 className="text-sm font-bold uppercase tracking-wider text-cyan-500 dark:text-cyan-400 print:text-slate-800">Subject Performance Summary</h2>
            <div className="overflow-hidden rounded-2xl border border-border bg-background print:border-slate-300 print:bg-transparent">
              <table className="w-full text-left text-sm text-foreground print:text-slate-900 border-collapse">
                <thead>
                  <tr className="border-b border-border bg-background/50 text-muted-foreground font-bold uppercase print:bg-slate-100 print:border-slate-300 print:text-slate-700">
                    <th className="p-4 px-6">Subject</th>
                    <th className="p-4 px-6 text-center">Exam Marks Recorded</th>
                    <th className="p-4 px-6 text-center">Syllabus Average</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-subtle print:divide-slate-200">
                  {report.subjectScores.map((score) => (
                    <tr key={score.subjectId}>
                      <td className="p-4 px-6 font-semibold text-foreground print:text-black">{score.subjectName}</td>
                      <td className="p-4 px-6 text-center font-mono">{score.marks.join(', ')}</td>
                      <td className="p-4 px-6 text-center font-bold text-cyan-500 dark:text-cyan-400 print:text-slate-900">{score.average}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Academic Overview Summary Grid */}
          <div className="grid gap-6 md:grid-cols-2 mt-8">
            {/* Stat Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-border bg-background p-5 print:border-slate-300 print:bg-slate-50">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground print:text-slate-600">Calculated GPA</span>
                <p className="text-3xl font-black text-cyan-500 dark:text-cyan-400 mt-2 print:text-black">{getGpa(report.percentage)}</p>
                <p className="text-[9px] text-muted-foreground mt-1">Scale 4.0</p>
              </div>

              <div className="rounded-2xl border border-border bg-background p-5 print:border-slate-300 print:bg-slate-50">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground print:text-slate-600">Aggregate Grade</span>
                <p className="text-3xl font-black text-emerald-500 dark:text-emerald-400 mt-2 print:text-black">{report.grade}</p>
                <p className="text-[9px] text-muted-foreground mt-1">Academic Rank</p>
              </div>

              <div className="rounded-2xl border border-border bg-background p-5 print:border-slate-300 print:bg-slate-50">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground print:text-slate-600">Marks Total</span>
                <p className="text-3xl font-black text-foreground mt-2 print:text-black">{report.total}</p>
                <p className="text-[9px] text-muted-foreground mt-1">Sum Total</p>
              </div>

              <div className="rounded-2xl border border-border bg-background p-5 print:border-slate-300 print:bg-slate-50">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground print:text-slate-600">Attendance</span>
                <p className="text-3xl font-black text-cyan-500 dark:text-cyan-400 mt-2 print:text-black">96.8%</p>
                <p className="text-[9px] text-muted-foreground mt-1">Class Ratio</p>
              </div>
            </div>

            {/* Assessment Remarks */}
            <div className="rounded-2xl border border-border bg-background p-6 flex flex-col justify-between print:border-slate-300 print:bg-slate-50">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground print:text-slate-600 font-semibold">Academic Remarks</span>
                <p className="mt-3 text-sm italic text-foreground print:text-slate-800 leading-relaxed">
                  "{getRemarks(report.grade)}"
                </p>
              </div>
              <div className="mt-6 pt-6 border-t border-border print:border-slate-200 flex items-center justify-between text-[9px] text-muted-foreground print:text-slate-600">
                <span>Evaluation Date: {new Date().toLocaleDateString()}</span>
                <span className="font-semibold text-foreground print:text-black">EduPredict System Authorized</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      <style jsx>{`
        @media print {
          body, main {
            background: white !important;
            color: black !important;
            padding: 0 !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .rounded-3xl, .rounded-2xl {
            border-radius: 0 !important;
          }
          .bg-gradient-to-br, .bg-white\\/\\[0\\.02\\], .bg-\\[\\#0b1020\\]\\/30 {
            background: none !important;
          }
          .border, .border-b, .border-t {
            border-color: #cbd5e1 !important;
          }
          .text-slate-400, .text-slate-500, .text-slate-300 {
            color: #475569 !important;
          }
          .text-cyan-400, .text-emerald-400 {
            color: black !important;
          }
        }
      `}</style>
    </main>
  );
}
