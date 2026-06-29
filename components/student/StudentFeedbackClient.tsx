"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import DeleteConfirmModal from "@/components/ui/DeleteConfirmModal";
import { submitFeedback, deleteFeedback } from "@/lib/feedback-actions";
import CustomSelect from "../ui/CustomSelect";

type FeedbackHistory = {
  id: number;
  userId: number;
  schoolId: number;
  title: string;
  message: string;
  category: string;
  createdAt: Date | string;
};

type Props = {
  initialHistory: FeedbackHistory[];
  schoolConfig: {
    monthlyFeedbackOpen: boolean;
    teacherFeedbackOpen: boolean;
    schoolSurveyOpen: boolean;
  };
  teachers: { id: number; name: string; subjectName: string | null }[];
};

const inputCls = "w-full rounded-xl border border-theme bg-hover p-2.5 text-xs text-primary focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 placeholder:text-muted";
const labelCls = "block text-[10px] font-bold uppercase tracking-wider text-secondary mb-1.5";

function StarRating({ value, onChange }: { value: number; onChange: (val: number) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className={`text-2xl transition-transform active:scale-95 ${star <= value ? "text-amber-400" : "text-muted hover:text-amber-300"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

import { submitTeacherFeedbackAction } from "@/lib/feedback-actions";

export default function StudentFeedbackClient({ initialHistory, schoolConfig, teachers }: Props) {
  const [history, setHistory] = useState<FeedbackHistory[]>(initialHistory);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<"general" | "teacher" | "monthly" | "school">("general");
  const [isPending, startTransition] = useTransition();

  // General Form State
  const [generalData, setGeneralData] = useState({
    title: "",
    category: "Academic",
    message: "",
  });

  // Teacher Form State
  const [teacherData, setTeacherData] = useState({
    teacherId: "",
    rating: 5,
    comment: "",
    category: "overall",
  });

  // Monthly Form State
  const [monthlyData, setMonthlyData] = useState({
    understanding: 5,
    workload: 3,
    comment: "",
  });

  // School Form State
  const [schoolData, setSchoolData] = useState({
    facilities: 5,
    activities: 5,
    safety: 5,
    suggestions: "",
  });

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [feedbackToDelete, setFeedbackToDelete] = useState<{ id: number; title: string } | null>(null);

  const reloadData = async () => {
    try {
      const res = await fetch("/api/feedback/my-feedback");
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error("Failed to refresh feedback history:", err);
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setGeneralData({ title: "", category: "Academic", message: "" });
    setTeacherData({ teacherId: "", rating: 5, comment: "", category: "overall" });
    setMonthlyData({ understanding: 5, workload: 3, comment: "" });
    setSchoolData({ facilities: 5, activities: 5, safety: 5, suggestions: "" });
  };

  const handleGeneralSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!generalData.title || !generalData.message) {
      toast.error("Please fill in all required fields.");
      return;
    }

    startTransition(async () => {
      try {
        await submitFeedback({
          title: generalData.title,
          category: generalData.category,
          message: generalData.message,
        });
        toast.success("Feedback submitted successfully. 🚀");
        closeForm();
        await reloadData();
      } catch (err: any) {
        toast.error(err.message || "Failed to submit feedback.");
      }
    });
  };

  const handleTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherData.teacherId) {
      toast.error("Please select a teacher.");
      return;
    }
    if (!teacherData.comment.trim() || teacherData.comment.trim().length < 5) {
      toast.error("Please write a comment of at least 5 characters.");
      return;
    }

    startTransition(async () => {
      try {
        await submitTeacherFeedbackAction({
          teacherId: Number(teacherData.teacherId),
          rating: teacherData.rating,
          comment: teacherData.comment,
          category: teacherData.category,
        });
        toast.success("Teacher feedback submitted successfully! 🚀");
        closeForm();
        await reloadData();
      } catch (err: any) {
        toast.error(err.message || "Failed to submit feedback.");
      }
    });
  };

  const handleMonthlySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!monthlyData.comment.trim()) {
      toast.error("Please write feedback comments.");
      return;
    }

    const messageMarkdown = `### Monthly Survey Feedback
- **Understanding of subjects**: ${monthlyData.understanding}/5
- **Homework workload**: ${monthlyData.workload}/5
- **Comments**: ${monthlyData.comment}`;

    startTransition(async () => {
      try {
        await submitFeedback({
          title: "Monthly Survey Responses",
          category: "Monthly Survey",
          message: messageMarkdown,
        });
        toast.success("Monthly survey submitted! 🎉");
        closeForm();
        await reloadData();
      } catch (err: any) {
        toast.error(err.message || "Failed to submit survey.");
      }
    });
  };

  const handleSchoolSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolData.suggestions.trim()) {
      toast.error("Please write suggestions.");
      return;
    }

    const messageMarkdown = `### School Survey Feedback
- **School facilities**: ${schoolData.facilities}/5
- **Extracurricular activities**: ${schoolData.activities}/5
- **Safety**: ${schoolData.safety}/5
- **Suggestions**: ${schoolData.suggestions}`;

    startTransition(async () => {
      try {
        await submitFeedback({
          title: "School Survey Responses",
          category: "School Survey",
          message: messageMarkdown,
        });
        toast.success("School survey submitted! 🌟");
        closeForm();
        await reloadData();
      } catch (err: any) {
        toast.error(err.message || "Failed to submit survey.");
      }
    });
  };

  const handleDeleteClick = (item: FeedbackHistory) => {
    setFeedbackToDelete({ id: item.id, title: item.title });
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!feedbackToDelete) return;
    setDeleteModalOpen(false);
    startTransition(async () => {
      try {
        await deleteFeedback(feedbackToDelete.id);
        toast.success("Feedback deleted successfully.");
        await reloadData();
      } catch (err: any) {
        toast.error(err.message || "Failed to delete feedback.");
      } finally {
        setFeedbackToDelete(null);
      }
    });
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "Academic":
        return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
      case "Transport":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      case "Facilities":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "Administration":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "Monthly Survey":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "School Survey":
        return "bg-orange-500/10 text-orange-400 border-orange-500/20";
      default:
        return "bg-violet-500/10 text-violet-400 border-violet-500/20";
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-violet-400">
            Student Portal
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-primary">
            My Feedback & Surveys
          </h1>
          <p className="mt-2 text-sm text-secondary">
            Submit reviews or comments regarding course sessions, transit services, or campus facilities.
          </p>
        </div>

        <button
          onClick={() => (showForm ? closeForm() : setShowForm(true))}
          className="rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white px-5 py-3 text-xs font-bold whitespace-nowrap self-start sm:self-auto transition-all duration-200 shadow-lg shadow-violet-500/25"
        >
          {showForm ? "Close Panel" : "+ Submit Feedback"}
        </button>
      </div>

      {/* Form Card */}
      {showForm && (
        <div className="rounded-3xl border border-theme bg-surface p-6 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
          {/* Tabs header inside form */}
          <div className="flex flex-wrap gap-2 border-b border-theme pb-4">
            {(["general", "teacher", "monthly", "school"] as const).map((tab) => {
              const tabLabels = {
                general: "General Feedback",
                teacher: "Teacher Feedback",
                monthly: "Monthly Survey",
                school: "School Survey",
              };
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-xl px-4 py-2 text-xs font-bold transition-all duration-200 border ${
                    activeTab === tab
                      ? "bg-violet-500/20 text-violet-400 border-violet-500/30 shadow-sm"
                      : "bg-hover text-secondary border-transparent hover:text-primary"
                  }`}
                >
                  {tabLabels[tab]}
                </button>
              );
            })}
          </div>

          {/* Tab Contents */}
          {activeTab === "general" && (
            <form onSubmit={handleGeneralSubmit} className="grid gap-5 md:grid-cols-2">
              <div>
                <label className={labelCls}>Title *</label>
                <input
                  type="text"
                  value={generalData.title}
                  onChange={(e) => setGeneralData({ ...generalData, title: e.target.value })}
                  required
                  className={inputCls}
                  placeholder="e.g. Lab Equipment Issue"
                />
              </div>

              <div>
                <label className={labelCls}>Category *</label>
                <CustomSelect
                  options={[
                    { value: "Academic", label: "Academic" },
                    { value: "Facilities", label: "Facilities" },
                    { value: "Transport", label: "Transport" },
                    { value: "Administration", label: "Administration" },
                    { value: "Other", label: "Other" },
                  ]}
                  value={generalData.category}
                  onChange={(val) => setGeneralData({ ...generalData, category: String(val) })}
                  className="w-full"
                />
              </div>

              <div className="md:col-span-2">
                <label className={labelCls}>Your Message *</label>
                <textarea
                  value={generalData.message}
                  onChange={(e) => setGeneralData({ ...generalData, message: e.target.value })}
                  placeholder="Enter feedback details (minimum 10 characters)..."
                  className="w-full min-h-[120px] p-4 rounded-xl border border-theme bg-hover text-xs text-primary focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 resize-none transition placeholder:text-muted"
                  required
                />
              </div>

              <div className="md:col-span-2 flex gap-3 mt-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-5 py-2.5 text-xs font-bold disabled:opacity-50 shadow-md"
                >
                  {isPending ? "Submitting..." : "Send General Feedback"}
                </button>
              </div>
            </form>
          )}

          {activeTab === "teacher" && (
            schoolConfig.teacherFeedbackOpen ? (
              <form onSubmit={handleTeacherSubmit} className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className={labelCls}>Select Teacher *</label>
                  <CustomSelect
                    options={[
                      { value: "", label: "Choose a teacher..." },
                      ...teachers.map(t => ({ value: String(t.id), label: `${t.name} (${t.subjectName || 'Subject'})` }))
                    ]}
                    value={teacherData.teacherId}
                    onChange={(val) => setTeacherData({ ...teacherData, teacherId: String(val) })}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className={labelCls}>Feedback Category *</label>
                  <CustomSelect
                    options={[
                      { value: "teaching_clarity", label: "Teaching Clarity" },
                      { value: "engagement", label: "Student Engagement" },
                      { value: "support", label: "Academic Support" },
                      { value: "overall", label: "Overall Satisfaction" },
                    ]}
                    value={teacherData.category}
                    onChange={(val) => setTeacherData({ ...teacherData, category: String(val) })}
                    className="w-full"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className={labelCls}>Rating *</label>
                  <StarRating
                    value={teacherData.rating}
                    onChange={(val) => setTeacherData({ ...teacherData, rating: val })}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className={labelCls}>Comments *</label>
                  <textarea
                    value={teacherData.comment}
                    onChange={(e) => setTeacherData({ ...teacherData, comment: e.target.value })}
                    placeholder="Provide constructive comments for this teacher..."
                    className="w-full min-h-[120px] p-4 rounded-xl border border-theme bg-hover text-xs text-primary focus:outline-none focus:ring-1 focus:ring-violet-500 resize-none transition placeholder:text-muted"
                    required
                  />
                </div>

                <div className="md:col-span-2 flex gap-3 mt-2">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-5 py-2.5 text-xs font-bold disabled:opacity-50 shadow-md"
                  >
                    {isPending ? "Submitting..." : "Send Teacher Feedback"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-8 text-center max-w-md mx-auto">
                <p className="text-3xl mb-2">🔒</p>
                <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">Teacher Feedback Closed</p>
                <p className="text-[11px] text-secondary mt-1">This survey is not currently accepting submissions from students.</p>
              </div>
            )
          )}

          {activeTab === "monthly" && (
            schoolConfig.monthlyFeedbackOpen ? (
              <form onSubmit={handleMonthlySubmit} className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className={labelCls}>Understanding of Subjects *</label>
                  <StarRating
                    value={monthlyData.understanding}
                    onChange={(val) => setMonthlyData({ ...monthlyData, understanding: val })}
                  />
                  <span className="text-[9px] text-muted mt-1 block">1 = Poor, 5 = Excellent</span>
                </div>

                <div>
                  <label className={labelCls}>Homework workload *</label>
                  <StarRating
                    value={monthlyData.workload}
                    onChange={(val) => setMonthlyData({ ...monthlyData, workload: val })}
                  />
                  <span className="text-[9px] text-muted mt-1 block">1 = Light, 5 = Heavy</span>
                </div>

                <div className="md:col-span-2">
                  <label className={labelCls}>Monthly Comments & Concerns *</label>
                  <textarea
                    value={monthlyData.comment}
                    onChange={(e) => setMonthlyData({ ...monthlyData, comment: e.target.value })}
                    placeholder="Share comments on this month's learning progress..."
                    className="w-full min-h-[120px] p-4 rounded-xl border border-theme bg-hover text-xs text-primary focus:outline-none focus:ring-1 focus:ring-violet-500 resize-none transition placeholder:text-muted"
                    required
                  />
                </div>

                <div className="md:col-span-2 flex gap-3 mt-2">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-5 py-2.5 text-xs font-bold disabled:opacity-50 shadow-md"
                  >
                    {isPending ? "Submitting..." : "Send Monthly Survey"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-8 text-center max-w-md mx-auto">
                <p className="text-3xl mb-2">🔒</p>
                <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">Monthly Survey Closed</p>
                <p className="text-[11px] text-secondary mt-1">This month&apos;s academic survey is not currently accepting submissions.</p>
              </div>
            )
          )}

          {activeTab === "school" && (
            schoolConfig.schoolSurveyOpen ? (
              <form onSubmit={handleSchoolSubmit} className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className={labelCls}>School Facilities *</label>
                  <StarRating
                    value={schoolData.facilities}
                    onChange={(val) => setSchoolData({ ...schoolData, facilities: val })}
                  />
                </div>

                <div>
                  <label className={labelCls}>Extracurricular Activities *</label>
                  <StarRating
                    value={schoolData.activities}
                    onChange={(val) => setSchoolData({ ...schoolData, activities: val })}
                  />
                </div>

                <div>
                  <label className={labelCls}>Feeling of Safety *</label>
                  <StarRating
                    value={schoolData.safety}
                    onChange={(val) => setSchoolData({ ...schoolData, safety: val })}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className={labelCls}>Suggestions for School Improvement *</label>
                  <textarea
                    value={schoolData.suggestions}
                    onChange={(e) => setSchoolData({ ...schoolData, suggestions: e.target.value })}
                    placeholder="Provide your ideas, critiques, or suggestions..."
                    className="w-full min-h-[120px] p-4 rounded-xl border border-theme bg-hover text-xs text-primary focus:outline-none focus:ring-1 focus:ring-violet-500 resize-none transition placeholder:text-muted"
                    required
                  />
                </div>

                <div className="md:col-span-2 flex gap-3 mt-2">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-5 py-2.5 text-xs font-bold disabled:opacity-50 shadow-md"
                  >
                    {isPending ? "Submitting..." : "Send School Survey"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-8 text-center max-w-md mx-auto">
                <p className="text-3xl mb-2">🔒</p>
                <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">School Survey Closed</p>
                <p className="text-[11px] text-secondary mt-1">The general school survey is not currently accepting submissions.</p>
              </div>
            )
          )}
        </div>
      )}

      {/* History Feed */}
      {history.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-theme p-12 text-center text-sm font-medium text-muted max-w-md mx-auto">
          No feedback records submitted yet. Click + Submit Feedback to share one.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 animate-in fade-in duration-300">
          {history.map((item) => (
            <div
              key={item.id}
              className="group relative rounded-2xl border border-theme bg-surface hover:bg-hover p-6 shadow-sm transition duration-150 flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start gap-4">
                  <div className="min-w-0">
                    <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${getCategoryBadge(item.category)}`}>
                      {item.category}
                    </span>
                    <h3 className="text-xs font-bold text-primary mt-2 group-hover:text-violet-400 transition truncate" title={item.title}>
                      {item.title}
                    </h3>
                  </div>

                  <button
                    onClick={() => handleDeleteClick(item)}
                    title="Delete Feedback"
                    className="opacity-0 group-hover:opacity-100 flex h-7 w-7 items-center justify-center rounded-lg border border-theme bg-surface text-muted hover:text-rose-500 hover:border-rose-500/30 transition duration-150 shrink-0"
                  >
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6" />
                    </svg>
                  </button>
                </div>

                <p className="mt-4 text-xs text-secondary leading-relaxed whitespace-pre-wrap">
                  {item.message}
                </p>
              </div>

              <div className="mt-6 border-t border-theme pt-4 flex items-center justify-between text-[10px] text-muted">
                <span>Submitted</span>
                <span>
                  {new Date(item.createdAt).toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        title="Delete Your Feedback?"
        message={`Are you sure you want to permanently remove your feedback submission "${feedbackToDelete?.title}"?`}
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteModalOpen(false);
          setFeedbackToDelete(null);
        }}
      />
    </div>
  );
}
