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
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
      toast.error(err?.message || 'Unable to save marks.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-theme bg-surface p-4">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-left">
          <thead className="bg-elevated">
            <tr>
              <th className="p-3 text-xs font-semibold uppercase tracking-wider text-secondary">Student</th>
              <th className="p-3 text-xs font-semibold uppercase tracking-wider text-secondary">Roll</th>
              <th className="p-3 text-xs font-semibold uppercase tracking-wider text-secondary">Marks</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id} className="border-t border-theme">
                <td className="p-3 text-sm text-primary">{student.name}</td>
                <td className="p-3 text-sm text-secondary">{student.rollNumber || '—'}</td>
                <td className="p-3">
                  <input
                    name={`marks-${student.id}`}
                    value={marks[student.id]}
                    onChange={(event) =>
                      setMarks((prev) => ({ ...prev, [student.id]: event.target.value }))
                    }
                    type="number"
                    min="0"
                    step="0.01"
                    className="input-theme w-24"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="rounded-xl btn-emerald px-5 py-2.5 text-xs font-bold disabled:opacity-50"
      >
        {loading ? 'Saving...' : 'Save Marks'}
      </button>
    </form>
  );
}
