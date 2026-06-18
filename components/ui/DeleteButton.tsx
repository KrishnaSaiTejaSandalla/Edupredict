"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import DeleteConfirmModal from './DeleteConfirmModal';

type Props = {
  action: (formData: FormData) => Promise<void>;
  label?: string;
  id?: number;
};

export default function DeleteButton({ action, label = 'Delete', id }: Props) {
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  async function handleConfirm() {
    setIsOpen(false);
    setLoading(true);
    try {
      const fd = new FormData();
      fd.set('id', String(id));
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
    <>
      <button 
        type="button"
        onClick={() => setIsOpen(true)} 
        disabled={loading} 
        className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-500 disabled:opacity-50"
      >
        {loading ? 'Deleting...' : label}
      </button>

      <DeleteConfirmModal
        isOpen={isOpen}
        title="Confirm Deletion"
        message="Are you sure you want to delete this record? This action cannot be undone."
        onConfirm={handleConfirm}
        onCancel={() => setIsOpen(false)}
      />
    </>
  );
}
