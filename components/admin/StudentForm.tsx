"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

type Props = {
  action: (formData: FormData) => Promise<void>;
  initial?: {
    id?: number;
    fullName?: string;
    email?: string;
    admissionNumber?: string;
    rollNumber?: string;
    classId?: number;
    dateOfBirth?: string;
    gender?: string;
    parentName?: string;
    parentPhone?: string;
    parentEmail?: string;
  };
  submitLabel?: string;
};

export default function StudentForm({ action, initial = {}, submitLabel = 'Save' }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const form = event.currentTarget;
    const formData = new FormData(form);
    try {
      await action(formData);
      toast.success(initial.id ? 'Student updated successfully.' : 'Student created successfully.');
      if (!initial.id) form.reset();
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to save student.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {initial.id && <input type="hidden" name="id" defaultValue={String(initial.id)} />}

      {/* Full Name */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-1.5">
          Full Name <span className="text-rose-400">*</span>
        </label>
        <input
          name="fullName"
          defaultValue={initial.fullName}
          required
          placeholder="e.g. Arjun Sharma"
          className="input-theme"
        />
      </div>

      {/* Email — only shown when creating (no id) */}
      {!initial.id && (
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-1.5">
            Email <span className="text-rose-400">*</span>
          </label>
          <input
            name="email"
            type="email"
            defaultValue={initial.email}
            required
            placeholder="student@school.edu"
            className="input-theme"
          />
        </div>
      )}

      {/* Roll & Admission */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-1.5">Admission No.</label>
          <input
            name="admissionNumber"
            defaultValue={initial.admissionNumber}
            placeholder="ADM-001"
            className="input-theme"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-1.5">Roll Number</label>
          <input
            name="rollNumber"
            defaultValue={initial.rollNumber}
            placeholder="01"
            className="input-theme"
          />
        </div>
      </div>

      {/* Class, DOB, Gender */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-1.5">Class</label>
          <input
            name="classId"
            defaultValue={initial.classId ? String(initial.classId) : ''}
            type="number"
            min={1}
            placeholder="1"
            className="input-theme"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-1.5">Date of Birth</label>
          <input
            name="dateOfBirth"
            defaultValue={initial.dateOfBirth}
            type="date"
            className="input-theme"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-1.5">Gender</label>
          <select name="gender" defaultValue={initial.gender || ''} className="input-theme">
            <option value="">Select</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {/* Parent Details */}
      <div className="pt-2 border-t border-theme">
        <p className="text-xs font-semibold text-muted mb-3 uppercase tracking-wide">Parent / Guardian</p>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-1.5">Parent Name</label>
            <input
              name="parentName"
              defaultValue={initial.parentName}
              placeholder="Parent full name"
              className="input-theme"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-1.5">Parent Phone</label>
            <input
              name="parentPhone"
              defaultValue={initial.parentPhone}
              placeholder="+91 98765 43210"
              className="input-theme"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-1.5">Parent Email</label>
            <input
              name="parentEmail"
              type="email"
              defaultValue={initial.parentEmail}
              placeholder="parent@example.com"
              className="input-theme"
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl btn-cyan px-4 py-2.5 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Saving…' : submitLabel}
      </button>
    </form>
  );
}
