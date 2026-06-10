"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

type Student = {
  id: number;
  name: string;
  rollNumber?: string | null;
  currentMark?: number;
};

type Props = {
  students: Student[];
  examId: number;
  action: (formData: FormData) => Promise<void>;
};

export default function MarksForm({ students, examId, action }: Props) {
  const [marks, setMarks] = useState<Record<number, string>>(
    students.reduce((acc, student) => {
      acc[student.id] = student.currentMark?.toString() ?? '';
      return acc;
    }, {} as Record<number, string>)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData();
    formData.set('examId', String(examId));

    students.forEach((student) => {
      formData.append('studentId', String(student.id));
      formData.set(`marks-${student.id}`, marks[student.id] || '0');
    });

    try {
      await action(formData);
      router.refresh();
      toast.success('Marks saved successfully');
    } catch (err: any) {
      setError(err?.message || 'Unable to save marks.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-slate-800 bg-slate-900/70 p-4">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-white">
          <thead className="bg-slate-950/80 text-slate-300">
            <tr>
              <th className="p-3">Student</th>
              <th className="p-3">Roll</th>
              <th className="p-3">Marks</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id} className="border-t border-slate-800">
                <td className="p-3">{student.name}</td>
                <td className="p-3">{student.rollNumber || '—'}</td>
                <td className="p-3">
                  <input
                    name={`marks-${student.id}`}
                    value={marks[student.id]}
                    onChange={(event) => setMarks((prev) => ({ ...prev, [student.id]: event.target.value }))}
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-24 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-white"
                  />
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
        {loading ? 'Saving...' : 'Save Marks'}
      </button>
    </form>
  );
}
