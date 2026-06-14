'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import AdminSearch from '@/components/admin/AdminSearch';
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal';

// ─── Types ───────────────────────────────────────────────────────────────────

type TeacherRow = {
  t: {
    id: number;
    userId: number;
    schoolId: number;
    employeeId: string | null;
    phoneNumber: string | null;
    qualification: string | null;
    experience: number | null;
    joinDate: Date | string | null;
    department: string | null;
  };
  u: {
    id: number;
    name: string;
    email: string;
  };
};

type FormState = {
  fullName: string;
  email: string;
  phoneNumber: string;
  employeeId: string;
  qualification: string;
  department: string;
  experience: string;
  joinDate: string;
};

const emptyForm: FormState = {
  fullName: '',
  email: '',
  phoneNumber: '',
  employeeId: '',
  qualification: '',
  department: '',
  experience: '',
  joinDate: '',
};

type Props = {
  teacherRows: TeacherRow[];
  page: number;
  q: string;
  sort: string;
  dir: string;
  createTeacher: (formData: FormData) => Promise<void>;
  updateTeacher: (id: number, data: FormState) => Promise<void>;
  deleteTeacher: (id: number, name: string) => Promise<void>;
};

// ─── Input style ─────────────────────────────────────────────────────────────

const inputCls = 'input-theme';
const labelCls =
  'block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5';

// ─── Component ───────────────────────────────────────────────────────────────

export default function TeachersClient({
  teacherRows,
  page,
  q,
  sort,
  dir,
  createTeacher,
  updateTeacher,
  deleteTeacher,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<FormState>(emptyForm);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState<{ id: number; name: string } | null>(null);
  const [viewingTeacher, setViewingTeacher] = useState<TeacherRow | null>(null);

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
  function openEdit(row: TeacherRow) {
    const jd = row.t.joinDate
      ? new Date(row.t.joinDate).toISOString().slice(0, 10)
      : '';
    setEditingId(row.t.id);
    setFormData({
      fullName: row.u.name,
      email: row.u.email,
      phoneNumber: row.t.phoneNumber ?? '',
      employeeId: row.t.employeeId ?? '',
      qualification: row.t.qualification ?? '',
      department: row.t.department ?? '',
      experience: row.t.experience !== null ? String(row.t.experience) : '',
      joinDate: jd,
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
          await updateTeacher(editingId, formData);
          toast.success('Teacher updated successfully.');
        } else {
          const fd = new FormData();
          (Object.keys(formData) as (keyof FormState)[]).forEach((k) =>
            fd.append(k, formData[k])
          );
          await createTeacher(fd);
          toast.success('Teacher created successfully.');
        }
        closePanel();
        router.refresh();
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Failed to save teacher.');
      }
    });
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  async function executeDelete() {
    if (!teacherToDelete) return;
    const { id, name } = teacherToDelete;
    setDeleteModalOpen(false);
    setDeletingId(id);
    try {
      await deleteTeacher(id, name);
      toast.success(`Teacher "${name}" deleted.`);
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete teacher.');
    } finally {
      setDeletingId(null);
      setTeacherToDelete(null);
    }
  }

  // ── Rating Helper ────────────────────────────────────────────────────────
  function getRating(experience: number | null) {
    const exp = experience || 0;
    if (exp >= 4) {
      return { stars: '★★★★★', label: 'Outstanding Teacher', badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
    }
    if (exp >= 2) {
      return { stars: '★★★★☆', label: 'Experienced Teacher', badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' };
    }
    return { stars: '★★★☆☆', label: 'Experienced Teacher', badgeColor: 'bg-slate-500/10 text-slate-400 border-slate-500/20' };
  }

  return (
    <div className="space-y-8">
      {/* Header Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-400">Database</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Teachers</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Manage teacher accounts, credentials, and department assignments.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <AdminSearch placeholder="Search teachers..." />
          <button
            onClick={() => (showForm && !editingId ? closePanel() : openCreate())}
            className="rounded-xl btn-blue px-5 py-3 text-xs font-bold whitespace-nowrap"
          >
            {showForm && !editingId ? 'Close Editor' : '+ Create Teacher'}
          </button>
        </div>
      </div>

      {/* Inline Editor Panel */}
      {showForm && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-md animate-in fade-in slide-in-from-bottom-2 duration-300">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground mb-6">
            {editingId ? 'Edit Teacher Record' : 'Create New Teacher'}
          </h2>

          <form onSubmit={handleSubmit} className="grid gap-5 md:grid-cols-2">
            {/* Full Name */}
            <div>
              <label className={labelCls}>Full Name *</label>
              <input
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                required
                placeholder="e.g. Sarah Jenkins"
                className={inputCls}
              />
            </div>

            {/* Email */}
            <div>
              <label className={labelCls}>Email *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                placeholder="teacher@school.edu"
                className={inputCls}
                disabled={!!editingId}
              />
            </div>

            {/* Phone Number */}
            <div>
              <label className={labelCls}>Phone Number</label>
              <input
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                placeholder="+91 98765 43210"
                className={inputCls}
              />
            </div>

            {/* Employee ID */}
            <div>
              <label className={labelCls}>Employee ID *</label>
              <input
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                required
                placeholder="T-101"
                className={inputCls}
              />
            </div>

            {/* Qualification */}
            <div>
              <label className={labelCls}>Qualification</label>
              <input
                value={formData.qualification}
                onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                placeholder="e.g. M.Sc. in Mathematics"
                className={inputCls}
              />
            </div>

            {/* Department */}
            <div>
              <label className={labelCls}>Department</label>
              <input
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="e.g. Mathematics"
                className={inputCls}
              />
            </div>

            {/* Experience */}
            <div>
              <label className={labelCls}>Experience (Years)</label>
              <input
                type="number"
                min="0"
                value={formData.experience}
                onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                placeholder="e.g. 5"
                className={inputCls}
              />
            </div>

            {/* Join Date */}
            <div>
              <label className={labelCls}>Join Date</label>
              <input
                type="date"
                value={formData.joinDate}
                onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })}
                className={inputCls}
              />
            </div>

            {/* Action buttons */}
            <div className="md:col-span-2 flex gap-3 mt-2">
              <button
                type="submit"
                disabled={isPending}
                className="rounded-xl btn-emerald px-5 py-2.5 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? 'Saving…' : editingId ? 'Update Teacher' : 'Save Teacher Record'}
              </button>
              <button
                type="button"
                onClick={closePanel}
                className="rounded-xl border border-border bg-background px-5 py-2.5 text-xs font-bold text-foreground hover:bg-hover transition duration-200"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Teachers Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-md">
        <table className="w-full text-left text-sm text-foreground">
          <thead className="border-b border-border bg-background/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="p-4 px-6">ID</th>
              <th className="p-4 px-6">Name</th>
              <th className="p-4 px-6">Email</th>
              <th className="p-4 px-6">Employee ID</th>
              <th className="p-4 px-6">Department</th>
              <th className="p-4 px-6">Rating</th>
              <th className="p-4 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-subtle">
            {teacherRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <svg viewBox="0 0 24 24" className="h-10 w-10 text-muted-foreground/30" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                    </svg>
                    <p className="text-sm font-medium text-muted-foreground">No teachers found.</p>
                  </div>
                </td>
              </tr>
            ) : (
              teacherRows.map((row) => {
                const isDeleting = deletingId === row.t.id;
                const rating = getRating(row.t.experience);

                return (
                  <tr
                    key={row.t.id}
                    className="hover:bg-hover transition duration-200"
                  >
                    <td className="p-4 px-6 text-xs font-semibold text-muted-foreground">#{row.t.id}</td>
                    <td className="p-4 px-6 font-semibold text-foreground">{row.u.name}</td>
                    <td className="p-4 px-6 font-medium text-muted-foreground">{row.u.email}</td>
                    <td className="p-4 px-6 font-mono text-xs text-foreground">{row.t.employeeId || '—'}</td>
                    <td className="p-4 px-6">
                      {row.t.department ? (
                        <span className="inline-flex rounded-lg bg-cyan-500/10 px-2.5 py-1 text-[10px] font-bold text-cyan-500 dark:text-cyan-300 border border-cyan-500/20 uppercase tracking-wider">
                          {row.t.department}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </td>
                    <td className="p-4 px-6">
                      <span className="text-amber-400 font-semibold tracking-wider text-xs whitespace-nowrap">
                        {rating.stars}
                      </span>
                    </td>
                    <td className="p-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* View profile */}
                        <button
                          onClick={() => setViewingTeacher(row)}
                          title="View Teacher"
                          className="flex h-8 w-8 items-center justify-center rounded-xl border border-subtle bg-hover text-muted-foreground hover:text-cyan-500 hover:border-cyan-400/30 transition duration-150"
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
                          title="Edit Teacher"
                          className="flex h-8 w-8 items-center justify-center rounded-xl border border-subtle bg-hover text-muted-foreground hover:text-amber-400 hover:border-amber-400/30 transition duration-150"
                        >
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z" />
                          </svg>
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => {
                            setTeacherToDelete({ id: row.t.id, name: row.u.name });
                            setDeleteModalOpen(true);
                          }}
                          disabled={isDeleting}
                          title="Delete Teacher"
                          className="flex h-8 w-8 items-center justify-center rounded-xl border border-subtle bg-hover text-muted-foreground hover:text-rose-400 hover:border-rose-400/30 disabled:opacity-40 transition duration-150"
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

      {/* Pagination */}
      <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
        <a
          href={`/admin/teachers${baseQueryStr}${sortParam}&page=${Math.max(1, page - 1)}`}
          className="rounded-xl border border-border bg-card px-4 py-2.5 hover:bg-hover transition duration-150"
        >
          ← Previous
        </a>
        <span className="tabular-nums">Page {page}</span>
        <a
          href={`/admin/teachers${baseQueryStr}${sortParam}&page=${page + 1}`}
          className="rounded-xl border border-border bg-card px-4 py-2.5 hover:bg-hover transition duration-150"
        >
          Next →
        </a>
      </div>

      {/* Teacher Profile Modal */}
      {viewingTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm transition-all duration-300">
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-border bg-card shadow-2xl shadow-black/40 animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Close Button */}
            <button
              onClick={() => setViewingTeacher(null)}
              className="absolute right-5 top-5 z-10 flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-hover text-muted-foreground hover:text-foreground hover:bg-background transition duration-200"
            >
              ✕
            </button>

            {/* Header */}
            <div className="relative border-b border-border px-8 py-8 flex flex-col sm:flex-row items-center gap-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-3xl font-bold text-white shadow-xl shadow-cyan-500/25">
                {viewingTeacher.u.name.charAt(0)}
              </div>
              <div className="text-center sm:text-left">
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground">{viewingTeacher.u.name}</h2>
                <p className="mt-1.5 text-sm text-muted-foreground flex items-center justify-center sm:justify-start gap-2">
                  <span>Employee ID:</span>
                  <span className="font-mono bg-hover px-2 py-0.5 rounded text-xs text-foreground border border-border">{viewingTeacher.t.employeeId || '—'}</span>
                </p>
                <div className="mt-3.5 flex flex-wrap justify-center sm:justify-start gap-2">
                  <span className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-500 dark:text-cyan-300">
                    {viewingTeacher.t.department || 'General Department'}
                  </span>
                  {viewingTeacher.t.qualification && (
                    <span className="rounded-xl border border-border bg-hover px-3 py-1 text-xs font-semibold text-foreground">
                      {viewingTeacher.t.qualification}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="grid gap-6 p-8 md:grid-cols-2">
              {/* Teacher Information Card */}
              <div className="rounded-2xl border border-border bg-background p-5">
                <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-cyan-500 dark:text-cyan-400">Teacher Details</h3>
                <div className="space-y-3.5 text-sm text-foreground">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Email Address</p>
                    <p className="mt-0.5 font-medium">{viewingTeacher.u.email}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Phone Number</p>
                    <p className="mt-0.5 font-medium">{viewingTeacher.t.phoneNumber || 'Not Available'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Qualification</p>
                    <p className="mt-0.5 font-medium">{viewingTeacher.t.qualification || 'Not Available'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Joining Date</p>
                    <p className="mt-0.5 font-medium">
                      {viewingTeacher.t.joinDate ? new Date(viewingTeacher.t.joinDate).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric"
                      }) : 'Not Available'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Performance Card */}
              <div className="rounded-2xl border border-border bg-background p-5 flex flex-col justify-between">
                <div>
                  <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-cyan-500 dark:text-cyan-400">Performance Summary</h3>
                  <div className="mt-6 flex flex-col items-center justify-center text-center p-4 rounded-xl bg-hover border border-border">
                    <span className="text-3xl text-amber-400 font-black tracking-widest animate-pulse">
                      {getRating(viewingTeacher.t.experience).stars}
                    </span>
                    <span className="mt-3 text-sm font-bold text-foreground">
                      {getRating(viewingTeacher.t.experience).label}
                    </span>
                    <span className="mt-1 text-xs text-muted-foreground">
                      Academic Rating
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                  <span>Professional Experience</span>
                  <span className="font-semibold text-foreground bg-hover px-2.5 py-1 rounded-lg border border-border">
                    {viewingTeacher.t.experience !== null ? `${viewingTeacher.t.experience} Years` : '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        title="Delete Teacher?"
        message={`Are you sure you want to delete the teacher "${teacherToDelete?.name}"? This action cannot be undone.`}
        onConfirm={executeDelete}
        onCancel={() => {
          setDeleteModalOpen(false);
          setTeacherToDelete(null);
        }}
      />
    </div>
  );
}
