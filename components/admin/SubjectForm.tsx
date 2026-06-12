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

      if (!initial.id) {
        form.reset();
      }

      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || 'Unable to save subject.');
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

      <div>
        <label className="block text-sm font-medium mb-1">Code</label>
        <input
          name="code"
          defaultValue={initial.code}
          required
          className="w-full p-2 rounded border border-slate-700 bg-slate-950 text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <textarea
          name="description"
          defaultValue={initial.description}
          rows={4}
          className="w-full p-2 rounded border border-slate-700 bg-slate-950 text-white"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium mb-1">Max Marks</label>
          <input
            name="maxMarks"
            type="number"
            step="0.01"
            defaultValue={initial.maxMarks ?? ''}
            className="w-full p-2 rounded border border-slate-700 bg-slate-950 text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Passing Marks</label>
          <input
            name="passingMarks"
            type="number"
            step="0.01"
            defaultValue={initial.passingMarks ?? ''}
            className="w-full p-2 rounded border border-slate-700 bg-slate-950 text-white"
          />
        </div>
      </div>

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
