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
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
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
      setError(err?.message || 'Unable to save attendance.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-slate-800 bg-slate-900/70 p-4">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-white">
          <thead className="bg-slate-950/80 text-slate-300">
            <tr>
              <th className="p-3">Student</th>
              <th className="p-3">Roll</th>
              <th className="p-3">Attendance</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id} className="border-t border-slate-800">
                <td className="p-3">{student.name}</td>
                <td className="p-3">{student.rollNumber || '—'}</td>
                <td className="p-3 space-x-4">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name={`status-${student.id}`}
                      value="present"
                      checked={statuses[student.id] === 'present'}
                      onChange={() => setStatuses((prev) => ({ ...prev, [student.id]: 'present' }))}
                    />
                    Present
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name={`status-${student.id}`}
                      value="absent"
                      checked={statuses[student.id] === 'absent'}
                      onChange={() => setStatuses((prev) => ({ ...prev, [student.id]: 'absent' }))}
                    />
                    Absent
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && <div className="text-red-400 text-sm">{error}</div>}
      <button
        type="submit"
        disabled={loading}
        className="rounded bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-500 disabled:opacity-50"
      >
        {loading ? 'Saving...' : 'Save Attendance'}
      </button>
    </form>
  );
}
