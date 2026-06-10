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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      await action(formData);
      // refresh and toast on success
      router.refresh();
      toast.success('Class saved successfully');
      //  form when creating (no initial id)
      if (!initial.id) {
        try {
          event.currentTarget?.reset();
        } catch { }
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to save class.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-slate-900/60 p-4 rounded">
      {initial.id && <input type="hidden" name="id" value={String(initial.id)} />}

      <div>
        <label className="block text-sm font-medium mb-1">Name</label>
        <input
          name="name"
          defaultValue={initial.name}
          required
          className="w-full p-2 rounded border border-slate-700 bg-slate-950 text-white"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium mb-1">Section</label>
          <input
            name="section"
            defaultValue={initial.section}
            className="w-full p-2 rounded border border-slate-700 bg-slate-950 text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Academic Year</label>
          <input
            name="academicYear"
            defaultValue={initial.academicYear}
            className="w-full p-2 rounded border border-slate-700 bg-slate-950 text-white"
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
