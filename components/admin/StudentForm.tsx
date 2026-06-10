"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

type Props = {
  action: (formData: FormData) => Promise<void>;
  initial?: {
    id?: number;
    fullName?: string;
    admissionNumber?: string;
    rollNumber?: string;
    classId?: number;
    dateOfBirth?: string;
    gender?: string;
    parentName?: string;
    parentPhone?: string;
  };
  submitLabel?: string;
};

export default function StudentForm({ action, initial = {}, submitLabel = 'Save' }: Props) {
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
      toast.success('Student added successfully');
      
      
      if (!initial.id) {
        try {
          // event.currentTarget?.reset();
          form.reset();
        } catch (err: any) { 
          setError(err?.message || 'Unable to save student.'); }
      }

      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'Unable to save student.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 bg-slate-900/60 p-4 rounded">
      {initial.id && <input type="hidden" name="id" defaultValue={String(initial.id)} />}

      <div>
        <label className="block text-sm">Full Name</label>
        <input name="fullName" defaultValue={initial.fullName} required className="w-full p-2 rounded border" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm">Admission Number</label>
          <input name="admissionNumber" defaultValue={initial.admissionNumber} className="w-full p-2 rounded border" />
        </div>
        <div>
          <label className="block text-sm">Roll Number</label>
          <input name="rollNumber" defaultValue={initial.rollNumber} className="w-full p-2 rounded border" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm">Class</label>
          <input name="classId" defaultValue={initial.classId ? String(initial.classId) : ''} type="number" className="w-full p-2 rounded border" />
        </div>
        <div>
          <label className="block text-sm">Date of Birth</label>
          <input name="dateOfBirth" defaultValue={initial.dateOfBirth} type="date" className="w-full p-2 rounded border" />
        </div>
        <div>
          <label className="block text-sm">Gender</label>
          <select name="gender" defaultValue={initial.gender || ''} className="w-full p-2 rounded border">
            <option value="">Select</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm">Parent Name</label>
          <input name="parentName" defaultValue={initial.parentName} className="w-full p-2 rounded border" />
        </div>
        <div>
          <label className="block text-sm">Parent Phone</label>
          <input name="parentPhone" defaultValue={initial.parentPhone} className="w-full p-2 rounded border" />
        </div>
      </div>

      <div>
        {error && <div className="text-red-400 text-sm">{error}</div>}
        <button type="submit" disabled={loading} className="px-4 py-2 bg-emerald-600 text-white rounded">{loading ? 'Saving...' : submitLabel}</button>
      </div>
    </form>
  );
}
