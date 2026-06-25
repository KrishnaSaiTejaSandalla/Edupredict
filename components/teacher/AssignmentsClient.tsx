"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import DeleteConfirmModal from "@/components/ui/DeleteConfirmModal";

type ClassSubject = { classId: number; subjectId: number; className: string; subjectName: string };

type AssignmentItem = {
  id: number;
  title: string;
  description: string;
  dueDate: string | null;
  maxMarks: number;
  className: string;
  subjectName: string;
  totalStudents: number;
  submitted: number;
  submissionPct: number;
  createdAt: string;
};

type Submission = {
  id: number;
  studentName: string;
  rollNumber: string;
  submittedAt: string;
  isLate: boolean;
  grade: number | null;
  feedback: string;
  gradedAt: string | null;
};

type Analytics = {
  total: number;
  graded: number;
  late: number;
  avgGrade: number;
  submissionRate: number;
  totalStudents: number;
};

type Props = {
  teacherId: number | null;
  classSubjects: ClassSubject[];
};

export default function AssignmentsClient({ teacherId, classSubjects }: Props) {
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentItem | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState<{ id: number; title: string } | null>(null);

  // Inline grading state
  const [gradingId, setGradingId] = useState<number | null>(null);
  const [gradeValue, setGradeValue] = useState<string>("");
  const [feedbackValue, setFeedbackValue] = useState<string>("");

  // Create form
  const [form, setForm] = useState({
    classId: "" as number | "",
    subjectId: "" as number | "",
    title: "",
    description: "",
    dueDate: "",
    maxMarks: 100,
  });
  const [creating, setCreating] = useState(false);

  const fetchAssignments = () => {
    setLoading(true);
    fetch(`/api/teacher/assignments?page=${page}&search=${encodeURIComponent(search)}`)
      .then((r) => r.json())
      .then((data) => {
        setAssignments(data.items || []);
        setTotalPages(data.pages || 1);
      })
      .catch(() => toast.error("Failed to load assignments"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAssignments();
  }, [page, search]);

  const fetchSubmissions = (assignmentId: number) => {
    setLoadingSubmissions(true);
    Promise.all([
      fetch(`/api/teacher/assignments/${assignmentId}/submissions`).then((r) => r.json()),
      fetch(`/api/teacher/assignments/${assignmentId}/submissions?action=analytics`).then((r) => r.json()),
    ])
      .then(([subData, analData]) => {
        setSubmissions(subData.items || []);
        setAnalytics(analData);
      })
      .catch(() => toast.error("Failed to load submissions"))
      .finally(() => setLoadingSubmissions(false));
  };

  const handleCreate = async () => {
    if (!form.classId || !form.subjectId || !form.title || !form.dueDate) {
      toast.error("Please fill all required fields");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/teacher/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      toast.success("Assignment created!");
      setShowCreateModal(false);
      setForm({ classId: "", subjectId: "", title: "", description: "", dueDate: "", maxMarks: 100 });
      fetchAssignments();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  const askDelete = (id: number, title: string) => {
    setAssignmentToDelete({ id, title });
    setDeleteModalOpen(true);
  };

  const executeDelete = async () => {
    if (!assignmentToDelete) return;
    const { id } = assignmentToDelete;
    setDeleteModalOpen(false);
    try {
      const res = await fetch(`/api/teacher/assignments?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      toast.success("Assignment deleted");
      fetchAssignments();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAssignmentToDelete(null);
    }
  };

  const handleGrade = async (submissionId: number, grade: number, feedback: string) => {
    if (!selectedAssignment) return;
    try {
      const res = await fetch(`/api/teacher/assignments/${selectedAssignment.id}/submissions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId, grade, feedback }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      toast.success("Submission graded!");
      fetchSubmissions(selectedAssignment.id);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const startGrading = (sub: Submission) => {
    setGradingId(sub.id);
    setGradeValue(sub.grade !== null ? String(sub.grade) : "");
    setFeedbackValue(sub.feedback || "");
  };

  const filteredClassSubjects = classSubjects.filter(
    (cs) => !form.classId || cs.classId === form.classId
  );

  // KPI calculations
  const totalAssignments = assignments.length;
  const activeCount = assignments.filter((a) => !a.dueDate || new Date(a.dueDate) >= new Date()).length;
  const overdueCount = assignments.filter((a) => a.dueDate && new Date(a.dueDate) < new Date()).length;
  const avgSubmissionPct =
    totalAssignments > 0
      ? Math.round(assignments.reduce((sum, a) => sum + a.submissionPct, 0) / totalAssignments)
      : 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-400">
            Faculty Portal
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Assignments</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Create and manage assignments for your assigned classes and subjects.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="rounded-xl btn-cyan px-5 py-3 text-xs font-bold whitespace-nowrap flex items-center gap-2 shrink-0 self-start sm:self-auto"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M19 11h-6V5h-2v6H5v2h6v6h2v-6h6z" /></svg>
          New Assignment
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Assignments", value: totalAssignments, color: "text-primary border-border" },
          { label: "Active Assignments", value: activeCount, color: "text-emerald-500 dark:text-emerald-400 border-emerald-500/10 bg-emerald-500/5" },
          { label: "Overdue Assignments", value: overdueCount, color: "text-rose-500 dark:text-rose-400 border-rose-500/10 bg-rose-500/5" },
          { label: "Avg Submission", value: `${avgSubmissionPct}%`, color: "text-cyan-500 dark:text-cyan-400 border-cyan-500/10 bg-cyan-500/5" },
        ].map(({ label, value, color }) => (
          <div key={label} className={`rounded-2xl border bg-card p-5 shadow-sm hover:shadow-md transition duration-200 ${color.includes("border-") ? color.split(" ")[1] + " " + color.split(" ")[2] : "border-border"}`}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className={`mt-2 text-2xl font-black ${color.split(" ")[0]}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="relative flex-1 max-w-md w-full">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50">
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
              <path d="M10 4a6 6 0 1 0 3.7 10.7l3.6 3.6 1.4-1.4-3.6-3.6A6 6 0 0 0 10 4Zm0 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z" />
            </svg>
          </span>
          {/* <input
            type="text"
            placeholder="Search assignments..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-md"
          /> */}
          <input
            type="text"
            placeholder="Search assignments..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-md focus-visible:outline-none focus:ring-accent focus:border-transparent"
          />
        </div>
        <span className="text-xs font-semibold text-muted-foreground self-center shrink-0">
          {assignments.length} {assignments.length === 1 ? "assignment" : "assignments"} found
        </span>
      </div>

      {/* Assignments Grid */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-24 rounded-2xl" />
          ))}
        </div>
      ) : assignments.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border bg-card p-16 text-center shadow-sm max-w-lg mx-auto">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-hover text-muted-foreground">
            <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
              <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2Z" />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-foreground">No Assignments Yet</h3>
          <p className="mt-2 text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
            Create your first assignment to get started. Track submissions and grade students directly.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-cyan mt-5 rounded-xl px-5 py-2.5 text-xs font-bold whitespace-nowrap"
          >
            Create Assignment
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {assignments.map((assignment, index) => {
            const isOverdue = assignment.dueDate && new Date(assignment.dueDate) < new Date();
            return (
              <div
                key={`${assignment.id}-${index}`}
                className="group rounded-2xl border border-border bg-card hover:border-cyan-500/30 hover:-translate-y-0.5 transition-all duration-200 p-5 shadow-sm hover:shadow-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6"
              >
                {/* Left Side: Info & Description */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-bold text-foreground group-hover:text-cyan-400 transition truncate">
                      {assignment.title}
                    </p>
                    <span className="text-[10px] font-semibold text-muted-foreground bg-hover px-2 py-0.5 rounded-lg uppercase tracking-wider">
                      {assignment.className}
                    </span>
                    <span className="text-[10px] font-semibold text-accent bg-accent-bg px-2 py-0.5 rounded-lg uppercase tracking-wider">
                      {assignment.subjectName}
                    </span>
                  </div>
                  {assignment.description && (
                    <p className="text-xs text-secondary leading-relaxed line-clamp-2 mt-2">
                      {assignment.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-3">
                    <span className={`text-[9px] font-bold uppercase tracking-wider rounded-lg border px-2.5 py-1 ${isOverdue
                      ? "bg-rose-500/10 text-rose-500 dark:text-rose-400 border-rose-500/20"
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                      }`}>
                      {assignment.dueDate ? `Due: ${new Date(assignment.dueDate).toLocaleDateString([], { month: "short", day: "numeric" })}` : "No due date"}
                    </span>
                  </div>
                </div>

                {/* Right Side: Progress Bar + Submissions Count + Review Button + Delete Action */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-6 shrink-0 w-full sm:w-auto">
                  {/* Progress Info */}
                  <div className="w-full sm:w-44 space-y-2">
                    <div className="flex justify-between text-[10px] font-semibold">
                      <span className="text-muted-foreground">Submissions</span>
                      <span className="text-foreground">{assignment.submitted}/{assignment.totalStudents}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-hover overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-700"
                        style={{ width: `${assignment.submissionPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      onClick={() => { setSelectedAssignment(assignment); fetchSubmissions(assignment.id); }}
                      className="text-[10px] font-bold text-cyan-500 hover:text-cyan-400 border border-cyan-500/20 bg-cyan-500/10 rounded-xl px-4 py-2 transition"
                    >
                      Review Submissions
                    </button>
                    <button
                      onClick={() => askDelete(assignment.id, assignment.title)}
                      className="rounded-xl p-2 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition"
                      title="Delete Assignment"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                        <path d="M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-3.5l-1-1zM18 7H6v12c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground pt-4 border-t border-border mt-4 w-full">
          <div>
            {page > 1 && (
              <button
                onClick={() => setPage(p => p - 1)}
                className="rounded-xl border border-border bg-card px-4 py-2.5 hover:bg-hover transition duration-150"
              >
                ← Previous
              </button>
            )}
          </div>
          <span className="tabular-nums">Page {page} of {totalPages}</span>
          <div>
            {page < totalPages && (
              <button
                onClick={() => setPage(p => p + 1)}
                className="rounded-xl border border-border bg-card px-4 py-2.5 hover:bg-hover transition duration-150"
              >
                Next →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Create Assignment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm transition-all duration-300">
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-border bg-card shadow-2xl shadow-black/40 animate-in fade-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute right-5 top-5 z-10 flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-hover text-muted-foreground hover:text-foreground hover:bg-background transition duration-200"
            >
              ✕
            </button>

            {/* Header */}
            <div className="border-b border-border px-6 py-5">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">Create Assignment</h3>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              <label className="block space-y-1.5">
                <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Title *</span>
                <input type="text" className="input-theme" value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Chapter 5 Worksheet" />
              </label>

              <div className="grid grid-cols-2 gap-4">
                <label className="block space-y-1.5">
                  <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Class *</span>
                  <select className="select-theme" value={form.classId} onChange={(e) => setForm(f => ({ ...f, classId: e.target.value ? Number(e.target.value) : "", subjectId: "" }))}>
                    <option value="">Select class</option>
                    {[...new Map(classSubjects.map(cs => [cs.classId, cs])).values()].map(cs => (
                      <option key={cs.classId} value={cs.classId}>{cs.className}</option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1.5">
                  <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Subject *</span>
                  <select className="select-theme" value={form.subjectId} onChange={(e) => setForm(f => ({ ...f, subjectId: e.target.value ? Number(e.target.value) : "" }))}>
                    <option value="">Select subject</option>
                    {classSubjects.filter(cs => !form.classId || cs.classId === form.classId).map(cs => (
                      <option key={cs.subjectId} value={cs.subjectId}>{cs.subjectName}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="block space-y-1.5">
                  <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Due Date *</span>
                  <input type="date" className="input-theme" value={form.dueDate} onChange={(e) => setForm(f => ({ ...f, dueDate: e.target.value }))} />
                </label>
                <label className="block space-y-1.5">
                  <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Max Marks</span>
                  <input type="number" className="input-theme" value={form.maxMarks} onChange={(e) => setForm(f => ({ ...f, maxMarks: Number(e.target.value) }))} />
                </label>
              </div>

              <label className="block space-y-1.5">
                <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</span>
                <textarea className="textarea-theme" rows={3} value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Instructions for students..." />
              </label>
            </div>

            {/* Footer */}
            <div className="border-t border-border px-6 py-4 flex justify-end gap-3 bg-background/50">
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-xl border border-border bg-background px-5 py-2.5 text-xs font-bold text-foreground hover:bg-hover transition duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="btn-cyan rounded-xl px-5 py-2.5 text-xs font-bold whitespace-nowrap disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create Assignment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submissions Panel (Drawer) */}
      {selectedAssignment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-end bg-background/85 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => { setSelectedAssignment(null); setSubmissions([]); setAnalytics(null); setGradingId(null); }}
        >
          <div
            className="h-full w-full max-w-lg bg-card border border-border rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur px-6 py-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setSelectedAssignment(null); setSubmissions([]); setAnalytics(null); setGradingId(null); }}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-hover text-muted-foreground hover:text-foreground hover:bg-background transition duration-200"
                  title="Back"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M20 11H7.83l4.88-4.88c.39-.39.39-1.03 0-1.42-.39-.39-1.02-.39-1.41 0l-6.59 6.59c-.39.39-.39 1.02 0 1.41l6.59 6.59c.39.39 1.02.39 1.41 0 .39-.39.39-1.02 0-1.41L7.83 13H20c.55 0 1-.45 1-1s-.45-1-1-1z" /></svg>
                </button>
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">{selectedAssignment.title}</h3>
                  <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">{selectedAssignment.subjectName} · {selectedAssignment.className}</p>
                </div>
              </div>
              <button
                onClick={() => { setSelectedAssignment(null); setSubmissions([]); setAnalytics(null); setGradingId(null); }}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-hover text-muted-foreground hover:text-foreground hover:bg-background transition duration-200"
                title="Close"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Analytics strip */}
              {analytics && (
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Submitted", value: `${analytics.submissionRate}%`, color: "border-border text-foreground" },
                    { label: "Avg Grade", value: analytics.avgGrade, color: "border-border text-foreground" },
                    { label: "Late Submissions", value: analytics.late, color: "border-rose-500/10 text-rose-500 bg-rose-500/5" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className={`rounded-xl border p-3 text-center ${color.includes("bg-") ? color.split(" ")[1] + " " + color.split(" ")[2] : "bg-hover/30"}`}>
                      <p className={`text-xl font-bold ${color.split(" ")[0]}`}>{value}</p>
                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mt-1">{label}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Submissions List */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-4">Class Submissions</h4>
                {loadingSubmissions ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
                  </div>
                ) : submissions.length === 0 ? (
                  <div className="rounded-xl border-2 border-dashed border-border p-10 text-center bg-hover/10">
                    <p className="text-xs font-semibold text-muted-foreground">No submissions recorded for this assignment.</p>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {submissions.map((sub) => (
                      <div key={sub.id} className="rounded-2xl border border-border bg-hover/20 p-4 hover:border-cyan-500/10 transition duration-150">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-bold text-foreground">{sub.studentName}</p>
                            <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">Roll: {sub.rollNumber}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {sub.isLate && (
                              <span className="rounded-full bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 text-[9px] font-bold text-rose-500 dark:text-rose-400 uppercase tracking-wider">Late</span>
                            )}
                            {sub.grade !== null ? (
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-500 dark:text-emerald-400">
                                  {sub.grade}/{selectedAssignment.maxMarks}
                                </span>
                                <button
                                  onClick={() => startGrading(sub)}
                                  className="text-[10px] font-bold text-muted-foreground hover:text-foreground transition underline underline-offset-2"
                                  title="Edit Grade"
                                >
                                  Edit
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </div>

                        {/* Grading flow form */}
                        {gradingId === sub.id ? (
                          <div className="mt-3.5 space-y-3.5 border-t border-border pt-3.5 animate-in fade-in duration-200">
                            <div className="grid grid-cols-3 gap-3">
                              <div className="col-span-1">
                                <label className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Grade (Max {selectedAssignment.maxMarks})</label>
                                <input
                                  type="number"
                                  min="0"
                                  max={selectedAssignment.maxMarks}
                                  value={gradeValue}
                                  onChange={(e) => setGradeValue(e.target.value)}
                                  placeholder="0"
                                  className="input-theme h-8 text-xs py-1"
                                />
                              </div>
                              <div className="col-span-2">
                                <label className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Feedback</label>
                                <input
                                  type="text"
                                  value={feedbackValue}
                                  onChange={(e) => setFeedbackValue(e.target.value)}
                                  placeholder="Enter feedback..."
                                  className="input-theme h-8 text-xs py-1"
                                />
                              </div>
                            </div>
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => setGradingId(null)}
                                className="rounded-xl border border-border bg-background px-3 py-1.5 text-[10px] font-bold text-foreground hover:bg-hover transition"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => {
                                  const numGrade = Number(gradeValue);
                                  if (gradeValue.trim() === "" || isNaN(numGrade) || numGrade < 0 || numGrade > selectedAssignment.maxMarks) {
                                    toast.error(`Please enter a valid grade between 0 and ${selectedAssignment.maxMarks}`);
                                    return;
                                  }
                                  handleGrade(sub.id, numGrade, feedbackValue);
                                  setGradingId(null);
                                }}
                                className="rounded-xl btn-emerald px-3.5 py-1.5 text-[10px] font-bold whitespace-nowrap"
                              >
                                Submit Grade
                              </button>
                            </div>
                          </div>
                        ) : (
                          sub.grade === null && (
                            <button
                              onClick={() => startGrading(sub)}
                              className="mt-3.5 text-[10px] font-bold text-cyan-500 hover:text-cyan-400 border border-cyan-500/20 bg-cyan-500/10 rounded-xl px-3 py-1.5 transition"
                            >
                              Grade Submission
                            </button>
                          )
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        title="Delete Assignment?"
        message={`Are you sure you want to delete the assignment "${assignmentToDelete?.title}"? This action cannot be undone.`}
        onConfirm={() => { executeDelete(); }}
        onCancel={() => { setDeleteModalOpen(false); setAssignmentToDelete(null); }}
      />
    </div>
  );
}
