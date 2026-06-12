'use client';

import { useState, useEffect } from 'react';
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
  const [formData, setFormData] = useState({
    classId: '',
    subjectId: '',
    name: '',
    examDate: '',
    duration: '60',
    maxMarks: '',
  });

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

  async function handleDelete(id: number) {
    if (confirm('Delete this exam?')) {
      try {
        await deleteExam(id);
        toast.success("Exam deleted successfully");
        await loadData();
      } catch (err: any) {
        toast.error(err?.message || "Cannot delete exam because marks exist.");
      }
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-slate-400 font-medium animate-pulse flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
        Loading exams...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#070b16] p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Header Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-400">Tests</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">Exam Management</h1>
          <p className="mt-2 text-sm text-slate-400">Create, schedule, and manage academic tests.</p>
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
          className="rounded-xl bg-blue-500 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-400 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
        >
          {showForm ? 'Close Editor' : '+ Create Exam'}
        </button>
      </div>

      {/* Editor Modal/Panel */}
      {showForm && (
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/40 to-white/[0.035] p-6 shadow-2xl shadow-black/25 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white mb-6">
            {editingId ? 'Edit Scheduled Exam' : 'Create New Exam'}
          </h2>
          <form onSubmit={handleSubmit} className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Class</label>
              <select
                value={formData.classId}
                onChange={(e) => handleClassChange(e.target.value)}
                required
                className="h-11 w-full rounded-xl border border-white/10 bg-[#0b1020] px-3 text-sm text-white outline-none focus:border-cyan-400/50 cursor-pointer"
              >
                <option value="">Select Class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Subject</label>
              <select
                value={formData.subjectId}
                onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                required
                className="h-11 w-full rounded-xl border border-white/10 bg-[#0b1020] px-3 text-sm text-white outline-none focus:border-cyan-400/50 cursor-pointer"
              >
                <option value="">Select Subject</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Exam Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="h-11 w-full rounded-xl border border-white/10 bg-[#0b1020]/60 px-3 text-sm text-white outline-none focus:border-cyan-400/50"
                placeholder="e.g., Midterm Exam"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Exam Date</label>
              <input
                type="date"
                value={formData.examDate}
                onChange={(e) => setFormData({ ...formData, examDate: e.target.value })}
                required
                className="h-11 w-full rounded-xl border border-white/10 bg-[#0b1020]/60 px-3 text-sm text-white outline-none focus:border-cyan-400/50 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Duration (minutes)</label>
              <input
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                className="h-11 w-full rounded-xl border border-white/10 bg-[#0b1020]/60 px-3 text-sm text-white outline-none focus:border-cyan-400/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Max Marks</label>
              <input
                type="number"
                value={formData.maxMarks}
                onChange={(e) => setFormData({ ...formData, maxMarks: e.target.value })}
                required
                className="h-11 w-full rounded-xl border border-white/10 bg-[#0b1020]/60 px-3 text-sm text-white outline-none focus:border-cyan-400/50"
              />
            </div>

            <div className="md:col-span-2 flex gap-3 mt-4">
              <button
                type="submit"
                className="rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-400 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
              >
                Save Exam Record
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-xs font-bold text-white hover:bg-white/[0.08]"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Exams Data Table */}
      <div className="overflow-auto rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/40 to-white/[0.035] shadow-xl shadow-black/25">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="border-b border-white/10 bg-[#070b16]/40 text-xs font-semibold uppercase tracking-wider text-slate-400">
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
          <tbody className="divide-y divide-white/5">
            {exams.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-12 text-center text-slate-500 font-medium">
                  No exams currently scheduled. Click + Create Exam to add.
                </td>
              </tr>
            ) : (
              exams.map((exam) => (
                <tr key={exam.id} className="hover:bg-white/[0.02] transition duration-200">
                  <td className="p-4 px-6 font-semibold text-white">{exam.name}</td>
                  <td className="p-4 px-6 font-medium text-slate-400">{exam.className}</td>
                  <td className="p-4 px-6 font-medium text-slate-300">{exam.subjectName}</td>
                  <td className="p-4 px-6 font-medium text-white">
                    {new Date(exam.examDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td className="p-4 px-6 font-medium text-slate-400">{exam.duration} min</td>
                  <td className="p-4 px-6 font-semibold text-white">{exam.maxMarks}</td>
                  <td className="p-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* Edit */}
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
                        className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/5 bg-white/[0.04] text-slate-400 hover:text-amber-400 hover:border-amber-400/30 transition duration-150"
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z" />
                        </svg>
                      </button>
                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(exam.id)}
                        title="Delete"
                        className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/5 bg-white/[0.04] text-slate-400 hover:text-rose-400 hover:border-rose-400/30 transition duration-150"
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
    </main>
  );
}
