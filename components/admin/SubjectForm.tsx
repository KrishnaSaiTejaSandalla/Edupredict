"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

type InitialValues = {
  id?: number;
  name?: string;
  code?: string;
  description?: string;
  maxMarks?: number;
  passingMarks?: number;
};

type Props = {
  action: (formData: FormData) => Promise<void>;
  initial?: InitialValues;
  submitLabel?: string;
};

export default function SubjectForm({ action, initial = {}, submitLabel = 'Save' }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      await action(formData);
      toast.success("Subject saved successfully");
      if (!initial.id) form.reset();
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || 'Unable to save subject.');
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

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-1.5">Code</label>
        <input name="code" defaultValue={initial.code} required className="input-theme" />
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-1.5">Description</label>
        <textarea name="description" defaultValue={initial.description} rows={4} className="textarea-theme" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-1.5">Max Marks</label>
          <input name="maxMarks" type="number" step="0.01" defaultValue={initial.maxMarks ?? ''} className="input-theme" />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-1.5">Passing Marks</label>
          <input name="passingMarks" type="number" step="0.01" defaultValue={initial.passingMarks ?? ''} className="input-theme" />
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
