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
        setReport(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load report');
      } finally {
        setLoading(false);
      }
    }
    loadReport();
  }, [params]);

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-400">Error: {error}</div>;
  if (!report) return <div className="p-8 text-slate-400">No report found</div>;

  return (
    <main className="p-8 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Header with Print Button */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">Report Card</h1>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Print Report
          </button>
        </div>

        {/* Printable Content */}
        <div className="bg-white text-slate-900 p-8 rounded print:p-0 print:bg-white print:text-black">
          {/* Student Information Section */}
          <div className="mb-8 border-b-2 pb-6">
            <h2 className="text-xl font-semibold mb-4">Student Information</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <span className="font-semibold">Name:</span>
                <p className="text-lg">{report.student.name}</p>
              </div>
              <div>
                <span className="font-semibold">Roll Number:</span>
                <p className="text-lg">{report.student.rollNumber}</p>
              </div>
              <div>
                <span className="font-semibold">Class:</span>
                <p className="text-lg">{report.student.classId}</p>
              </div>
            </div>
          </div>

          {/* Subject-wise Marks Section */}
          <div className="mb-8 border-b-2 pb-6">
            <h2 className="text-xl font-semibold mb-4">Subject-wise Performance</h2>
            <div className="overflow-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b-2">
                    <th className="p-2 border-r">Subject</th>
                    <th className="p-2 border-r text-center">Exam Marks</th>
                    <th className="p-2 text-center">Average</th>
                  </tr>
                </thead>
                <tbody>
                  {report.subjectScores.map((subject) => (
                    <tr key={subject.subjectId} className="border-b">
                      <td className="p-2 border-r font-semibold">{subject.subjectName}</td>
                      <td className="p-2 border-r text-center">
                        {subject.marks.join(', ')}
                      </td>
                      <td className="p-2 text-center font-semibold">
                        {subject.average}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary Section */}
          <div className="bg-slate-100 p-6 rounded">
            <h2 className="text-xl font-semibold mb-4">Summary</h2>
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded border-l-4 border-blue-600">
                <p className="text-slate-600 text-sm">Total Marks</p>
                <p className="text-2xl font-bold">{report.total}</p>
              </div>
              <div className="bg-white p-4 rounded border-l-4 border-green-600">
                <p className="text-slate-600 text-sm">Percentage</p>
                <p className="text-2xl font-bold">{report.percentage}%</p>
              </div>
              <div
                className={`bg-white p-4 rounded border-l-4 ${
                  report.grade === 'A+'
                    ? 'border-green-600'
                    : report.grade === 'A'
                      ? 'border-green-500'
                      : report.grade === 'B+'
                        ? 'border-blue-600'
                        : report.grade === 'B'
                          ? 'border-blue-500'
                          : report.grade === 'C'
                            ? 'border-yellow-600'
                            : report.grade === 'D'
                              ? 'border-orange-600'
                              : 'border-red-600'
                }`}
              >
                <p className="text-slate-600 text-sm">Grade</p>
                <p className="text-2xl font-bold">{report.grade}</p>
              </div>
              <div className="bg-white p-4 rounded border-l-4 border-purple-600">
                <p className="text-slate-600 text-sm">Remarks</p>
                <p className="text-sm font-semibold">
                  {report.grade === 'A+' || report.grade === 'A'
                    ? 'Excellent'
                    : report.grade === 'B+' || report.grade === 'B'
                      ? 'Good'
                      : report.grade === 'C'
                        ? 'Satisfactory'
                        : report.grade === 'D'
                          ? 'Pass'
                          : 'Need Improvement'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @media print {
          main {
            background: white;
          }
          button {
            display: none;
          }
        }
      `}</style>
    </main>
  );
}
