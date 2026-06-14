"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

type InitialValues = {
  id?: number;
  name?: string;
  section?: string;
  academicYear?: string;
};

type Props = {
  action: (formData: FormData) => Promise<void>;
  initial?: InitialValues;
  submitLabel?: string;
  successMessage?: string;
};

export default function ClassForm({ action, initial = {}, submitLabel = 'Save' }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      await action(formData);
      router.refresh();
      toast.success('Class saved successfully');
      if (!initial.id) {
        try { event.currentTarget?.reset(); } catch { }
      }
    } catch (err: any) {
      toast.error(err?.message || 'Unable to save class.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-surface p-4 rounded-xl border border-theme">
      {initial.id && <input type="hidden" name="id" value={String(initial.id)} />}

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-1.5">Name</label>
        <input name="name" defaultValue={initial.name} required className="input-theme" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-1.5">Section</label>
          <input name="section" defaultValue={initial.section} className="input-theme" />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-1.5">Academic Year</label>
          <input name="academicYear" defaultValue={initial.academicYear} className="input-theme" />
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
