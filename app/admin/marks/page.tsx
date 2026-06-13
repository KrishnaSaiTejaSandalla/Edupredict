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
    <main className="min-h-screen p-8 bg-background text-foreground">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-500 dark:text-cyan-300">Tests</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Exam Marks Entry</h1>
          <p className="mt-2 text-sm text-muted-foreground">Quickly assign marks and keep exam records up to date.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-4 text-sm text-foreground">
            <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Selected class</p>
            <p className="mt-2 font-medium text-foreground">{classId || 'None'}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 text-sm text-foreground">
            <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Selected exam</p>
            <p className="mt-2 font-medium text-foreground">{selectedExam?.name || 'None'}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <section className="rounded-3xl border border-border bg-card p-6 shadow-md">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Select Class &amp; Exam</h2>
              <p className="text-sm text-muted-foreground">Choose the course and exam before entering student marks.</p>
            </div>
            {loading && <span className="text-sm text-cyan-500 dark:text-cyan-300">Loading exams…</span>}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm text-foreground">
              <span>Class</span>
              <select value={classId} onChange={(e) => handleClassChange(e.target.value)} className="select-theme">
                <option value="">Select Class</option>
                {classes.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
            </label>
            <label className="space-y-2 text-sm text-foreground">
              <span>Exam</span>
              <select value={examId} onChange={(e) => handleExamSelect(e.target.value)} disabled={!classId || loading} className="select-theme disabled:opacity-50">
                <option value="">Select Exam</option>
                {exams.map((e) => (<option key={e.id} value={e.id}>{e.name}</option>))}
              </select>
            </label>
          </div>
        </section>

        <aside className="rounded-3xl border border-border bg-card p-6 shadow-md">
          <h2 className="text-lg font-semibold text-foreground">Exam Summary</h2>
          <div className="mt-4 grid gap-4">
            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Class exams</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{exams.length}</p>
            </div>
            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Students loaded</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{students.length}</p>
            </div>
            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Entry step</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{step}</p>
            </div>
          </div>
        </aside>
      </div>

      {step === 2 && (
        <section className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-md">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Enter marks</h2>
              <p className="text-sm text-muted-foreground">Update scores for each student in the selected exam.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <span className="rounded-2xl px-4 py-2 bg-slate-200 text-slate-700 dark:bg-cyan-500/10 dark:text-cyan-300">Max marks: {selectedExam?.maxMarks || '100'}</span>
              <span className="rounded-2xl bg-hover px-4 py-2 text-sm text-foreground border border-border">{students.length} students</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-foreground">
              <thead className="border-b border-border text-muted-foreground">
                <tr>
                  <th className="p-3">Roll No</th>
                  <th className="p-3">Student</th>
                  <th className="p-3">Marks</th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-6 text-center text-muted-foreground">
                      No students found for this class.
                    </td>
                  </tr>
                ) : (
                  students.map((student) => (
                    <tr key={student.id} className="border-t border-border hover:bg-hover transition">
                      <td className="p-3 text-foreground">{student.rollNumber}</td>
                      <td className="p-3">{student.name}</td>
                      <td className="p-3">
                        <input
                          type="number"
                          min="0"
                          max={Number(selectedExam?.maxMarks ?? 100)}
                          value={marks[student.id] ?? ''}
                          onChange={(e) => setMarks({ ...marks, [student.id]: Number(e.target.value) })}
                          className="w-24 rounded-2xl border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-cyan-500"
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
            <button onClick={handleSaveMarks} disabled={saving} className="rounded-2xl btn-emerald px-5 py-3 text-sm font-semibold disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Marks'}
            </button>
            <button onClick={() => { setStep(1); setExamId(''); setStudents([]); setMarks({}); }} className="rounded-2xl border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-hover">
              Reset
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
