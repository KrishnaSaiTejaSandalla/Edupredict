'use client';

import { useState, useEffect } from 'react';
import { toast } from "sonner";
import {
  getAllClasses,
  getExamsByClass,
  getStudentsByClass,
  getMarksByExam,
  saveMarks,
} from '@/lib/actions';

interface Class {
  id: number;
  name: string;
}

interface Exam {
  id: number;
  name: string;
  examDate: Date | string;
  maxMarks: string;
}

interface Student {
  id: number;
  userId: number;
  name: string;
  rollNumber: string;
}

export default function MarksPage() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [classId, setClassId] = useState('');
  const [examId, setExamId] = useState('');
  const [step, setStep] = useState(1);
  const [marks, setMarks] = useState<{ [key: number]: number }>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadClasses();
  }, []);

  async function loadClasses() {
    try {
      const classesData = await getAllClasses();
      setClasses(classesData);
    } catch (err) {
      console.error('Load error:', err);
    }
  }

  async function handleClassChange(cId: string) {
    setClassId(cId);
    setExamId('');
    setStep(1);
    setStudents([]);
    setMarks({});
    if (cId) {
      try {
        setLoading(true);
        const examsData = await getExamsByClass(Number(cId));
        setExams(examsData);
      } catch (err) {
        console.error('Error loading exams:', err);
      } finally {
        setLoading(false);
      }
    }
  }

  async function handleExamSelect(eId: string) {
    setExamId(eId);
    const exam = exams.find((e) => e.id === Number(eId));
    setSelectedExam(exam || null);

    if (eId && classId) {
      try {
        setLoading(true);
        const [studentsData, marksData] = await Promise.all([
          getStudentsByClass(Number(classId)),
          getMarksByExam(Number(eId)),
        ]);
        setStudents(studentsData);
        setMarks(marksData);
        setStep(2);
      } catch (err) {
        console.error('Error loading students:', err);
      } finally {
        setLoading(false);
      }
    }
  }

  async function handleSaveMarks() {
    if (!examId) {
      toast.error('Please select an exam');
      return;
    }

    const studentMarks = students
      .filter((s) => typeof marks[s.id] === 'number')
      .map((s) => ({
        studentId: s.id,
        marks: Number(marks[s.id]),
      }));

    if (studentMarks.length === 0) {
      toast.error('Please enter marks for at least one student');
      return;
    }

    try {
      setSaving(true);
      const maxMarks = Number(selectedExam?.maxMarks ?? 100);

      for (const item of studentMarks) {
        if (item.marks > maxMarks) {
          toast.error(`Marks cannot exceed ${maxMarks}`);
          return;
        }
      }
      await saveMarks({
        examId: Number(examId),
        studentMarks,
      });
      toast.success('Marks saved successfully!');
      setStep(1);
      setClassId('');
      setExamId('');
      setStudents([]);
      setMarks({});
    } catch (err: any) {
      toast.error(err.message || 'Failed to save marks');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen p-8 bg-[#070b16]">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">Tests</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Exam Marks Entry</h1>
          <p className="mt-2 text-sm text-slate-400">Quickly assign marks and keep exam records up to date.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Selected class</p>
            <p className="mt-2 font-medium text-white">{classId || 'None'}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Selected exam</p>
            <p className="mt-2 font-medium text-white">{selectedExam?.name || 'None'}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 shadow-2xl shadow-black/20">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Select Class & Exam</h2>
              <p className="text-sm text-slate-500">Choose the course and exam before entering student marks.</p>
            </div>
            {loading && <span className="text-sm text-cyan-300">Loading exams…</span>}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm text-slate-300">
              <span>Class</span>
              <select
                value={classId}
                onChange={(e) => handleClassChange(e.target.value)}
                className="h-12 w-full rounded-2xl border border-white/10 bg-[#0b1020] px-4 text-white outline-none"
              >
                <option value="">Select Class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm text-slate-300">
              <span>Exam</span>
              <select
                value={examId}
                onChange={(e) => handleExamSelect(e.target.value)}
                disabled={!classId || loading}
                className="h-12 w-full rounded-2xl border border-white/10 bg-[#0b1020] px-4 text-white outline-none disabled:opacity-50"
              >
                <option value="">Select Exam</option>
                {exams.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <aside className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 shadow-2xl shadow-black/20">
          <h2 className="text-lg font-semibold text-white">Exam Summary</h2>
          <div className="mt-4 grid gap-4">
            <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Class exams</p>
              <p className="mt-2 text-2xl font-semibold text-white">{exams.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Students loaded</p>
              <p className="mt-2 text-2xl font-semibold text-white">{students.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Entry step</p>
              <p className="mt-2 text-2xl font-semibold text-white">{step}</p>
            </div>
          </div>
        </aside>
      </div>

      {step === 2 && (
        <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.035] p-6 shadow-2xl shadow-black/20">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Enter marks</h2>
              <p className="text-sm text-slate-400">Update scores for each student in the selected exam.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <span className="rounded-2xl bg-cyan-500/10 px-4 py-2 text-sm text-cyan-200">Max marks: {selectedExam?.maxMarks || '100'}</span>
              <span className="rounded-2xl bg-white/5 px-4 py-2 text-sm text-slate-300">{students.length} students</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="border-b border-white/10 text-slate-400">
                <tr>
                  <th className="p-3">Roll No</th>
                  <th className="p-3">Student</th>
                  <th className="p-3">Marks</th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-6 text-center text-slate-400">
                      No students found for this class.
                    </td>
                  </tr>
                ) : (
                  students.map((student) => (
                    <tr key={student.id} className="border-t border-white/10 hover:bg-white/[0.03] transition">
                      <td className="p-3 text-white">{student.rollNumber}</td>
                      <td className="p-3">{student.name}</td>
                      <td className="p-3">
                        <input
                          type="number"
                          min="0"
                          max={Number(selectedExam?.maxMarks ?? 100)}
                          value={marks[student.id] ?? ''}
                          onChange={(e) =>
                            setMarks({
                              ...marks,
                              [student.id]: Number(e.target.value),
                            })
                          }
                          className="w-24 rounded-2xl border border-white/10 bg-[#0b1020] px-3 py-2 text-white outline-none"
                          placeholder={`0-${Number(selectedExam?.maxMarks ?? 100)}`}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={handleSaveMarks}
              disabled={saving}
              className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Marks'}
            </button>
            <button
              onClick={() => {
                setStep(1);
                setExamId('');
                setStudents([]);
                setMarks({});
              }}
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
            >
              Reset
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
