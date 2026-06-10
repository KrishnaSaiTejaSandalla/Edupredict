"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

type Props = {
  action: (formData: FormData) => Promise<void>;
  label?: string;
};

export default function DeleteButton({ action, label = 'Delete' }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleClick() {
    if (!confirm('Are you sure? This action cannot be undone.')) return;
    setLoading(true);
    try {
      const fd = new FormData();
      await action(fd);
      toast.success('Deleted successfully');
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || 'Unable to delete');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={handleClick} disabled={loading} className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-500 disabled:opacity-50">
      {loading ? 'Deleting...' : label}
    </button>
  );
}
