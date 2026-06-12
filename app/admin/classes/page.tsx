'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { getAllClasses, createClass, updateClass, deleteClass } from '@/lib/actions';

interface ClassRow {
  id: number;
  name: string;
  section: string | null;
  academicYear: string | null;
}

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    section: '',
    academicYear: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const classesData = await getAllClasses();
      setClasses(classesData as ClassRow[]);
    } catch (err) {
      console.error('Load error:', err);
      toast.error('Failed to load classes.');
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditingId(null);
    setFormData({ name: '', section: '', academicYear: '' });
    setShowForm(true);
  }

  function openEdit(cls: ClassRow) {
    setEditingId(cls.id);
    setFormData({
      name: cls.name,
      section: cls.section || '',
      academicYear: cls.academicYear || '',
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingId) {
        await updateClass(editingId, formData);
        toast.success('Class updated successfully.');
      } else {
        await createClass(formData);
        toast.success('Class created successfully.');
      }
      setFormData({ name: '', section: '', academicYear: '' });
      setEditingId(null);
      setShowForm(false);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save class.');
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this class? This cannot be undone.')) return;
    try {
      await deleteClass(id);
      toast.success('Class deleted successfully.');
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Cannot delete class while students are assigned.');
    }
  }

  const filteredClasses = classes.filter((cls) => {
    const search = searchQuery.toLowerCase();
    return (
      cls.name.toLowerCase().includes(search) ||
      (cls.section && cls.section.toLowerCase().includes(search)) ||
      (cls.academicYear && cls.academicYear.toLowerCase().includes(search))
    );
  });

  const inputCls =
    'h-11 w-full rounded-xl border border-white/10 bg-[#0b1020]/60 px-3 text-sm text-white outline-none focus:border-cyan-400/50 transition placeholder:text-slate-600';
  const labelCls =
    'block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070b16] p-8 text-slate-400 font-medium animate-pulse flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
        Loading classes...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#070b16] p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Header Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-400">Database</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">Classes</h1>
          <p className="mt-2 text-sm text-slate-400">Manage academic sections, class groupings, and academic years.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search bar */}
          <div className="relative flex-1 min-w-[240px] sm:flex-initial">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.602 10.602Z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search classes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-xl border border-white/10 bg-[#0b1020]/60 pl-9 pr-3 text-xs text-white outline-none focus:border-cyan-400/50 placeholder:text-slate-500 transition-all"
            />
          </div>
          <button
            onClick={() => (showForm && !editingId ? setShowForm(false) : openCreate())}
            className="rounded-xl bg-blue-500 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-400 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 whitespace-nowrap"
          >
            {showForm && !editingId ? 'Close Editor' : '+ Create Class'}
          </button>
        </div>
      </div>

      {/* Editor Panel */}
      {showForm && (
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/40 to-white/[0.035] p-6 shadow-2xl shadow-black/25 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white mb-6">
            {editingId ? 'Edit Class Details' : 'Create New Class'}
          </h2>
          <form onSubmit={handleSubmit} className="grid gap-5 md:grid-cols-3">
            <div>
              <label className={labelCls}>Class Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className={inputCls}
                placeholder="e.g., 10"
              />
            </div>

            <div>
              <label className={labelCls}>Section</label>
              <input
                type="text"
                value={formData.section}
                onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                className={inputCls}
                placeholder="e.g., A"
              />
            </div>

            <div>
              <label className={labelCls}>Academic Year</label>
              <input
                type="text"
                value={formData.academicYear}
                onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                className={inputCls}
                placeholder="e.g., 2025-2026"
              />
            </div>

            <div className="md:col-span-3 flex gap-3 mt-2">
              <button
                type="submit"
                className="rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
              >
                Save Class Record
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-xs font-bold text-white hover:bg-white/[0.08] transition duration-200"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Classes Data Table */}
      <div className="overflow-auto rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/40 to-white/[0.035] shadow-xl shadow-black/25">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="border-b border-white/10 bg-[#070b16]/40 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <tr>
              <th className="p-4 px-6">ID</th>
              <th className="p-4 px-6">Class Name</th>
              <th className="p-4 px-6">Section</th>
              <th className="p-4 px-6">Academic Year</th>
              <th className="p-4 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredClasses.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-12 text-center text-slate-500 font-medium">
                  <div className="flex flex-col items-center gap-3">
                    <svg viewBox="0 0 24 24" className="h-10 w-10 text-slate-700" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75Z" />
                    </svg>
                    <p className="text-sm font-medium text-slate-500">No classes found.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredClasses.map((cls) => (
                <tr key={cls.id} className="hover:bg-white/[0.02] transition duration-200">
                  <td className="p-4 px-6 text-xs font-semibold text-slate-500">#{cls.id}</td>
                  <td className="p-4 px-6 font-semibold text-white">Class {cls.name}</td>
                  <td className="p-4 px-6">
                    {cls.section ? (
                      <span className="inline-flex rounded-lg bg-indigo-500/10 px-2.5 py-1 text-[10px] font-bold text-indigo-400 border border-indigo-500/20 uppercase tracking-wider">
                        Section {cls.section}
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                  <td className="p-4 px-6 font-medium text-slate-300">{cls.academicYear || '—'}</td>
                  <td className="p-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* Edit */}
                      <button
                        onClick={() => openEdit(cls)}
                        title="Edit"
                        className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/5 bg-white/[0.04] text-slate-400 hover:text-amber-400 hover:border-amber-400/30 transition duration-150"
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z" />
                        </svg>
                      </button>
                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(cls.id)}
                        title="Delete"
                        className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/5 bg-white/[0.04] text-slate-400 hover:text-rose-400 hover:border-rose-400/30 transition duration-150"
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
