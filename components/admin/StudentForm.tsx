'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

type Props = {
  action: (formData: FormData) => Promise<void>;
  initial?: {
    id?: number;
    fullName?: string;
    email?: string;
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

const labelCls = 'block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5';

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
    <form onSubmit={handleSubmit} className="space-y-6">
      {initial.id && <input type="hidden" name="id" defaultValue={String(initial.id)} />}

      <section className="space-y-4 rounded-2xl border border-border bg-background/60 p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-500 dark:text-cyan-400">
            Student Profile
          </p>
          <h3 className="mt-1 text-base font-semibold text-foreground">Personal Details</h3>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className={labelCls}>
              Full Name <span className="text-rose-400">*</span>
            </label>
            <input
              name="fullName"
              defaultValue={initial.fullName}
              required
              placeholder="e.g. Arjun Sharma"
              className="input-theme h-10"
            />
          </div>

          <div>
            <label className={labelCls}>Student Email</label>
            <input
              readOnly
              defaultValue={initial.email}
              placeholder="student@school.edu"
              className="input-theme h-10 cursor-not-allowed bg-muted/40"
            />
          </div>

          <div>
            <label className={labelCls}>Date of Birth</label>
            <input
              name="dateOfBirth"
              defaultValue={initial.dateOfBirth}
              type="date"
              className="input-theme h-10"
            />
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-background/60 p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-500 dark:text-cyan-400">
            Enrollment
          </p>
          <h3 className="mt-1 text-base font-semibold text-foreground">Academic Information</h3>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className={labelCls}>Roll Number</label>
            <input
              name="rollNumber"
              defaultValue={initial.rollNumber}
              placeholder="01"
              className="input-theme h-10"
            />
          </div>

          <div>
            <label className={labelCls}>Class ID</label>
            <input
              name="classId"
              defaultValue={initial.classId ? String(initial.classId) : ''}
              type="number"
              min={1}
              placeholder="1"
              className="input-theme h-10"
            />
          </div>

          <div>
            <label className={labelCls}>Gender</label>
            <select name="gender" defaultValue={initial.gender || ''} className="input-theme h-10">
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-background/60 p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-500 dark:text-cyan-400">
            Parent / Guardian
          </p>
          <h3 className="mt-1 text-base font-semibold text-foreground">Guardian Contact</h3>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className={labelCls}>Guardian Name</label>
            <input
              name="parentName"
              defaultValue={initial.parentName}
              placeholder="Parent full name"
              className="input-theme h-10"
            />
          </div>

          <div>
            <label className={labelCls}>Guardian Phone</label>
            <input
              name="parentPhone"
              defaultValue={initial.parentPhone}
              placeholder="+91 98765 43210"
              className="input-theme h-10"
            />
          </div>

          <div>
            <label className={labelCls}>Guardian Email</label>
            <input
              name="parentEmail"
              type="email"
              defaultValue={initial.parentEmail}
              placeholder="parent@example.com"
              className="input-theme h-10"
            />
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-xl border border-border bg-background px-5 py-2.5 text-xs font-bold text-foreground transition hover:bg-hover"
        >
          Back
        </button>

        <button
          type="submit"
          disabled={loading}
          className="rounded-xl btn-cyan px-6 py-2.5 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
