"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";

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

  useEffect(() => { fetchAssignments(); }, [page, search]);

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

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this assignment? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/teacher/assignments?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      toast.success("Assignment deleted");
      fetchAssignments();
    } catch (err: any) {
      toast.error(err.message);
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

  const filteredClassSubjects = classSubjects.filter(
    (cs) => !form.classId || cs.classId === form.classId
  );

  return (
    <main className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8 space-y-8 transition-colors duration-200">
      {/* Header */}
      <div className="flex flex-wrap gap-4 items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-500 dark:text-cyan-400">
            Faculty Portal
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Assignments</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Create and manage assignments for your assigned classes and subjects.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-cyan rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center gap-2 shrink-0"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M19 11h-6V5h-2v6H5v2h6v6h2v-6h6z" /></svg>
          New Assignment
        </button>
      </div>

      {/* Search */}
      <div className="flex gap-3 flex-wrap items-center">
        <input
          type="text"
          placeholder="Search assignments..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="input-theme max-w-[280px] py-2 text-xs"
        />
        <span className="text-xs text-muted-foreground">{assignments.length} assignments</span>
      </div>

      {/* Assignments Grid */}
      {loading ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-40 rounded-2xl" />)}
        </div>
      ) : assignments.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-theme bg-surface p-16 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-hover text-muted">
            <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
              <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2Z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-primary">No Assignments Yet</h3>
          <p className="mt-2 text-sm text-secondary max-w-sm mx-auto">
            Create your first assignment to get started. Track submissions and grade students directly.
          </p>
          <button onClick={() => setShowCreateModal(true)} className="btn-cyan mt-4 rounded-xl px-5 py-2 text-sm font-semibold">
            Create Assignment
          </button>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {assignments.map((assignment) => {
            const isOverdue = assignment.dueDate && new Date(assignment.dueDate) < new Date();
            return (
              <div
                key={assignment.id}
                className="group rounded-2xl border border-border bg-card hover:border-cyan-500/30 hover:-translate-y-1 transition-all duration-300 p-5 shadow-sm hover:shadow-lg flex flex-col"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-foreground group-hover:text-cyan-400 transition truncate">
                      {assignment.title}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {assignment.subjectName} · {assignment.className}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(assignment.id)}
                    className="shrink-0 opacity-0 group-hover:opacity-100 rounded-lg p-1.5 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition"
                  >
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
                      <path d="M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-3.5l-1-1zM18 7H6v12c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7z" />
                    </svg>
                  </button>
                </div>

                {assignment.description && (
                  <p className="text-[10px] text-secondary leading-relaxed line-clamp-2 mb-3">
                    {assignment.description}
                  </p>
                )}

                {/* Submission Progress */}
                <div className="mt-auto space-y-2">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-muted-foreground">Submissions</span>
                    <span className="font-semibold text-foreground">{assignment.submitted}/{assignment.totalStudents}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-hover overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-700"
                      style={{ width: `${assignment.submissionPct}%` }}
                    />
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className={`text-[9px] font-semibold rounded-full border px-2 py-0.5 ${
                    isOverdue
                      ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                      : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  }`}>
                    {assignment.dueDate ? `Due: ${new Date(assignment.dueDate).toLocaleDateString([], { month: "short", day: "numeric" })}` : "No due date"}
                  </span>
                  <button
                    onClick={() => { setSelectedAssignment(assignment); fetchSubmissions(assignment.id); }}
                    className="text-[10px] font-semibold text-cyan-400 hover:text-cyan-300 border border-cyan-500/20 bg-cyan-500/10 rounded-lg px-2.5 py-1 transition"
                  >
                    Review →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-secondary border border-subtle hover:bg-hover disabled:opacity-30 transition">← Prev</button>
          <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-secondary border border-subtle hover:bg-hover disabled:opacity-30 transition">Next →</button>
        </div>
      )}

      {/* Create Assignment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground">Create Assignment</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-muted-foreground hover:text-foreground transition">
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
              </button>
            </div>

            <div className="space-y-4">
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Title *</span>
                <input type="text" className="input-theme" value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Chapter 5 Worksheet" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Class *</span>
                  <select className="select-theme" value={form.classId} onChange={(e) => setForm(f => ({ ...f, classId: e.target.value ? Number(e.target.value) : "", subjectId: "" }))}>
                    <option value="">Select class</option>
                    {[...new Map(classSubjects.map(cs => [cs.classId, cs])).values()].map(cs => (
                      <option key={cs.classId} value={cs.classId}>{cs.className}</option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Subject *</span>
                  <select className="select-theme" value={form.subjectId} onChange={(e) => setForm(f => ({ ...f, subjectId: e.target.value ? Number(e.target.value) : "" }))}>
                    <option value="">Select subject</option>
                    {classSubjects.filter(cs => !form.classId || cs.classId === form.classId).map(cs => (
                      <option key={cs.subjectId} value={cs.subjectId}>{cs.subjectName}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Due Date *</span>
                  <input type="date" className="input-theme" value={form.dueDate} onChange={(e) => setForm(f => ({ ...f, dueDate: e.target.value }))} />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Max Marks</span>
                  <input type="number" className="input-theme" value={form.maxMarks} onChange={(e) => setForm(f => ({ ...f, maxMarks: Number(e.target.value) }))} />
                </label>
              </div>
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Description</span>
                <textarea className="textarea-theme" rows={3} value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Instructions for students..." />
              </label>
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setShowCreateModal(false)} className="rounded-xl border border-subtle px-4 py-2 text-xs font-semibold text-secondary hover:bg-hover transition">Cancel</button>
              <button onClick={handleCreate} disabled={creating} className="btn-cyan rounded-xl px-5 py-2 text-xs font-semibold disabled:opacity-50">{creating ? "Creating..." : "Create Assignment"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Submissions Panel */}
      {selectedAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60">
          <div className="h-full w-full max-w-lg bg-card border-l border-border shadow-2xl overflow-y-auto">
            <div className="sticky top-0 z-10 border-b border-subtle bg-card/95 backdrop-blur px-6 py-4 flex items-center gap-3">
              <button onClick={() => { setSelectedAssignment(null); setSubmissions([]); setAnalytics(null); }} className="text-muted-foreground hover:text-foreground transition">
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M19 11H7.83l4.88-4.88c.39-.39.39-1.03 0-1.42-.39-.39-1.02-.39-1.41 0l-6.59 6.59c-.39.39-.39 1.02 0 1.41l6.59 6.59c.39.39 1.02.39 1.41 0 .39-.39.39-1.02 0-1.41L7.83 13H19c.55 0 1-.45 1-1s-.45-1-1-1z"/></svg>
              </button>
              <div>
                <h3 className="text-sm font-bold text-foreground">{selectedAssignment.title}</h3>
                <p className="text-[10px] text-muted-foreground">{selectedAssignment.subjectName} · {selectedAssignment.className}</p>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Analytics */}
              {analytics && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-subtle bg-hover/30 p-3 text-center">
                    <p className="text-xl font-bold text-foreground">{analytics.submissionRate}%</p>
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5">Submitted</p>
                  </div>
                  <div className="rounded-xl border border-subtle bg-hover/30 p-3 text-center">
                    <p className="text-xl font-bold text-foreground">{analytics.avgGrade}</p>
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5">Avg Grade</p>
                  </div>
                  <div className="rounded-xl border border-subtle bg-hover/30 p-3 text-center">
                    <p className="text-xl font-bold text-rose-400">{analytics.late}</p>
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5">Late</p>
                  </div>
                </div>
              )}

              {/* Submissions List */}
              {loadingSubmissions ? (
                <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
              ) : submissions.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-theme p-8 text-center">
                  <p className="text-sm text-secondary">No submissions yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {submissions.map((sub) => (
                    <div key={sub.id} className="rounded-xl border border-subtle bg-hover/20 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold text-foreground">{sub.studentName}</p>
                          <p className="text-[10px] text-muted-foreground">Roll {sub.rollNumber}</p>
                        </div>
                        <div className="flex gap-1.5">
                          {sub.isLate && (
                            <span className="rounded-full bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 text-[9px] font-bold text-rose-400">Late</span>
                          )}
                          {sub.grade !== null && (
                            <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400">
                              {sub.grade}/{selectedAssignment.maxMarks}
                            </span>
                          )}
                        </div>
                      </div>
                      {sub.grade === null && (
                        <button
                          onClick={() => {
                            const grade = window.prompt("Enter grade (0-" + selectedAssignment.maxMarks + "):");
                            const feedback = window.prompt("Enter feedback:");
                            if (grade !== null && !isNaN(Number(grade))) {
                              handleGrade(sub.id, Number(grade), feedback || "");
                            }
                          }}
                          className="mt-2 text-[10px] font-semibold text-cyan-400 hover:text-cyan-300 border border-cyan-500/20 bg-cyan-500/10 rounded-lg px-2.5 py-1 transition"
                        >
                          Grade
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
