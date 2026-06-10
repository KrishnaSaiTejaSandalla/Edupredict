"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

type InitialValues = {
  id?: number;
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  qualification?: string;
  experience?: number;
  department?: string;
  employeeId?: string;
  joinDate?: string;
  schoolId?: number;
};

type Props = {
  action: (formData: FormData) => Promise<void>;
  initial?: InitialValues;
  submitLabel?: string;
};

export default function TeacherForm({ action, initial = {}, submitLabel = 'Save' }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      await action(formData);

      toast.success("Teacher created successfully");

      if (!initial.id) {
        form.reset();
      }

      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'Unable to save teacher.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-slate-900/60 p-4 rounded">
      {initial.id && <input type="hidden" name="id" value={String(initial.id)} />}

      <div>
        <label className="block text-sm font-medium mb-1">Full Name</label>
        <input
          name="fullName"
          defaultValue={initial.fullName}
          required
          className="w-full p-2 rounded border border-slate-700 bg-slate-950 text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Email</label>
        <input
          name="email"
          type="email"
          defaultValue={initial.email}
          required
          className="w-full p-2 rounded border border-slate-700 bg-slate-950 text-white"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium mb-1">Phone Number</label>
          <input
            name="phoneNumber"
            defaultValue={initial.phoneNumber}
            className="w-full p-2 rounded border border-slate-700 bg-slate-950 text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Employee ID</label>
          <input
            name="employeeId"
            defaultValue={initial.employeeId}
            className="w-full p-2 rounded border border-slate-700 bg-slate-950 text-white"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium mb-1">Qualification</label>
          <input
            name="qualification"
            defaultValue={initial.qualification}
            className="w-full p-2 rounded border border-slate-700 bg-slate-950 text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Department</label>
          <input
            name="department"
            defaultValue={initial.department}
            className="w-full p-2 rounded border border-slate-700 bg-slate-950 text-white"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="block text-sm font-medium mb-1">Experience</label>
          <input
            name="experience"
            type="number"
            min="0"
            defaultValue={initial.experience ?? ''}
            className="w-full p-2 rounded border border-slate-700 bg-slate-950 text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Join Date</label>
          <input
            name="joinDate"
            type="date"
            defaultValue={initial.joinDate}
            className="w-full p-2 rounded border border-slate-700 bg-slate-950 text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">School ID</label>
          <input
            name="schoolId"
            type="number"
            defaultValue={initial.schoolId ?? 1}
            className="w-full p-2 rounded border border-slate-700 bg-slate-950 text-white"
            readOnly
          />
        </div>
      </div>

      {error && <div className="text-red-400 text-sm">{error}</div>}

      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-500 disabled:opacity-50"
      >
        {loading ? 'Saving...' : submitLabel}
      </button>
    </form>
  );
}
