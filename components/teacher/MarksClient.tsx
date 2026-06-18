"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";

type Exam = {
  id: number;
  name: string;
  examDate: string | null;
  maxMarks: number;
  type: string;
  classId: number;
  subjectId: number;
  className: string;
  subjectName: string;
};

type ClassSubject = {
  classId: number;
  subjectId: number;
  className: string;
  subjectName: string;
};

type StudentForExam = {
  id: number;
  name: string;
  rollNumber: string;
  existingMarks: number | null;
  resultId: number | null;
  remarks: string;
};

type ResultItem = {
  id: number;
  studentName: string;
  rollNumber: string;
  className: string;
  subjectName: string;
  examName: string;
  examType: string;
  marks: number;
  maxMarks: number;
  recordedDate: string | null;
  remarks: string;
};

type Props = {
  teacherId: number | null;
  teacherUserId: number;
  exams: Exam[];
  classSubjects: ClassSubject[];
};

export default function MarksClient({ teacherId, teacherUserId, exams, classSubjects }: Props) {
  const safeExams = Array.isArray(exams) ? exams : [];
  const safeClassSubjects = Array.isArray(classSubjects) ? classSubjects : [];

  const [activeTab, setActiveTab] = useState<"enter" | "edit" | "results">("enter");
  const [selectedExam, setSelectedExam] = useState<number | "">("");
  const [students, setStudents] = useState<StudentForExam[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [marksInput, setMarksInput] = useState<Record<number, { marks: string; remarks: string }>>({});
  const [submitting, setSubmitting] = useState(false);

  // Results tab
  const [resultsData, setResultsData] = useState<{ items: ResultItem[]; total: number; pages: number }>({ items: [], total: 0, pages: 0 });
  const [loadingResults, setLoadingResults] = useState(false);
  const [resultsPage, setResultsPage] = useState(1);
  const [resultsSearch, setResultsSearch] = useState("");

  const safeResultsItems = Array.isArray(resultsData?.items) ? resultsData.items : [];
  const safeResultsTotal = resultsData?.total ?? 0;
  const safeResultsPages = resultsData?.pages ?? 0;

  // Load students when exam changes
  useEffect(() => {
    if (!selectedExam) { setStudents([]); setMarksInput({}); return; }
    setLoadingStudents(true);
    fetch(`/api/teacher/marks?action=students&examId=${selectedExam}`)
      .then((r) => r.json())
      .then((data) => {
        const studentList = Array.isArray(data?.students) ? data.students : [];
        setStudents(studentList);
        const initial: Record<number, { marks: string; remarks: string }> = {};
        studentList.forEach((s: StudentForExam) => {
          initial[s.id] = {
            marks: s.existingMarks !== null ? String(s.existingMarks) : "",
            remarks: s.remarks || "",
          };
        });
        setMarksInput(initial);
      })
      .catch(() => toast.error("Failed to load students"))
      .finally(() => setLoadingStudents(false));
  }, [selectedExam]);

  // Load results
  useEffect(() => {
    if (activeTab !== "results" && activeTab !== "edit") return;
    setLoadingResults(true);
    fetch(`/api/teacher/marks?action=results&page=${resultsPage}&search=${encodeURIComponent(resultsSearch)}`)
      .then((r) => r.json())
      .then((data) => {
        setResultsData({
          items: Array.isArray(data?.items) ? data.items : [],
          total: typeof data?.total === "number" ? data.total : 0,
          pages: typeof data?.pages === "number" ? data.pages : 0,
        });
      })
      .catch(() => toast.error("Failed to load results"))
      .finally(() => setLoadingResults(false));
  }, [activeTab, resultsPage, resultsSearch]);

  const handleMarksChange = (studentId: number, field: "marks" | "remarks", value: string) => {
    setMarksInput((prev) => ({ ...prev, [studentId]: { ...prev[studentId], [field]: value } }));
  };

  const handleSubmitMarks = async () => {
    if (!selectedExam) return;
    const exam = safeExams.find((e) => e.id === selectedExam);
    if (!exam) return;

    const marksData = students
      .map((s) => ({
        studentId: s.id,
        marks: parseFloat(marksInput[s.id]?.marks || "0"),
        remarks: marksInput[s.id]?.remarks || "",
      }))
      .filter((m) => !isNaN(m.marks));

    if (marksData.length === 0) {
      toast.error("No valid marks entered");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/teacher/marks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examId: selectedExam, subjectId: exam.subjectId, marksData }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      toast.success("Marks submitted successfully!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditMark = async (resultId: number, marks: number, remarks: string) => {
    try {
      const res = await fetch("/api/teacher/marks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resultId, marks, remarks }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      toast.success("Mark updated!");
      setResultsData((prev) => {
        const items = Array.isArray(prev?.items) ? prev.items : [];
        return {
          ...prev,
          items: items.map((r) => (r.id === resultId ? { ...r, marks, remarks } : r)),
        };
      });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const getPercent = (marks: number, max: number) => (max > 0 ? Math.round((marks / max) * 100) : 0);
  const getGrade = (pct: number) => {
    if (pct >= 90) return { label: "A+", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" };
    if (pct >= 80) return { label: "A", cls: "bg-green-500/10 text-green-400 border-green-500/20" };
    if (pct >= 70) return { label: "B", cls: "bg-blue-500/10 text-blue-400 border-blue-500/20" };
    if (pct >= 60) return { label: "C", cls: "bg-amber-500/10 text-amber-400 border-amber-500/20" };
    if (pct >= 50) return { label: "D", cls: "bg-orange-500/10 text-orange-400 border-orange-500/20" };
    return { label: "F", cls: "bg-rose-500/10 text-rose-400 border-rose-500/20" };
  };

  return (
    <main className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8 space-y-8 transition-colors duration-200">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-500 dark:text-cyan-400">
          Faculty Portal
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Marks Entry</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter, review, and edit examination marks for your assigned subjects.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-subtle bg-hover p-1 w-fit">
        {([
          { id: "enter", label: "Enter Marks" },
          { id: "edit", label: "Edit Marks" },
          { id: "results", label: "Results" },
        ] as { id: "enter" | "edit" | "results"; label: string }[]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
              activeTab === tab.id
                ? "bg-cyan-500/20 text-cyan-400 shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Enter Marks Tab */}
      {activeTab === "enter" && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-md space-y-6">
          <div className="flex gap-4 flex-wrap items-end">
            <label className="block space-y-1.5 flex-1 min-w-[220px]">
              <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Select Exam</span>
              <select
                className="select-theme"
                value={selectedExam}
                onChange={(e) => setSelectedExam(e.target.value ? Number(e.target.value) : "")}
              >
                <option value="">Choose an exam...</option>
                {safeExams.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} — {e.className} · {e.subjectName}
                  </option>
                ))}
              </select>
            </label>
            {selectedExam && safeExams.find((e) => e.id === selectedExam) && (
              <div className="flex items-center gap-2 flex-wrap">
                {(() => {
                  const exam = safeExams.find((e) => e.id === selectedExam)!;
                  return (
                    <>
                      <span className="rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 text-[10px] font-bold text-blue-400">
                        Max: {exam.maxMarks}
                      </span>
                      <span className="rounded-lg bg-violet-500/10 border border-violet-500/20 px-3 py-1.5 text-[10px] font-bold text-violet-400 capitalize">
                        {exam.type}
                      </span>
                    </>
                  );
                })()}
              </div>
            )}
          </div>

          {safeExams.length === 0 && (
            <div className="rounded-xl border-2 border-dashed border-theme p-10 text-center">
              <p className="text-sm text-secondary">No exams found for your assigned classes. Contact admin to add exams.</p>
            </div>
          )}

          {loadingStudents && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <div key={i} className="skeleton h-12 rounded-xl" />)}
            </div>
          )}

          {students.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-subtle">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-subtle bg-hover">
                    <th className="text-left p-3 text-[10px] font-bold uppercase tracking-wider text-secondary w-12">#</th>
                    <th className="text-left p-3 text-[10px] font-bold uppercase tracking-wider text-secondary">Student</th>
                    <th className="text-left p-3 text-[10px] font-bold uppercase tracking-wider text-secondary">Roll</th>
                    <th className="text-left p-3 text-[10px] font-bold uppercase tracking-wider text-secondary w-32">Marks</th>
                    <th className="text-left p-3 text-[10px] font-bold uppercase tracking-wider text-secondary">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-subtle">
                  {students.map((student, idx) => (
                    <tr key={student.id} className="hover:bg-hover/50 transition">
                      <td className="p-3 text-xs text-muted-foreground">{idx + 1}</td>
                      <td className="p-3 text-xs font-semibold text-foreground">{student.name}</td>
                      <td className="p-3 text-xs text-secondary">{student.rollNumber}</td>
                      <td className="p-3">
                        <input
                          type="number"
                          min="0"
                          max={safeExams.find((e) => e.id === selectedExam)?.maxMarks || 100}
                          className="input-theme py-1.5 px-2 text-xs w-24"
                          value={marksInput[student.id]?.marks ?? ""}
                          onChange={(e) => handleMarksChange(student.id, "marks", e.target.value)}
                          placeholder="0"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="text"
                          className="input-theme py-1.5 px-2 text-xs w-full"
                          value={marksInput[student.id]?.remarks ?? ""}
                          onChange={(e) => handleMarksChange(student.id, "remarks", e.target.value)}
                          placeholder="Optional remarks..."
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {students.length > 0 && (
            <div className="flex justify-end">
              <button
                onClick={handleSubmitMarks}
                disabled={submitting}
                className="btn-cyan rounded-xl px-6 py-2.5 text-sm font-semibold disabled:opacity-50"
              >
                {submitting ? "Saving..." : "Submit Marks"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Edit / Results Tab */}
      {(activeTab === "edit" || activeTab === "results") && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-md space-y-4">
          <div className="flex gap-3 flex-wrap items-center">
            <input
              type="text"
              placeholder="Search by student name or roll..."
              className="input-theme max-w-[280px] py-2 text-xs"
              value={resultsSearch}
              onChange={(e) => { setResultsSearch(e.target.value); setResultsPage(1); }}
            />
            <span className="text-xs text-muted-foreground ml-auto">{safeResultsTotal} results</span>
          </div>

          {loadingResults ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-12 rounded-xl" />)}</div>
          ) : safeResultsItems.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-theme p-10 text-center">
              <p className="text-sm text-secondary">No results found. Enter marks first.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-subtle">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-subtle bg-hover">
                    <th className="text-left p-3 text-[10px] font-bold uppercase tracking-wider text-secondary">Student</th>
                    <th className="text-left p-3 text-[10px] font-bold uppercase tracking-wider text-secondary">Class</th>
                    <th className="text-left p-3 text-[10px] font-bold uppercase tracking-wider text-secondary">Subject</th>
                    <th className="text-left p-3 text-[10px] font-bold uppercase tracking-wider text-secondary">Exam</th>
                    <th className="text-left p-3 text-[10px] font-bold uppercase tracking-wider text-secondary">Marks</th>
                    <th className="text-left p-3 text-[10px] font-bold uppercase tracking-wider text-secondary">Grade</th>
                    {activeTab === "edit" && <th className="p-3" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-subtle">
                  {safeResultsItems.map((result) => {
                    const pct = getPercent(result.marks, result.maxMarks);
                    const grade = getGrade(pct);
                    return (
                      <tr key={result.id} className="hover:bg-hover/50 transition">
                        <td className="p-3">
                          <p className="text-xs font-semibold text-foreground">{result.studentName}</p>
                          <p className="text-[10px] text-muted-foreground">Roll {result.rollNumber}</p>
                        </td>
                        <td className="p-3 text-xs text-secondary">{result.className}</td>
                        <td className="p-3 text-xs text-secondary">{result.subjectName}</td>
                        <td className="p-3 text-xs text-secondary">{result.examName}</td>
                        <td className="p-3">
                          <span className="text-xs font-bold text-foreground">{result.marks}</span>
                          <span className="text-[10px] text-muted-foreground">/{result.maxMarks}</span>
                        </td>
                        <td className="p-3">
                          <span className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[10px] font-bold ${grade.cls}`}>
                            {grade.label}
                          </span>
                        </td>
                        {activeTab === "edit" && (
                          <td className="p-3">
                            <button
                              onClick={() => {
                                const newMarks = window.prompt("Enter new marks:", String(result.marks));
                                if (newMarks !== null && !isNaN(Number(newMarks))) {
                                  handleEditMark(result.id, Number(newMarks), result.remarks);
                                }
                              }}
                              className="text-[10px] font-semibold text-cyan-400 hover:text-cyan-300 border border-cyan-500/20 bg-cyan-500/10 rounded-lg px-2 py-1 transition"
                            >
                              Edit
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {safeResultsPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                disabled={resultsPage <= 1}
                onClick={() => setResultsPage((p) => p - 1)}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-secondary border border-subtle hover:bg-hover disabled:opacity-30 transition"
              >
                ← Prev
              </button>
              <span className="text-xs text-muted-foreground">
                Page {resultsPage} of {safeResultsPages}
              </span>
              <button
                disabled={resultsPage >= safeResultsPages}
                onClick={() => setResultsPage((p) => p + 1)}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-secondary border border-subtle hover:bg-hover disabled:opacity-30 transition"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
