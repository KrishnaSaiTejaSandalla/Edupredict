"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

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

type Analytics = {
  total: number;
  passPercentage: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  subjectComparison: { subjectName: string; avgScore: number; maxMarks: number }[];
  classComparison: { className: string; avgScore: number }[];
  topPerformers: { name: string; score: number }[];
  trendData: { date: string; score: number }[];
};

type Props = {
  teacherId: number | null;
  teacherUserId: number;
  exams: Exam[];
  classSubjects: ClassSubject[];
};

const tooltipStyle = {
  backgroundColor: "var(--card)",
  backdropFilter: "blur(16px)",
  border: "1px solid var(--border)",
  borderRadius: "14px",
  color: "var(--foreground)",
  boxShadow: "var(--shadow-md)",
  padding: "10px 14px",
  fontSize: "12px",
};

export default function MarksClient({ teacherId, teacherUserId, exams, classSubjects }: Props) {
  const safeExams = Array.isArray(exams) ? exams : [];
  const safeClassSubjects = Array.isArray(classSubjects) ? classSubjects : [];

  const [activeTab, setActiveTab] = useState<"enter" | "edit" | "analytics">("enter");
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
  const [resultsClassFilter, setResultsClassFilter] = useState<number | "">("");
  const [resultsSubjectFilter, setResultsSubjectFilter] = useState<number | "">("");
  const [editingResultId, setEditingResultId] = useState<number | null>(null);
  const [editMarksInput, setEditMarksInput] = useState<string>("");
  const [editRemarksInput, setEditRemarksInput] = useState<string>("");

  // Analytics
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

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
    if (activeTab !== "edit" && activeTab !== "analytics") return;
    setLoadingResults(true);
    const params = new URLSearchParams();
    params.set("page", String(resultsPage));
    params.set("search", encodeURIComponent(resultsSearch));
    if (resultsClassFilter) params.set("classId", String(resultsClassFilter));
    if (resultsSubjectFilter) params.set("subjectId", String(resultsSubjectFilter));
    fetch(`/api/teacher/marks?action=results&${params}`)
      .then((r) => r.json())
      .then((data) => setResultsData({
        items: Array.isArray(data?.items) ? data.items : [],
        total: typeof data?.total === "number" ? data.total : 0,
        pages: typeof data?.pages === "number" ? data.pages : 0,
      }))
      .catch(() => toast.error("Failed to load results"))
      .finally(() => setLoadingResults(false));
  }, [activeTab, resultsPage, resultsSearch, resultsClassFilter, resultsSubjectFilter]);

  // Load analytics
  useEffect(() => {
    if (activeTab !== "analytics") return;
    setLoadingAnalytics(true);
    fetch("/api/teacher/marks?action=analytics")
      .then((r) => r.json())
      .then((data) => setAnalytics(data))
      .catch(() => toast.error("Failed to load analytics"))
      .finally(() => setLoadingAnalytics(false));
  }, [activeTab]);

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
    if (pct >= 90) return { label: "A+", cls: "bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border-emerald-500/20" };
    if (pct >= 80) return { label: "A", cls: "bg-green-500/10 text-green-500 dark:text-green-400 border-green-500/20" };
    if (pct >= 70) return { label: "B", cls: "bg-blue-500/10 text-blue-500 dark:text-blue-400 border-blue-500/20" };
    if (pct >= 60) return { label: "C", cls: "bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/20" };
    if (pct >= 50) return { label: "D", cls: "bg-orange-500/10 text-orange-500 dark:text-orange-400 border-orange-500/20" };
    return { label: "F", cls: "bg-rose-500/10 text-rose-500 dark:text-rose-400 border-rose-500/20" };
  };

  const totalExams = safeExams.length;
  const uniqueClasses = new Set(safeExams.map(e => e.classId)).size;
  const uniqueSubjects = new Set(safeExams.map(e => e.subjectId)).size;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-400">
          Faculty Portal
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Marks Entry</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter, review, and analyze examination marks for your assigned subjects.
        </p>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Exams", value: totalExams, color: "text-primary border-border" },
          { label: "Classes", value: uniqueClasses, color: "text-cyan-500 dark:text-cyan-400 border-cyan-500/10 bg-cyan-500/5" },
          { label: "Subjects", value: uniqueSubjects, color: "text-violet-500 dark:text-violet-400 border-violet-500/10 bg-violet-500/5" },
          { label: "Results Recorded", value: safeResultsTotal, color: "text-emerald-500 dark:text-emerald-400 border-emerald-500/10 bg-emerald-500/5" },
        ].map(({ label, value, color }) => (
          <div key={label} className={`rounded-2xl border bg-card p-5 shadow-sm hover:shadow-md transition duration-200 ${color.includes("border-") ? color.split(" ")[1] + " " + color.split(" ")[2] : "border-border"}`}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className={`mt-2 text-2xl font-black ${color.split(" ")[0]}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 rounded-xl border border-border bg-hover/20 p-1 w-fit">
        {([
          { id: "enter", label: "Enter Marks" },
          { id: "edit", label: "Edit Marks" },
          { id: "analytics", label: "Analytics" },
        ] as const).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-lg px-5 py-2.5 text-xs font-semibold uppercase tracking-wide transition duration-150 border border-transparent ${activeTab === tab.id
              ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20 shadow-sm"
              : "text-secondary hover:bg-hover hover:text-primary"
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Enter Marks Tab */}
      {activeTab === "enter" && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
          <div className="flex gap-4 flex-wrap items-end">
            <label className="block space-y-1.5 flex-1 min-w-[280px]">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Select Exam</span>
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
              <div className="flex items-center gap-2 flex-wrap pb-1">
                {(() => {
                  const exam = safeExams.find((e) => e.id === selectedExam)!;
                  return (
                    <>
                      <span className="rounded-lg bg-blue-500/10 border border-blue-500/20 px-5 py-2 rounded-xl text-sm font-bold text-blue-500 dark:text-blue-400 uppercase tracking-wider">
                        Max Marks: {exam.maxMarks}
                      </span>
                    </>
                  );
                })()}
              </div>
            )}
          </div>

          {safeExams.length === 0 && (
            <div className="rounded-2xl border-2 border-dashed border-border bg-card p-12 text-center shadow-sm max-w-lg mx-auto">
              <p className="text-xs font-semibold text-muted-foreground">No exams found for your assigned classes. Contact administrator.</p>
            </div>
          )}

          {!selectedExam && safeExams.length > 0 && (
            <div className="rounded-2xl border-2 border-dashed border-border bg-card p-12 text-center shadow-sm max-w-lg mx-auto">
              <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-cyan-500/10 mx-auto mb-4">
                <svg viewBox="0 0 24 24" className="h-7 w-7 text-cyan-500" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-sm font-bold text-foreground">Select an Exam to Begin</p>
              <p className="text-xs text-muted-foreground mt-1.5 max-w-xs mx-auto leading-relaxed">Choose an exam from the dropdown above to load the student list and start entering marks.</p>
            </div>
          )}

          {loadingStudents && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="skeleton h-14 rounded-xl" />)}
            </div>
          )}

          {selectedExam && !loadingStudents && students.length === 0 && (
            <div className="rounded-2xl border-2 border-dashed border-border bg-card p-10 text-center shadow-sm max-w-lg mx-auto">
              <p className="text-xs font-semibold text-muted-foreground">No students found associated with this class and exam.</p>
            </div>
          )}

          {students.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-md">
              <table className="w-full text-left text-sm text-foreground">
                <thead className="border-b border-border bg-background/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="p-4 px-6 w-16">#</th>
                    <th className="p-4 px-6">Student</th>
                    <th className="p-4 px-6">Roll Number</th>
                    <th className="p-4 px-6 w-40">Marks</th>
                    <th className="p-4 px-6">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-subtle">
                  {students.map((student, idx) => (
                    <tr key={student.id} className="hover:bg-hover transition duration-200">
                      <td className="p-4 px-6 text-xs font-semibold text-muted-foreground">#{idx + 1}</td>
                      <td className="p-4 px-6 font-semibold text-foreground">{student.name}</td>
                      <td className="p-4 px-6 font-medium text-muted-foreground">{student.rollNumber || "—"}</td>
                      <td className="p-4 px-6">
                        <input
                          type="number"
                          min="0"
                          max={safeExams.find((e) => e.id === selectedExam)?.maxMarks || 100}
                          className="input-theme py-1.5 px-2 text-xs w-28"
                          value={marksInput[student.id]?.marks ?? ""}
                          onChange={(e) => handleMarksChange(student.id, "marks", e.target.value)}
                          placeholder="0"
                        />
                      </td>
                      <td className="p-4 px-6">
                        <input
                          type="text"
                          className="input-theme py-1.5 px-2 text-xs w-full max-w-md"
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
            <div className="flex justify-end pt-2">
              <button
                onClick={handleSubmitMarks}
                disabled={submitting}
                className="btn-cyan rounded-xl px-5 py-3 text-xs font-bold whitespace-nowrap disabled:opacity-50"
              >
                {submitting ? "Saving..." : "Submit Marks"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Edit Marks Tab */}
      {activeTab === "edit" && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
          {/* Controls bar */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-border bg-card p-4 shadow-sm bg-hover/10">
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-60">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                    <path d="M10 4a6 6 0 1 0 3.7 10.7l3.6 3.6 1.4-1.4-3.6-3.6A6 6 0 0 0 10 4Zm0 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Search by name or roll..."
                  value={resultsSearch}
                  onChange={(e) => { setResultsSearch(e.target.value); setResultsPage(1); }}
                  className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm focus-visible:outline-none focus:ring-accent focus:border-transparent"
                />
              </div>
              <select
                className="select-theme w-full sm:w-40"
                value={resultsClassFilter}
                onChange={(e) => { setResultsClassFilter(e.target.value ? Number(e.target.value) : ""); setResultsPage(1); }}
              >
                <option value="">All Classes</option>
                {[...new Map(safeClassSubjects.map(cs => [cs.classId, cs])).values()]
                  .sort((a, b) => Number(a.className) - Number(b.className))
                  .map(cs => (
                    <option key={cs.classId} value={cs.classId}>
                      Class {cs.className}
                    </option>
                  ))}
              </select>
              <select
                className="select-theme w-full sm:w-40"
                value={resultsSubjectFilter}
                onChange={(e) => { setResultsSubjectFilter(e.target.value ? Number(e.target.value) : ""); setResultsPage(1); }}
              >
                <option value="">All Subjects</option>
                {[...new Map(safeClassSubjects.map(cs => [cs.subjectId, cs])).values()].map(cs => (
                  <option key={cs.subjectId} value={cs.subjectId}>{cs.subjectName}</option>
                ))}
              </select>
            </div>
            <span className="text-xs font-semibold text-muted-foreground self-center shrink-0">
              {safeResultsTotal} {safeResultsTotal === 1 ? "result" : "results"} found
            </span>
          </div>

          {loadingResults ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="skeleton h-14 rounded-xl" />)}
            </div>
          ) : safeResultsItems.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-border bg-card p-12 text-center shadow-sm max-w-lg mx-auto">
              <p className="text-xs font-semibold text-muted-foreground">No results recorded. Enter marks first.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-md">
              <table className="w-full text-left text-sm text-foreground">
                <thead className="border-b border-border bg-background/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="p-4 px-6">Student</th>
                    <th className="p-4 px-6">Class</th>
                    <th className="p-4 px-6">Subject</th>
                    <th className="p-4 px-6">Exam</th>
                    <th className="p-4 px-6 w-36">Marks</th>
                    <th className="p-4 px-6">Grade</th>
                    <th className="p-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-subtle">
                  {safeResultsItems.map((result) => {
                    const pct = getPercent(result.marks, result.maxMarks);
                    const grade = getGrade(pct);
                    return (
                      <tr key={result.id} className="hover:bg-hover transition duration-200">
                        <td className="p-4 px-6">
                          <p className="text-xs font-semibold text-foreground">{result.studentName}</p>
                          <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">Roll {result.rollNumber || "—"}</p>
                          {editingResultId === result.id && (
                            <input
                              type="text"
                              placeholder="Remarks..."
                              className="input-theme py-1 px-1.5 text-[10px] w-full mt-2"
                              value={editRemarksInput}
                              onChange={(e) => setEditRemarksInput(e.target.value)}
                            />
                          )}
                        </td>
                        <td className="p-4 px-6 text-xs text-secondary font-medium">{result.className}</td>
                        <td className="p-4 px-6 text-xs text-secondary font-medium">{result.subjectName}</td>
                        <td className="p-4 px-6 text-xs text-secondary font-medium">{result.examName}</td>
                        <td className="p-4 px-6">
                          {editingResultId === result.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="0"
                                max={result.maxMarks}
                                className="input-theme py-1 px-1.5 text-xs w-16"
                                value={editMarksInput}
                                onChange={(e) => setEditMarksInput(e.target.value)}
                              />
                              <span className="text-[10px] text-muted-foreground">/{result.maxMarks}</span>
                            </div>
                          ) : (
                            <>
                              <span className="text-xs font-bold text-foreground">{result.marks}</span>
                              <span className="text-[10px] text-muted-foreground">/{result.maxMarks}</span>
                            </>
                          )}
                        </td>
                        <td className="p-4 px-6">
                          <span className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${grade.cls}`}>
                            {grade.label}
                          </span>
                        </td>
                        <td className="p-4 px-6 text-right">
                          {editingResultId === result.id ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={async () => {
                                  const newM = parseFloat(editMarksInput);
                                  if (isNaN(newM) || newM < 0 || newM > result.maxMarks) {
                                    toast.error(`Marks must be a number between 0 and ${result.maxMarks}`);
                                    return;
                                  }
                                  await handleEditMark(result.id, newM, editRemarksInput);
                                  setEditingResultId(null);
                                }}
                                className="text-[10px] font-bold text-emerald-500 hover:text-emerald-400 border border-emerald-500/20 bg-emerald-500/10 rounded-lg px-2.5 py-1 transition"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingResultId(null)}
                                className="text-[10px] font-bold text-muted-foreground hover:text-foreground border border-subtle bg-hover rounded-lg px-2.5 py-1 transition"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingResultId(result.id);
                                setEditMarksInput(String(result.marks));
                                setEditRemarksInput(result.remarks || "");
                              }}
                              className="text-[10px] font-bold text-cyan-500 hover:text-cyan-400 border border-cyan-500/20 bg-cyan-500/10 rounded-lg px-2.5 py-1 transition"
                            >
                              Edit
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {safeResultsPages > 1 && (
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground pt-4 border-t border-border mt-4 w-full">
              <div>
                {resultsPage > 1 && (
                  <button
                    onClick={() => setResultsPage((p) => p - 1)}
                    className="rounded-xl border border-border bg-card px-4 py-2.5 hover:bg-hover transition duration-150"
                  >
                    ← Previous
                  </button>
                )}
              </div>
              <span className="tabular-nums">Page {resultsPage} of {safeResultsPages}</span>
              <div>
                {resultsPage < safeResultsPages && (
                  <button
                    onClick={() => setResultsPage((p) => p + 1)}
                    className="rounded-xl border border-border bg-card px-4 py-2.5 hover:bg-hover transition duration-150"
                  >
                    Next →
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === "analytics" && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
          {loadingAnalytics ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-24 rounded-xl" />)}
            </div>
          ) : !analytics ? (
            <div className="rounded-2xl border-2 border-dashed border-border bg-card p-10 text-center shadow-sm max-w-lg mx-auto">
              <p className="text-xs font-semibold text-muted-foreground">No data available for analytics.</p>
            </div>
          ) : (
            <>
              {/* Premium KPI Cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: "Pass Rate", value: `${analytics.passPercentage}%`, color: "text-emerald-500 border-emerald-500/10 bg-emerald-500/5", icon: <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5" /></svg> },
                  { label: "Avg Score", value: analytics.averageScore, color: "text-cyan-500 dark:text-cyan-400 border-cyan-500/10 bg-cyan-500/5", icon: <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg> },
                  { label: "Highest", value: analytics.highestScore, color: "text-emerald-500 border-emerald-500/10 bg-emerald-500/5", icon: <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19h16v2H4v-2Zm2-2h3V9H6v8Zm5 0h3V4h-3v13Zm5 0h3v-6h-3v6Z" /></svg> },
                  { label: "Lowest", value: analytics.lowestScore, color: "text-rose-500 dark:text-rose-400 border-rose-500/10 bg-rose-500/5", icon: <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12H2" /><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" /></svg> },
                ].map(({ label, value, color, icon }) => (
                  <div key={label} className={`rounded-2xl border bg-gradient-to-br p-5 shadow-sm hover:-translate-y-1 transition-all duration-300 group ${color.split(" ").slice(1).join(" ")}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
                        <p className="mt-3 text-3xl font-black text-foreground">{value}</p>
                      </div>
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110 ${color.split(" ")[0].replace(
                          "text-",
                          "bg-"
                        )}`}
                      >
                        <span className="text-white">
                          {icon}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Performance Trend Line Chart */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-4">Class Performance Trend</h4>
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics.trendData || []} margin={{ left: -15, right: 10, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.2} vertical={false} />
                      <XAxis dataKey="date" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "#22d3ee", strokeWidth: 1, strokeDasharray: "4 4" }} />
                      <Line type="monotone" dataKey="score" name="Average Score" stroke="#22d3ee" strokeWidth={2.5} dot={{ fill: "#22d3ee", r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Top Performers */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-4">Top Performers</h4>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {analytics.topPerformers.map((t, idx) => (
                    <div key={`${t.name}-${idx}`} className="flex items-center gap-4.5 p-4 rounded-xl border border-border bg-hover/20 hover:bg-hover transition duration-150">
                      <div className="text-2xl leading-none shrink-0">
                        {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : (
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-hover border border-border text-xs font-bold text-secondary">{idx + 1}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-foreground truncate">{t.name}</p>
                        <p className="text-[10px] text-emerald-500 dark:text-emerald-400 font-bold mt-1 uppercase tracking-wider">{t.score}% Average</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}