"use client";

import { useState, useEffect } from "react";

type AssignmentType = {
  id: number;
  title: string;
  description: string | null;
  dueDate: string;
  maxMarks: string | null;
  subjectId: number;
  subjectName: string | null;
};

type SubmissionType = {
  assignmentId: number;
  content: string | null;
  fileUrl: string | null;
  submittedAt: string | null;
  grade: string | null;
  feedback: string | null;
  isLate: boolean;
};

type Props = {
  initialAssignments: AssignmentType[];
  submissions: SubmissionType[];
  studentName: string;
};

export default function ParentAssignmentsClient({
  initialAssignments,
  submissions,
  studentName,
}: Props) {
  const [selectedId, setSelectedId] = useState<number | null>(
    initialAssignments[0]?.id || null
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "completed" | "incomplete" | "pending_review"
  >("all");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Filter assignments list
  const filteredAssignments = initialAssignments.filter((a) => {
    const sub = submissions.find((s) => s.assignmentId === a.id);

    const matchesSearch =
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.description || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.subjectName || "").toLowerCase().includes(searchQuery.toLowerCase());

    let matchesStatus = true;
    if (statusFilter === "completed") {
      matchesStatus = !!sub;
    } else if (statusFilter === "incomplete") {
      matchesStatus = !sub;
    } else if (statusFilter === "pending_review") {
      matchesStatus = !!sub && !sub.grade;
    }

    return matchesSearch && matchesStatus;
  });

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const totalPages = Math.ceil(filteredAssignments.length / itemsPerPage) || 1;
  const paginatedAssignments = filteredAssignments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const selectedAssignment = initialAssignments.find((a) => a.id === selectedId);
  const selectedSubmission = submissions.find((s) => s.assignmentId === selectedId);
  const isAlreadySubmitted = !!selectedSubmission;

  const isOverdue = selectedAssignment
    ? new Date(selectedAssignment.dueDate) < new Date() && !isAlreadySubmitted
    : false;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-500 dark:text-cyan-400">
          Academics
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
          Assignments Tracker
        </h1>
        <p className="mt-2 text-sm text-secondary">
          Track homework submissions, deadlines, grading scores, and teacher reviews for {studentName}.
        </p>
      </div>

      {initialAssignments.length > 0 ? (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left panel: List */}
          <div className="lg:col-span-1 space-y-4">
            <p className="text-xs font-bold text-secondary uppercase tracking-wider px-1">
              Assignment List
            </p>

            {/* Search & Filter Buttons */}
            <div className="space-y-3 bg-surface border border-theme p-4 rounded-2xl">
              <input
                type="text"
                placeholder="Search assignments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 rounded-xl border border-theme bg-base px-3 text-xs text-primary outline-none focus:border-cyan-500 placeholder:text-muted transition"
              />

              <div className="grid grid-cols-2 gap-1.5">
                {(["all", "completed", "incomplete", "pending_review"] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setStatusFilter(opt)}
                    className={`rounded-lg py-1.5 text-[9px] font-bold uppercase tracking-wider transition-all duration-200 border ${
                      statusFilter === opt
                        ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30 shadow-sm"
                        : "bg-hover text-secondary border-transparent hover:text-primary"
                    }`}
                  >
                    {opt.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1 scrollbar-hide">
              {paginatedAssignments.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted">No assignments found.</div>
              ) : (
                paginatedAssignments.map((a) => {
                  const sub = submissions.find((s) => s.assignmentId === a.id);
                  const active = a.id === selectedId;
                  const pastDue = new Date(a.dueDate) < new Date();
                  return (
                    <button
                      key={a.id}
                      onClick={() => setSelectedId(a.id)}
                      className={`w-full text-left rounded-2xl p-4 border transition-all duration-200 ${
                        active
                          ? "border-cyan-500 bg-cyan-500/10 shadow-lg shadow-cyan-950/20"
                          : "border-theme bg-surface hover:bg-hover"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">
                          {a.subjectName}
                        </span>
                        {sub ? (
                          <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                            Submitted
                          </span>
                        ) : pastDue ? (
                          <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 uppercase tracking-wider">
                            Overdue
                          </span>
                        ) : (
                          <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider">
                            Pending
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs font-bold text-primary truncate">{a.title}</h4>
                      <p className="text-[10px] text-muted mt-2">
                        Due: {new Date(a.dueDate).toLocaleDateString([], { month: "short", day: "numeric" })}
                      </p>
                    </button>
                  );
                })
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between text-xs font-semibold text-muted pt-2 border-t border-theme">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="disabled:opacity-50 text-[10px] hover:text-primary transition"
                >
                  ← Prev
                </button>
                <span>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="disabled:opacity-50 text-[10px] hover:text-primary transition"
                >
                  Next →
                </button>
              </div>
            )}
          </div>

          {/* Right panel: Details */}
          <div className="lg:col-span-2 space-y-4">
            {selectedAssignment ? (
              <div className="rounded-3xl border border-theme bg-surface p-6 sm:p-8 shadow-md space-y-6">
                <div>
                  <span className="rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                    {selectedAssignment.subjectName}
                  </span>
                  <h2 className="text-xl font-bold text-primary mt-2">{selectedAssignment.title}</h2>
                  <p className="text-xs text-muted mt-1">
                    Max Marks: {selectedAssignment.maxMarks || "N/A"} • Deadline:{" "}
                    {new Date(selectedAssignment.dueDate).toLocaleDateString([], {
                      weekday: "short",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>

                {selectedAssignment.description && (
                  <div className="space-y-1.5">
                    <h4 className="text-[10px] uppercase font-bold text-muted tracking-wider">
                      Instructions
                    </h4>
                    <p className="text-xs text-secondary leading-relaxed whitespace-pre-wrap bg-base rounded-xl p-4 border border-theme">
                      {selectedAssignment.description}
                    </p>
                  </div>
                )}

                {/* Submissions Section */}
                <div className="border-t border-subtle pt-6 space-y-4">
                  <h3 className="text-sm font-bold text-primary">Student Submission</h3>

                  {isAlreadySubmitted ? (
                    <div className="space-y-4">
                      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex justify-between items-start">
                        <div className="text-xs">
                          <p className="font-bold text-emerald-400">Successfully Submitted</p>
                          <p className="text-[10px] text-muted mt-1">
                            On: {new Date(selectedSubmission.submittedAt!).toLocaleString()}
                          </p>
                        </div>
                        {selectedSubmission.isLate && (
                          <span className="rounded bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 text-[9px] font-bold text-rose-400 uppercase tracking-wider">
                            Late Submission
                          </span>
                        )}
                      </div>

                      {selectedSubmission.content && (
                        <div className="space-y-1.5">
                          <h4 className="text-[10px] uppercase font-bold text-muted tracking-wider">
                            Submission Content
                          </h4>
                          <p className="text-xs text-secondary leading-relaxed bg-base p-4 rounded-xl border border-theme whitespace-pre-wrap">
                            {selectedSubmission.content}
                          </p>
                        </div>
                      )}

                      {selectedSubmission.fileUrl && (
                        <div className="space-y-1.5">
                          <h4 className="text-[10px] uppercase font-bold text-muted tracking-wider">
                            Attachment File
                          </h4>
                          <div className="flex items-center justify-between rounded-xl border border-theme bg-base p-3 text-xs">
                            <span className="font-semibold text-primary truncate max-w-[250px]">
                              {selectedSubmission.fileUrl.split("/").pop()}
                            </span>
                            <a
                              href={selectedSubmission.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-cyan-400 hover:text-cyan-300 font-bold"
                            >
                              Download File 📥
                            </a>
                          </div>
                        </div>
                      )}

                      {/* Grading and Review */}
                      <div className="grid gap-4 sm:grid-cols-2 pt-4 border-t border-subtle">
                        <div>
                          <h4 className="text-[10px] uppercase font-bold text-muted tracking-wider">
                            Marks Grade
                          </h4>
                          <p className="mt-1 text-lg font-black text-primary">
                            {selectedSubmission.grade ? (
                              <>
                                <span className="text-cyan-400">{selectedSubmission.grade}</span>
                                <span className="text-xs font-normal text-muted">
                                  {" "}
                                  / {selectedAssignment.maxMarks}
                                </span>
                              </>
                            ) : (
                              <span className="text-xs font-bold text-muted italic">Pending Grading</span>
                            )}
                          </p>
                        </div>
                        <div>
                          <h4 className="text-[10px] uppercase font-bold text-muted tracking-wider">
                            Teacher Feedback
                          </h4>
                          <p className="mt-1 text-xs text-secondary italic">
                            {selectedSubmission.feedback || "No feedback comments left yet."}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-theme bg-hover/20 p-6 text-center text-xs">
                      {isOverdue ? (
                        <p className="text-rose-400 font-bold">
                          ⚠️ This assignment is overdue and has not been submitted.
                        </p>
                      ) : (
                        <p className="text-muted">
                          This assignment has not been submitted by the student yet.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-theme bg-surface p-12 text-center text-sm font-medium text-muted">
                No assignment details to view.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-theme bg-surface p-12 text-center text-sm font-medium text-muted">
          No assignments listed for this class.
        </div>
      )}
    </div>
  );
}
