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

const inputCls =
  'w-full rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition';
const labelCls = 'block text-xs font-medium text-slate-400 mb-1';

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
      if (!initial.id) {
        form.reset();
      }
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
        <label className={labelCls}>
          Full Name <span className="text-red-400">*</span>
        </label>
        <input
          name="fullName"
          defaultValue={initial.fullName}
          required
          placeholder="e.g. Arjun Sharma"
          className={inputCls}
        />
      </div>

      {/* Email — only shown when creating (no id) */}
      {!initial.id && (
        <div>
          <label className={labelCls}>
            Email <span className="text-red-400">*</span>
          </label>
          <input
            name="email"
            type="email"
            defaultValue={initial.email}
            required
            placeholder="student@school.edu"
            className={inputCls}
          />
        </div>
      )}

      {/* Roll & Admission */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Admission No.</label>
          <input
            name="admissionNumber"
            defaultValue={initial.admissionNumber}
            placeholder="ADM-001"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Roll Number</label>
          <input
            name="rollNumber"
            defaultValue={initial.rollNumber}
            placeholder="01"
            className={inputCls}
          />
        </div>
      </div>

      {/* Class, DOB, Gender */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelCls}>Class</label>
          <input
            name="classId"
            defaultValue={initial.classId ? String(initial.classId) : ''}
            type="number"
            min={1}
            placeholder="1"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Date of Birth</label>
          <input
            name="dateOfBirth"
            defaultValue={initial.dateOfBirth}
            type="date"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Gender</label>
          <select
            name="gender"
            defaultValue={initial.gender || ''}
            className={inputCls}
          >
            <option value="">Select</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {/* Parent Details */}
      <div className="pt-2 border-t border-white/5">
        <p className="text-xs font-medium text-slate-500 mb-3 uppercase tracking-wide">Parent / Guardian</p>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Parent Name</label>
            <input
              name="parentName"
              defaultValue={initial.parentName}
              placeholder="Parent full name"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Parent Phone</label>
            <input
              name="parentPhone"
              defaultValue={initial.parentPhone}
              placeholder="+91 98765 43210"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Parent Email</label>
            <input
              name="parentEmail"
              type="email"
              defaultValue={initial.parentEmail}
              placeholder="parent@example.com"
              className={inputCls}
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 hover:from-cyan-500 hover:to-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150"
      >
        {loading ? 'Saving…' : submitLabel}
      </button>
    </form>
  );
}
