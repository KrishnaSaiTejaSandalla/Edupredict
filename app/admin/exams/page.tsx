'use client';

import { useState, useEffect, useCallback } from 'react';
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal';
import { toast } from "sonner";
import { createExam, getAllExams, updateExam, deleteExam, getAllClasses, getSubjectsByClass } from '@/lib/actions';

interface Exam {
  id: number;
  classId: number;
  subjectId: number;
  name: string;
  examDate: Date | string;
  duration: number;
  maxMarks: string;
  className: string;
  subjectName: string;
}

interface Class {
  id: number;
  name: string;
  section: string | null;
}

interface Subject {
  id: number;
  name: string;
}

export default function ExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [formData, setFormData] = useState({
    classId: '',
    subjectId: '',
    name: '',
    examDate: '',
    duration: '60',
    maxMarks: '',
  });
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [examsData, classesData] = await Promise.all([
        getAllExams(),
        getAllClasses(),
      ]);
      setExams(examsData);
      setClasses(classesData);
    } catch (err) {
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleClassChange(classId: string) {
    setFormData({ ...formData, classId, subjectId: '' });
    if (classId) {
      const subjectsData = await getSubjectsByClass(Number(classId));
      setSubjects(subjectsData);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const examDate = new Date(formData.examDate);
      const maxMarks = Number(formData.maxMarks);

      if (editingId) {
        await updateExam(editingId, {
          classId: Number(formData.classId),
          subjectId: Number(formData.subjectId),
          name: formData.name,
          examDate,
          duration: Number(formData.duration),
          maxMarks,
        });
        toast.success("Exam updated successfully");
      } else {
        await createExam({
          classId: Number(formData.classId),
          subjectId: Number(formData.subjectId),
          name: formData.name,
          examDate,
          duration: Number(formData.duration),
          maxMarks,
        });
        toast.success("Exam saved successfully");
      }

      setFormData({
        classId: '',
        subjectId: '',
        name: '',
        examDate: '',
        duration: '60',
        maxMarks: '',
      });
      setEditingId(null);
      setShowForm(false);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save exam');
    }
  }

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteExam(deleteTarget.id);
      toast.success("Exam deleted successfully");
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || "Cannot delete exam because marks exist.");
    } finally {
      setDeleteTarget(null);
    }
  }, [deleteTarget]);

  // Filter out exams where examDate < today (archives past exams)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeExams = exams.filter((exam) => {
    const examDate = new Date(exam.examDate);
    return examDate >= today;
  });

  const itemsPerPage = 10;
  const totalPages = Math.ceil(activeExams.length / itemsPerPage);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedExams = activeExams.slice(startIndex, startIndex + itemsPerPage);

  if (loading) {
    return (
      <div className="p-8 text-muted-foreground font-medium animate-pulse flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
        Loading exams...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Header Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-500 dark:text-cyan-400">Tests</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Exam Management</h1>
          <p className="mt-2 text-sm text-muted-foreground">Create, schedule, and manage academic tests.</p>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditingId(null);
            setFormData({
              classId: '',
              subjectId: '',
              name: '',
              examDate: '',
              duration: '60',
              maxMarks: '',
            });
          }}
          className="rounded-xl btn-blue px-5 py-3 text-xs font-bold"
        >
          {showForm ? 'Close Editor' : '+ Create Exam'}
        </button>
      </div>

      {/* Editor Modal/Panel */}
      {showForm && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-md animate-in fade-in slide-in-from-bottom-2 duration-300">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground mb-6">
            {editingId ? 'Edit Scheduled Exam' : 'Create New Exam'}
          </h2>
          <form onSubmit={handleSubmit} className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Class</label>
              <select value={formData.classId} onChange={(e) => handleClassChange(e.target.value)} required className="select-theme">
                <option value="">Select Class</option>
                {classes.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Subject</label>
              <select value={formData.subjectId} onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })} required className="select-theme">
                <option value="">Select Subject</option>
                {subjects.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Exam Name</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="input-theme" placeholder="e.g., Midterm Exam" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Exam Date</label>
              <input type="date" value={formData.examDate} onChange={(e) => setFormData({ ...formData, examDate: e.target.value })} required className="input-theme" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Duration (minutes)</label>
              <input type="number" value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: e.target.value })} className="input-theme" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Max Marks</label>
              <input type="number" value={formData.maxMarks} onChange={(e) => setFormData({ ...formData, maxMarks: e.target.value })} required className="input-theme" />
            </div>
            <div className="md:col-span-2 flex gap-3 mt-4">
              <button type="submit" className="rounded-xl btn-emerald px-5 py-2.5 text-xs font-bold">Save Exam Record</button>
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="rounded-xl border border-border bg-background px-5 py-2.5 text-xs font-bold text-foreground hover:bg-hover">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Exams Data Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-md">
        <table className="w-full text-left text-sm text-foreground">
          <thead className="border-b border-border bg-background/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="p-4 px-6">Exam Name</th>
              <th className="p-4 px-6">Class</th>
              <th className="p-4 px-6">Subject</th>
              <th className="p-4 px-6">Date</th>
              <th className="p-4 px-6">Duration</th>
              <th className="p-4 px-6">Max Marks</th>
              <th className="p-4 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-subtle">
            {paginatedExams.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-12 text-center text-muted-foreground font-medium">
                  No exams currently scheduled. Click + Create Exam to add.
                </td>
              </tr>
            ) : (
              paginatedExams.map((exam) => (
                <tr key={exam.id} className="hover:bg-hover transition duration-200">
                  <td className="p-4 px-6 font-semibold text-foreground">{exam.name}</td>
                  <td className="p-4 px-6 font-medium text-muted-foreground">{exam.className}</td>
                  <td className="p-4 px-6 font-medium text-foreground">{exam.subjectName}</td>
                  <td className="p-4 px-6 font-medium text-foreground">
                    {new Date(exam.examDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td className="p-4 px-6 font-medium text-muted-foreground">{exam.duration} min</td>
                  <td className="p-4 px-6 font-semibold text-foreground">{exam.maxMarks}</td>
                  <td className="p-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={async () => {
                          const subjectsData = await getSubjectsByClass(exam.classId);
                          setSubjects(subjectsData);
                          setEditingId(exam.id);
                          setFormData({
                            classId: exam.classId.toString(),
                            subjectId: exam.subjectId.toString(),
                            name: exam.name,
                            examDate: new Date(exam.examDate).toISOString().split("T")[0],
                            duration: String(exam.duration),
                            maxMarks: String(exam.maxMarks),
                          });
                          setShowForm(true);
                        }}
                        title="Edit"
                        className="flex h-8 w-8 items-center justify-center rounded-xl border border-subtle bg-hover text-muted-foreground hover:text-amber-400 hover:border-amber-400/30 transition duration-150"
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeleteTarget({ id: exam.id, name: exam.name })}
                        title="Delete"
                        className="flex h-8 w-8 items-center justify-center rounded-xl border border-subtle bg-hover text-muted-foreground hover:text-rose-400 hover:border-rose-400/30 transition duration-150"
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground pt-4 border-t border-border mt-4 w-full">
          <div>
            {currentPage > 1 && (
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                className="rounded-xl border border-border bg-card px-4 py-2.5 hover:bg-hover transition duration-150 text-foreground"
              >
                ← Previous
              </button>
            )}
          </div>
          <span className="tabular-nums">Page {currentPage} of {totalPages}</span>
          <div>
            {currentPage < totalPages && (
              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                className="rounded-xl border border-border bg-card px-4 py-2.5 hover:bg-hover transition duration-150 text-foreground"
              >
                Next →
              </button>
            )}
          </div>
        </div>
      )}

      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Exam?"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </main>
  );
}
