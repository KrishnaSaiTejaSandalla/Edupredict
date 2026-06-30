"use client";

import { useState, useTransition, useEffect } from "react";
import PageHeader from "@/components/shared/PageHeader";
import { toast } from "sonner";
import { submitAssignmentAction } from "@/lib/student-actions";

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
  submittedAt: string | Date | null;
  grade: string | null;
  feedback: string | null;
  isLate: boolean;
};

type Props = {
  initialAssignments: AssignmentType[];
  submissions: SubmissionType[];
};

export default function StudentAssignmentsClient({ initialAssignments, submissions }: Props) {
  const [selectedId, setSelectedId] = useState<number | null>(initialAssignments[0]?.id || null);
  const [inputText, setInputText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "incomplete" | "pending_review">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [isPending, startTransition] = useTransition();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const extension = file.name.split('.').pop()?.toLowerCase();
    const allowed = ['pdf', 'docx', 'png', 'jpg', 'jpeg', 'zip'];
    if (!extension || !allowed.includes(extension)) {
      toast.error(`Invalid file type. Allowed types: ${allowed.join(', ')}`);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File is too large. Max size is 5MB.");
      return;
    }

    setSelectedFile(file);
    setFileName(file.name);
    toast.success(`Attached file: ${file.name} 📄`);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFileName(null);
  };

  const handleSubmit = () => {
    if (!selectedId) return;
    if (!inputText.trim() && !selectedFile) {
      toast.error("Please enter answer text or attach a file submission");
      return;
    }

    const formData = new FormData();
    formData.append("assignmentId", String(selectedId));
    formData.append("content", inputText);
    if (selectedFile) {
      formData.append("file", selectedFile);
    }

    startTransition(async () => {
      try {
        await submitAssignmentAction(formData);
        toast.success("Assignment submitted successfully! 🚀");
        setInputText("");
        setSelectedFile(null);
        setFileName(null);
        window.location.reload();
      } catch (e: any) {
        toast.error(e.message || "Failed to submit assignment");
      }
    });
  };

  // Filter logic
  const filteredAssignments = initialAssignments.filter((a) => {
    const sub = submissions.find((s) => s.assignmentId === a.id);
    
    // Search
    const matchesSearch = 
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.description || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.subjectName || "").toLowerCase().includes(searchQuery.toLowerCase());

    // Status
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

  // Reset page when filter/search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  // Paginated list
  const totalPages = Math.ceil(filteredAssignments.length / itemsPerPage) || 1;
  const paginatedAssignments = filteredAssignments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const selectedAssignment = initialAssignments.find((a) => a.id === selectedId);
  const selectedSubmission = submissions.find((s) => s.assignmentId === selectedId);
  const isAlreadySubmitted = !!selectedSubmission;

  const isOverdue = selectedAssignment
    ? new Date(selectedAssignment.dueDate) < new Date() && !isAlreadySubmitted
    : false;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      <PageHeader tag="Student Portal" title="My Assignments" description="Complete and submit your classwork on time." />

      {initialAssignments.length > 0 ? (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* List panel */}
          <div className="lg:col-span-1 space-y-4">
            <p className="text-xs font-bold text-secondary uppercase tracking-wider px-1">Assignment List</p>
            
            {/* Search and Filters */}
            <div className="space-y-3 bg-surface border border-theme p-4 rounded-2xl">
              <input
                type="text"
                placeholder="Search assignments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-theme bg-hover p-2.5 text-xs text-primary focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
              
              <div className="grid grid-cols-2 gap-1.5">
                {(["all", "completed", "incomplete", "pending_review"] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setStatusFilter(opt)}
                    className={`rounded-lg py-1.5 text-[9px] font-bold uppercase tracking-wider transition-all duration-200 border ${
                      statusFilter === opt
                        ? "bg-violet-500/20 text-violet-400 border-violet-500/30 shadow-sm"
                        : "bg-hover text-secondary border-transparent hover:text-primary"
                    }`}
                  >
                    {opt.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
              {paginatedAssignments.map((a) => {
                const sub = submissions.find((s) => s.assignmentId === a.id);
                const active = a.id === selectedId;
                const pastDue = new Date(a.dueDate) < new Date();
                return (
                  <button
                    key={a.id}
                    onClick={() => {
                      setSelectedId(a.id);
                      setInputText("");
                      handleRemoveFile();
                    }}
                    className={`w-full text-left rounded-2xl p-4 border transition-all duration-200 ${
                      active
                        ? "border-violet-500 bg-violet-500/10 shadow-lg shadow-violet-950/20"
                        : "border-theme bg-surface hover:bg-hover"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">{a.subjectName}</span>
                      {sub ? (
                        <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">Submitted</span>
                      ) : pastDue ? (
                        <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 uppercase tracking-wider">Overdue</span>
                      ) : (
                        <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider">Pending</span>
                      )}
                    </div>
                    <p className="text-xs font-bold text-primary truncate">{a.title}</p>
                    <p className="mt-2 text-[10px] text-muted">Due: {new Date(a.dueDate).toLocaleDateString()}</p>
                  </button>
                );
              })}

              {filteredAssignments.length === 0 && (
                <p className="text-xs text-muted text-center py-6 bg-surface border border-theme rounded-2xl">No assignments match your search/filters.</p>
              )}
            </div>

            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-2 border border-theme bg-surface rounded-2xl text-xs">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="rounded-lg border border-theme bg-hover disabled:opacity-40 px-2.5 py-1 text-[10px] font-bold"
                >
                  Prev
                </button>
                <span className="text-[10px] text-secondary font-semibold">Page {currentPage} of {totalPages}</span>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="rounded-lg border border-theme bg-hover disabled:opacity-40 px-2.5 py-1 text-[10px] font-bold"
                >
                  Next
                </button>
              </div>
            )}
          </div>

          {/* Details panel */}
          <div className="lg:col-span-2 space-y-4">
            {selectedAssignment ? (
              <div className="rounded-3xl border border-theme bg-surface p-6 space-y-6">
                <div>
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className="rounded-xl px-2.5 py-1 text-[10px] font-bold bg-violet-500/15 text-violet-400 uppercase tracking-wider">{selectedAssignment.subjectName}</span>
                    <span className="text-xs text-secondary font-medium">Max Marks: {selectedAssignment.maxMarks || "N/A"}</span>
                  </div>
                  <h2 className="text-lg font-black text-primary">{selectedAssignment.title}</h2>
                  <p className="mt-1 text-xs text-muted">Due: {new Date(selectedAssignment.dueDate).toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}</p>
                </div>

                {selectedAssignment.description && (
                  <div className="rounded-2xl bg-hover/40 p-4 border border-theme">
                    <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-1">Description</p>
                    <p className="text-xs text-primary leading-relaxed whitespace-pre-wrap">{selectedAssignment.description}</p>
                  </div>
                )}

                {/* Submissions Details */}
                {selectedSubmission ? (
                  <div className="space-y-4 pt-4 border-t border-theme">
                    <div className="rounded-2xl bg-emerald-500/5 border border-emerald-500/20 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">My Submission</p>
                        <span className="text-[10px] text-muted">Submitted: {new Date(selectedSubmission.submittedAt!).toLocaleString()}</span>
                      </div>
                      {selectedSubmission.content && (
                        <p className="text-xs text-primary bg-surface/50 rounded-xl p-3 border border-theme whitespace-pre-wrap mb-3">{selectedSubmission.content}</p>
                      )}
                      
                      {selectedSubmission.fileUrl && (
                        <div className="mt-3 p-3 bg-surface/30 border border-theme rounded-xl flex items-center justify-between flex-wrap gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">Attached Document Submission</span>
                          {(() => {
                            const url = selectedSubmission.fileUrl;
                            const isImage = url.startsWith("data:image/") ||
                              /\.(png|jpg|jpeg|gif|webp)$/i.test(url);
                            return isImage ? (
                              <img src={url} className="max-w-md max-h-60 rounded-xl object-contain border border-theme shadow-md" alt="Submission file" />
                            ) : (
                              <a
                                href={url}
                                download={`submission-${selectedAssignment.title}`}
                                className="rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-3.5 py-2 text-xs font-bold hover:bg-cyan-500/20 transition flex items-center gap-1.5"
                              >
                                📄 Download File Attachment
                              </a>
                            );
                          })()}
                        </div>
                      )}
                      
                      {selectedSubmission.isLate && (
                        <p className="mt-2 text-[10px] font-bold text-rose-400">⚠️ Submitted late</p>
                      )}
                    </div>

                    {selectedSubmission.grade && (
                      <div className="rounded-2xl bg-cyan-500/5 border border-cyan-500/20 p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Teacher Grade / Marks</p>
                          <span className="text-lg font-black text-accent">{selectedSubmission.grade} / {selectedAssignment.maxMarks || "100"}</span>
                        </div>
                        {selectedSubmission.feedback && (
                          <div>
                            <p className="text-[10px] font-bold text-secondary uppercase tracking-widest">Feedback</p>
                            <p className="text-xs text-primary italic">&ldquo;{selectedSubmission.feedback}&rdquo;</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4 pt-4 border-t border-theme">
                    <p className="text-xs font-bold text-secondary uppercase tracking-wider">Submit Homework</p>
                    {isOverdue && (
                      <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-[11px] font-semibold text-rose-400">
                        ⚠️ This assignment is past its due date. Submitting now will mark your work as LATE.
                      </div>
                    )}
                    <textarea
                      placeholder="Type or paste your assignment answer here..."
                      rows={6}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      className="w-full rounded-2xl border border-theme bg-hover p-4 text-xs text-primary focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 resize-none transition"
                    />
                    
                    {/* File Uploader */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">Attach File (PDF, DOCX, PNG, JPG, ZIP)</span>
                        {fileName && (
                          <button
                            onClick={handleRemoveFile}
                            className="text-[10px] font-bold text-rose-400 hover:underline"
                          >
                            Remove File
                          </button>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <label className="rounded-xl border border-theme bg-hover hover:bg-surface px-4 py-2 text-xs font-bold text-primary cursor-pointer transition">
                          Choose File
                          <input
                            type="file"
                            accept=".pdf,.docx,.png,.jpg,.jpeg,.zip"
                            className="hidden"
                            onChange={handleFileChange}
                          />
                        </label>
                        <span className="text-xs text-secondary truncate">
                          {fileName || "No file attached (Max 5MB)"}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        onClick={handleSubmit}
                        disabled={isPending}
                        className="rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white px-5 py-2.5 text-xs font-bold shadow-lg shadow-violet-500/25 transition disabled:opacity-50"
                      >
                        {isPending ? "Submitting..." : "Submit Answer"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-theme p-12 text-center max-w-md mx-auto">
          <p className="text-4xl mb-3">📝</p>
          <p className="text-sm font-bold text-primary">No Assignments</p>
          <p className="text-xs text-muted mt-1">There are no assignments posted for your class yet.</p>
        </div>
      )}
    </div>
  );
}
