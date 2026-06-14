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
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      await action(formData);
      toast.success("Teacher created successfully");
      if (!initial.id) form.reset();
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || 'Unable to save teacher.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-surface p-4 rounded-xl border border-theme">
      {initial.id && <input type="hidden" name="id" value={String(initial.id)} />}

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-1.5">Full Name</label>
        <input name="fullName" defaultValue={initial.fullName} required className="input-theme" />
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-1.5">Email</label>
        <input name="email" type="email" defaultValue={initial.email} required className="input-theme" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-1.5">Phone Number</label>
          <input name="phoneNumber" defaultValue={initial.phoneNumber} className="input-theme" />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-1.5">Employee ID</label>
          <input name="employeeId" defaultValue={initial.employeeId} className="input-theme" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-1.5">Qualification</label>
          <input name="qualification" defaultValue={initial.qualification} className="input-theme" />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-1.5">Department</label>
          <input name="department" defaultValue={initial.department} className="input-theme" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-1.5">Experience (yrs)</label>
          <input name="experience" type="number" min="0" defaultValue={initial.experience ?? ''} className="input-theme" />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-1.5">Join Date</label>
          <input name="joinDate" type="date" defaultValue={initial.joinDate} className="input-theme" />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-1.5">School ID</label>
          <input name="schoolId" type="number" defaultValue={initial.schoolId ?? 1} className="input-theme" readOnly />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="rounded-xl btn-emerald px-5 py-2.5 text-xs font-bold disabled:opacity-50"
      >
        {loading ? 'Saving...' : submitLabel}
      </button>
    </form>
  );
}
