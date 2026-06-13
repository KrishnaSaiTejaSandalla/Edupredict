"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

type AttendanceStudent = {
  id: number;
  name: string;
  rollNumber?: string | null;
};

type Props = {
  students: AttendanceStudent[];
  existingStatus: Record<number, string>;
  action: (formData: FormData) => Promise<void>;
  classId: number;
  date: string;
};

export default function AttendanceForm({ students, existingStatus, action, classId, date }: Props) {
  const [statuses, setStatuses] = useState<Record<number, string>>(
    students.reduce((acc, student) => {
      acc[student.id] = existingStatus[student.id] || 'absent';
      return acc;
    }, {} as Record<number, string>)
  );
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    const formData = new FormData();
    formData.set('classId', String(classId));
    formData.set('date', date);

    students.forEach((student) => {
      formData.append('studentId', String(student.id));
      formData.set(`status-${student.id}`, statuses[student.id] || 'absent');
    });

    try {
      await action(formData);
      router.refresh();
      toast.success('Attendance saved successfully');
    } catch (err: any) {
      toast.error(err?.message || 'Unable to save attendance.');
    } finally {
      setLoading(false);
    }
  }

  function markAll(status: 'present' | 'absent') {
    const updated = { ...statuses };
    students.forEach((student) => {
      updated[student.id] = status;
    });
    setStatuses(updated);
    toast.success(`Marked all students as ${status}. Remember to save changes!`);
  }

  const getStatusStyle = (studentId: number, currentOption: string) => {
    const isSelected = statuses[studentId] === currentOption;
    if (!isSelected) {
      return "border border-border bg-background text-muted-foreground hover:bg-hover hover:text-foreground";
    }
    switch (currentOption) {
      case 'present':
        return "bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/30";
      case 'absent':
        return "bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/30";
      case 'late':
        return "bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/30";
      case 'excused':
        return "bg-blue-500/10 text-blue-500 dark:text-blue-400 border border-blue-500/30";
      default:
        return "bg-muted/10 text-muted-foreground border border-border";
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-md">
      {/* BULK ACTIONS & HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">Student Roll Call</h2>
          <p className="text-xs text-muted-foreground mt-1">Review and register daily student logs below.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => markAll('present')}
            className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-500 dark:text-emerald-400 hover:bg-emerald-500/20 transition-all active:scale-[0.98]"
          >
            ✓ Mark All Present
          </button>
          <button
            type="button"
            onClick={() => markAll('absent')}
            className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-xs font-bold text-rose-500 dark:text-rose-400 hover:bg-rose-500/20 transition-all active:scale-[0.98]"
          >
            ✕ Mark All Absent
          </button>
        </div>
      </div>

      {/* STUDENT TABLE */}
      <div className="overflow-auto rounded-xl border border-border bg-background">
        <table className="w-full text-left text-sm text-foreground">
          <thead className="border-b border-border bg-background/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="p-4 px-6">Student</th>
              <th className="p-4 px-6">Roll Number</th>
              <th className="p-4 px-6 text-right">Attendance Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-subtle">
            {students.length === 0 ? (
              <tr>
                <td colSpan={3} className="p-12 text-center text-muted-foreground font-medium">
                  No students assigned to this class.
                </td>
              </tr>
            ) : (
              students.map((student) => {
                const initial = student.name.charAt(0).toUpperCase();
                return (
                  <tr key={student.id} className="hover:bg-hover transition duration-200">
                    <td className="p-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/20 text-xs font-bold text-cyan-500 dark:text-cyan-300 border border-cyan-500/20">
                          {initial}
                        </div>
                        <span className="font-semibold text-foreground">{student.name}</span>
                      </div>
                    </td>
                    <td className="p-4 px-6 font-medium text-muted-foreground">{student.rollNumber || '—'}</td>
                    <td className="p-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {['present', 'absent', 'late', 'excused'].map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setStatuses((prev) => ({ ...prev, [student.id]: opt }))}
                            className={`rounded-lg px-3 py-1.5 text-xs font-bold capitalize transition-all ${getStatusStyle(student.id, opt)}`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* SAVE BUTTON */}
      <div className="flex justify-end pt-2 border-t border-border">
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl btn-emerald px-6 py-3 text-xs font-bold disabled:opacity-50"
        >
          {loading ? 'Saving Logs...' : 'Save Attendance Logs'}
        </button>
      </div>
    </form>
  );
}
