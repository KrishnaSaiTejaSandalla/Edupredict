'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import AdminSearch from '@/components/admin/AdminSearch';

// ─── Types ───────────────────────────────────────────────────────────────────

type StudentRow = {
  s: {
    id: number;
    userId: number;
    classId: number;
    rollNumber: string | null;
    gender: string | null;
    dateOfBirth: Date | string | null;
    schoolId: number;
  };

  u: {
    id: number;
    name: string;
    email: string;
  };

  c: {
    id: number;
    name: string;
    section: string | null;
  } | null;

  parentName: string | null;
  parentPhone: string | null;
};

type FormState = {
  fullName: string;
  email: string;
  rollNumber: string;
  classId: string;
  gender: string;
  dateOfBirth: string;
  parentName: string;
  parentPhone: string;
};

const emptyForm: FormState = {
  fullName: '',
  email: '',
  rollNumber: '',
  classId: '',
  gender: '',
  dateOfBirth: '',
  parentName: '',
  parentPhone: '',
};

type Props = {
  studentRows: StudentRow[];
  page: number;
  q: string;
  sort: string;
  dir: string;
  createStudent: (formData: FormData) => Promise<void>;
  updateStudent: (id: number, data: FormState) => Promise<void>;
  deleteStudent: (id: number, name: string) => Promise<void>;
};

// ─── Input style ─────────────────────────────────────────────────────────────

const inputCls =
  'h-11 w-full rounded-xl border border-white/10 bg-[#0b1020]/60 px-3 text-sm text-white outline-none focus:border-cyan-400/50 transition placeholder:text-slate-600';
const labelCls =
  'block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5';
const selectCls =
  'h-11 w-full rounded-xl border border-white/10 bg-[#0b1020] px-3 text-sm text-white outline-none focus:border-cyan-400/50 cursor-pointer';

// ─── Component ───────────────────────────────────────────────────────────────

export default function StudentsClient({
  studentRows,
  page,
  q,
  sort,
  dir,
  createStudent,
  updateStudent,
  deleteStudent,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<FormState>(emptyForm);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [viewingStudent, setViewingStudent] = useState<StudentRow | null>(null);

  // ── Pagination helpers ────────────────────────────────────────────────────
  const baseQueryStr = q ? `?q=${encodeURIComponent(q)}&` : '?';
  const sortParam = `sort=${encodeURIComponent(sort)}&dir=${encodeURIComponent(dir)}`;

  // ── Open create panel ─────────────────────────────────────────────────────
  function openCreate() {
    setEditingId(null);
    setFormData(emptyForm);
    setShowForm(true);
  }

  // ── Open edit panel ───────────────────────────────────────────────────────
  function openEdit(row: StudentRow) {
    const dob = row.s.dateOfBirth
      ? new Date(row.s.dateOfBirth).toISOString().slice(0, 10)
      : '';
    setEditingId(row.s.id);
    setFormData({
      fullName: row.u.name,
      email: row.u.email,
      rollNumber: row.s.rollNumber ?? '',
      classId: String(row.s.classId),
      gender: row.s.gender ?? '',
      dateOfBirth: dob,
      parentName: row.parentName ?? '',
      parentPhone: row.parentPhone ?? '',
    });
    setShowForm(true);
  }

  // ── Close panel ───────────────────────────────────────────────────────────
  function closePanel() {
    setShowForm(false);
    setEditingId(null);
    setFormData(emptyForm);
  }

  // ── Submit (create or update) ─────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      try {
        if (editingId !== null) {
          await updateStudent(editingId, formData);
          toast.success('Student updated successfully.');
        } else {
          const fd = new FormData();
          (Object.keys(formData) as (keyof FormState)[]).forEach((k) =>
            fd.append(k, formData[k])
          );
          await createStudent(fd);
          toast.success('Student created successfully.');
        }
        closePanel();
        router.refresh();
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Failed to save student.');
      }
    });
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  async function handleDelete(id: number, name: string) {
    if (!confirm(`Delete student "${name}"? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      await deleteStudent(id, name);
      toast.success(`Student "${name}" deleted.`);
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete student.');
    } finally {
      setDeletingId(null);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">

      {/* ── Header Row ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-400">Database</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">Students</h1>
          <p className="mt-2 text-sm text-slate-400">
            Manage student records, enrollment status, and class mappings.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <AdminSearch placeholder="Search students..." />
          <button
            onClick={() => (showForm && !editingId ? closePanel() : openCreate())}
            className="rounded-xl bg-blue-500 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-400 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 whitespace-nowrap"
          >
            {showForm && !editingId ? 'Close Editor' : '+ Create Student'}
          </button>
        </div>
      </div>

      {/* ── Inline Editor Panel (Exams-style) ──────────────────────── */}
      {showForm && (
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/40 to-white/[0.035] p-6 shadow-2xl shadow-black/25 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white mb-6">
            {editingId ? 'Edit Student Record' : 'Create New Student'}
          </h2>

          <form onSubmit={handleSubmit} className="grid gap-5 md:grid-cols-2">

            {/* Full Name */}
            <div>
              <label className={labelCls}>Full Name *</label>
              <input
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                required
                placeholder="e.g. Arjun Sharma"
                className={inputCls}
              />
            </div>

            {/* Email — only on create */}
            {!editingId && (
              <div>
                <label className={labelCls}>Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  placeholder="student@school.edu"
                  className={inputCls}
                />
              </div>
            )}

            {/* Roll Number */}
            <div>
              <label className={labelCls}>Roll Number</label>
              <input
                value={formData.rollNumber}
                onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                placeholder="01"
                className={inputCls}
              />
            </div>

            {/* Class ID */}
            <div>
              <label className={labelCls}>Class ID</label>
              <input
                type="number"
                min={1}
                value={formData.classId}
                onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                placeholder="1"
                className={inputCls}
              />
            </div>

            {/* Gender */}
            <div>
              <label className={labelCls}>Gender</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className={selectCls}
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Date of Birth */}
            <div>
              <label className={labelCls}>Date of Birth</label>
              <input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                className={inputCls}
              />
            </div>

            {/* Parent divider */}
            <div className="md:col-span-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 border-t border-white/5 pt-4">
                Parent / Guardian
              </p>
            </div>

            {/* Parent Name */}
            <div>
              <label className={labelCls}>Parent Name</label>
              <input
                value={formData.parentName}
                onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                placeholder="Parent full name"
                className={inputCls}
              />
            </div>

            {/* Parent Phone */}
            <div>
              <label className={labelCls}>Parent Phone</label>
              <input
                value={formData.parentPhone}
                onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                placeholder="+91 98765 43210"
                className={inputCls}
              />
            </div>

            {/* Action buttons */}
            <div className="md:col-span-2 flex gap-3 mt-2">
              <button
                type="submit"
                disabled={isPending}
                className="rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {isPending ? 'Saving…' : editingId ? 'Update Student' : 'Save Student Record'}
              </button>
              <button
                type="button"
                onClick={closePanel}
                className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-xs font-bold text-white hover:bg-white/[0.08] transition duration-200"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Students Table ──────────────────────────────────────────── */}
      <div className="overflow-auto rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/40 to-white/[0.035] shadow-xl shadow-black/25">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="border-b border-white/10 bg-[#070b16]/40 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <tr>
              <th className="p-4 px-6">#</th>
              <th className="p-4 px-6">Name</th>
              <th className="p-4 px-6">Roll No</th>
              <th className="p-4 px-6">Class</th>
              <th className="p-4 px-6">Gender</th>
              <th className="p-4 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {studentRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <svg viewBox="0 0 24 24" className="h-10 w-10 text-slate-700" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                    </svg>
                    <p className="text-sm font-medium text-slate-500">No students currently enrolled.</p>
                    <p className="text-xs text-slate-600">Click + Create Student to add one.</p>
                  </div>
                </td>
              </tr>
            ) : (
              studentRows.map((row) => {
                const className = row.c
                  ? `${row.c.name}${row.c.section ? ` ${row.c.section}` : ''}`
                  : `Class ${row.s.classId}`;
                const isDeleting = deletingId === row.s.id;

                return (
                  <tr
                    key={row.s.id}
                    className="hover:bg-white/[0.02] transition duration-200"
                  >
                    <td className="p-4 px-6 text-xs font-semibold text-slate-500">#{row.s.id}</td>
                    <td className="p-4 px-6 font-semibold text-white">{row.u.name}</td>
                    <td className="p-4 px-6 font-medium text-slate-400">{row.s.rollNumber || '—'}</td>
                    <td className="p-4 px-6 font-medium text-slate-300">{className}</td>
                    <td className="p-4 px-6">
                      {row.s.gender ? (
                        <span
                          className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[10px] font-semibold capitalize border ${row.s.gender?.toLowerCase() === 'male'
                            ? 'bg-blue-500/10 text-blue-300 border-blue-500/20'
                            : row.s.gender?.toLowerCase() === 'female'
                              ? 'bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/20'
                              : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                            }`}
                        >
                          {row.s.gender}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="p-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">

                        {/* View profile */}
                        <button
                          onClick={() => setViewingStudent(row)}
                          title="View Student"
                          className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/5 bg-white/[0.04] text-slate-400 hover:text-cyan-400 hover:border-cyan-400/30 transition duration-150"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </button>

                        {/* Edit inline */}
                        <button
                          onClick={() => openEdit(row)}
                          title="Edit student"
                          className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/5 bg-white/[0.04] text-slate-400 hover:text-amber-400 hover:border-amber-400/30 transition duration-150"
                        >
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z" />
                          </svg>
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(row.s.id, row.u.name)}
                          disabled={isDeleting}
                          title="Delete student"
                          className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/5 bg-white/[0.04] text-slate-400 hover:text-rose-400 hover:border-rose-400/30 disabled:opacity-40 transition duration-150"
                        >
                          {isDeleting ? (
                            <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                            </svg>
                          ) : (
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                            </svg>
                          )}
                        </button>

                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
        <a
          href={`/admin/students${baseQueryStr}${sortParam}&page=${Math.max(1, page - 1)}`}
          className="rounded-xl border border-white/10 bg-slate-900/80 px-4 py-2.5 hover:bg-slate-800 transition duration-150"
        >
          ← Previous
        </a>
        <span className="text-slate-500 tabular-nums">Page {page}</span>
        <a
          href={`/admin/students${baseQueryStr}${sortParam}&page=${page + 1}`}
          className="rounded-xl border border-white/10 bg-slate-900/80 px-4 py-2.5 hover:bg-slate-800 transition duration-150"
        >
          Next →
        </a>
      </div>

      {viewingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
          <div
            onClick={(e) => e.stopPropagation()}
            className="pointer-events-auto relative w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-[#070b16] shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
          >
            {/* Close */}
            <button
              onClick={() => setViewingStudent(null)}
              className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08]"
            >
              ✕
            </button>

            {/* Header */}
            <div className="relative border-b border-white/10 px-6 py-6 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-2xl font-bold text-white shadow-lg shadow-cyan-500/25">
                {viewingStudent.u.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">{viewingStudent.u.name}</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Roll No: {viewingStudent.s.rollNumber || '—'}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-2 py-1 text-xs font-semibold text-cyan-300">
                    {viewingStudent.c
                      ? `${viewingStudent.c.name}${viewingStudent.c.section ? ` ${viewingStudent.c.section}` : ''}`
                      : `Class ${viewingStudent.s.classId}`}
                  </span>
                  {viewingStudent.s.gender && (
                    <span className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-slate-300 capitalize">
                      {viewingStudent.s.gender}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="grid gap-4 p-6 md:grid-cols-2">
              {/* Student Details */}
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-cyan-400">Student Details</h3>
                <div className="space-y-3 text-sm text-white">
                  <div>
                    <p className="text-slate-500">Email</p>
                    <p>{viewingStudent.u.email}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Date of Birth</p>
                    <p>{viewingStudent.s.dateOfBirth ? new Date(viewingStudent.s.dateOfBirth).toLocaleDateString() : 'Not Available'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Gender</p>
                    <p className="capitalize">{viewingStudent.s.gender || 'Not Available'}</p>
                  </div>
                </div>
              </div>

              {/* Parent Details */}
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-cyan-400">Parent / Guardian</h3>
                <div className="space-y-3 text-sm text-white">
                  <div>
                    <p className="text-slate-500">Parent Name</p>
                    <p>{viewingStudent.parentName || 'Not Available'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Phone</p>
                    <p>{viewingStudent.parentPhone || 'Not Available'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
