'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import DeleteButton from '@/components/ui/DeleteButton';
import { adminResetUserPassword } from '@/lib/admin-credential-actions';

type Subject = {
  id: number;
  name: string;
  code: string | null;
};

type ClassItem = {
  id: number;
  name: string;
  section: string | null;
};

type OtherClassTeacher = {
  classId: number;
  teacherId: number;
  teacherName: string | null;
};

type AuditLog = {
  id: number;
  action: string;
  details: string;
  createdAt: Date;
};

type Props = {
  teacher: {
    id: number;
    userId: number;
    employeeId: string | null;
    phoneNumber: string | null;
    qualification: string | null;
    experience: number | null;
    joinDate: Date | null;
    department: string | null;
    performanceRating: number | null;
  };
  user: {
    id: number;
    name: string;
    email: string;
    isActive: boolean;
  } | null;
  allSubjects: Subject[];
  allClasses: ClassItem[];
  assignedSubjects: number[];
  assignedClasses: number[];
  classTeacherClassId: number | null;
  otherClassTeacherAssignments: OtherClassTeacher[];
  teacherLogs: AuditLog[];
  updateTeacherAction: (formData: FormData) => Promise<void>;
  deleteTeacherAction: (formData: FormData) => Promise<void>;
};

function MultiSelectDropdown({
  label,
  options,
  selectedValues,
  onChange,
  name
}: {
  label: string;
  options: { id: number; label: string }[];
  selectedValues: number[];
  onChange: (values: number[]) => void;
  name: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  const toggleOption = (id: number) => {
    if (selectedValues.includes(id)) {
      onChange(selectedValues.filter(x => x !== id));
    } else {
      onChange([...selectedValues, id]);
    }
  };

  const selectedLabels = options
    .filter(opt => selectedValues.includes(opt.id))
    .map(opt => opt.label);

  return (
    <div className="relative space-y-1.5">
      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      
      {/* Hidden inputs to send IDs in standard form submit */}
      {selectedValues.map(val => (
        <input key={val} type="hidden" name={name} value={val} />
      ))}

      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="min-h-10 w-full rounded-xl border border-border bg-card px-3 py-2 text-left text-xs text-foreground outline-none focus:border-cyan-500 transition-all flex items-center justify-between gap-2 flex-wrap"
        >
          {selectedLabels.length === 0 ? (
            <span className="text-muted-foreground/60">Select options...</span>
          ) : (
            <div className="flex flex-wrap gap-1">
              {selectedLabels.map((lbl, idx) => (
                <span key={idx} className="rounded-lg bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 text-[10px] font-bold text-cyan-500 dark:text-cyan-400 flex items-center gap-1">
                  {lbl}
                </span>
              ))}
            </div>
          )}
          <svg viewBox="0 0 24 24" className={["h-4 w-4 text-muted-foreground fill-none stroke-current transition duration-200 shrink-0", isOpen ? "rotate-180" : ""].join(" ")} strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <div className="absolute left-0 right-0 mt-1.5 rounded-2xl border border-border bg-popover p-2 shadow-2xl z-50 max-h-60 overflow-y-auto space-y-1">
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-8 w-full rounded-lg border border-border bg-background px-2.5 text-xs text-foreground outline-none focus:border-cyan-500 placeholder:text-muted-foreground/50 mb-1"
              />
              {filteredOptions.length === 0 ? (
                <p className="text-[10px] text-muted-foreground text-center py-2">No matching options.</p>
              ) : (
                filteredOptions.map(opt => {
                  const checked = selectedValues.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => toggleOption(opt.id)}
                      className={["flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left text-xs transition duration-150", checked ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-semibold" : "text-muted-foreground hover:bg-hover hover:text-foreground"].join(" ")}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        readOnly
                        className="h-3.5 w-3.5 rounded border-border bg-background text-cyan-500 focus:ring-cyan-500"
                      />
                      <span>{opt.label}</span>
                    </button>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function TeacherProfileClient({
  teacher,
  user,
  allSubjects,
  allClasses,
  assignedSubjects: initialAssignedSubjects,
  assignedClasses: initialAssignedClasses,
  classTeacherClassId: initialClassTeacherClassId,
  otherClassTeacherAssignments,
  teacherLogs,
  updateTeacherAction,
  deleteTeacherAction,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Assignment states
  const [selectedSubjects, setSelectedSubjects] = useState<number[]>(initialAssignedSubjects);
  const [selectedClasses, setSelectedClasses] = useState<number[]>(initialAssignedClasses);
  const [classTeacherId, setClassTeacherId] = useState<number | null>(initialClassTeacherClassId);

  // Credentials states
  const [tempPassword, setTempPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<'basic' | 'credentials' | 'assignments' | 'activity'>('basic');

  // Conflict check
  const selectedClassConflict =
    classTeacherId !== null
      ? otherClassTeacherAssignments.find(
          (a) => a.classId === classTeacherId && a.teacherId !== teacher.id
        )
      : null;

  const hasConflict = !!selectedClassConflict;

  // Generate password
  function generatePassword() {
    const prefixes = ['Edu', 'School', 'Parent', 'Student', 'Class', 'Learn', 'Acad'];
    const separators = ['@', '#', '$', '&'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const sep = separators[Math.floor(Math.random() * separators.length)];
    const num = Math.floor(1000 + Math.random() * 9000);
    const generated = `${prefix}${sep}${num}`;
    setTempPassword(generated);
    setShowPassword(true);
  }

  // Copy password
  function handleCopy() {
    if (!tempPassword) {
      toast.error('No password to copy.');
      return;
    }
    navigator.clipboard.writeText(tempPassword);
    toast.success('Password copied to clipboard!');
  }

  // Immediate Reset password
  async function handleResetPassword() {
    if (!tempPassword || tempPassword.trim().length < 6) {
      toast.error('Password must be at least 6 characters long.');
      return;
    }
    if (!user) return;
    setResetting(true);
    const toastId = toast.loading('Resetting password...');
    try {
      const res = await adminResetUserPassword(user.id, tempPassword);
      if (res.success) {
        toast.success(res.message, { id: toastId });
        setTempPassword('');
      } else {
        toast.error('Failed to reset password.', { id: toastId });
      }
    } catch (err: any) {
      toast.error(err.message || 'Error resetting password.', { id: toastId });
    } finally {
      setResetting(false);
    }
  }

  // Submit complete form workflow
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (hasConflict) {
      toast.error('Please resolve the class teacher assignment conflict before saving.');
      return;
    }
    setLoading(true);
    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      await updateTeacherAction(formData);
      toast.success('Teacher updated successfully.');
      setTempPassword('');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Unable to update teacher.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 text-foreground">
      {/* TAB NAVIGATION & STICKY SAVE ROW */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-1">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {[
            { id: 'basic', label: 'Basic Information' },
            { id: 'credentials', label: 'Credentials' },
            { id: 'assignments', label: 'Assignments' },
            { id: 'activity', label: 'Activity Logs' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 -mb-[6px] shrink-0 ${
                activeTab === tab.id
                  ? 'border-cyan-500 text-cyan-500 dark:text-cyan-400'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Global Save Changes Button */}
        {activeTab !== 'activity' && (
          <button
            type="submit"
            disabled={loading || hasConflict}
            className="btn-cyan rounded-xl px-5 py-2.5 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center justify-center gap-2"
          >
{loading ? (
               <>
                 <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
                 Saving...
               </>
             ) : (
               'Save Changes'
             )}
          </button>
        )}
      </div>

      {/* TAB CONTENT */}
      <div className="space-y-8">
        {/* TAB 1: BASIC INFORMATION */}
        <section className={`rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4 ${activeTab !== 'basic' ? 'hidden' : ''}`}>
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider border-b border-border/50 pb-3">Basic Information</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Full Name</label>
              <input name="fullName" defaultValue={user?.name || ''} required className="input-theme text-xs h-10" />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Email</label>
              <input name="email" type="email" defaultValue={user?.email || ''} required className="input-theme text-xs h-10" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Phone Number</label>
                <input name="phoneNumber" defaultValue={teacher.phoneNumber || ''} className="input-theme text-xs h-10" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Employee ID</label>
                <input name="employeeId" defaultValue={teacher.employeeId || ''} required className="input-theme text-xs h-10" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Qualification</label>
                <input name="qualification" defaultValue={teacher.qualification || ''} className="input-theme text-xs h-10" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Department</label>
                <input name="department" defaultValue={teacher.department || ''} className="input-theme text-xs h-10" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Experience (yrs)</label>
                <input name="experience" type="number" min="0" defaultValue={teacher.experience ?? ''} className="input-theme text-xs h-10" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Join Date</label>
                <input name="joinDate" type="date" defaultValue={teacher.joinDate ? new Date(teacher.joinDate).toISOString().slice(0, 10) : ''} className="input-theme text-xs h-10" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Performance Rating</label>
                <select
                  name="performanceRating"
                  defaultValue={teacher.performanceRating ?? ''}
                  className="select-theme text-xs h-10 py-2 w-full"
                >
                  <option value="">None</option>
                  <option value="1">1 - Poor</option>
                  <option value="2">2 - Fair</option>
                  <option value="3">3 - Good</option>
                  <option value="4">4 - Very Good</option>
                  <option value="5">5 - Excellent</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* TAB 2: CREDENTIALS */}
        <section className={`rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4 ${activeTab !== 'credentials' ? 'hidden' : ''}`}>
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider border-b border-border/50 pb-3">Credentials</h2>
          
          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Temporary Password</label>
            <div className="relative flex items-center">
              <input
                name="tempPassword"
                type={showPassword ? 'text' : 'password'}
                value={tempPassword}
                onChange={(e) => setTempPassword(e.target.value)}
                placeholder="Enter or generate password"
                className="h-10 w-full rounded-xl border border-border bg-background pl-3 pr-16 text-xs text-foreground outline-none focus:border-cyan-500 transition-all placeholder:text-muted-foreground/40"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="absolute right-10 text-muted-foreground hover:text-foreground transition"
                title="Copy Password"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                  <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-muted-foreground hover:text-foreground transition"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                    <path d="M12 7c-2.76 0-5 2.24-5 5 0 .65.13 1.26.36 1.82l2.92-2.92c.3-.56.88-.9 1.5-.9.96 0 1.72.76 1.72 1.72 0 .62-.34 1.2-.9 1.5l-2.92 2.92c.56.23 1.17.36 1.82.36 2.76 0 5-2.24 5-5s-2.24-5-5-5zm-7.27-.56L3.27 4.98 1.41 6.83l2.84 2.84C3.47 10.42 3 11.17 3 12c0 4.14 3.36 7.5 7.5 7.5 1.15 0 2.24-.26 3.22-.72l6.45 6.45 1.86-1.86-6.45-6.45c.46-.98.72-2.07.72-3.22 0-4.14-3.36-7.5-7.5-7.5-.83 0-1.58.47-2 .9L4.73 6.44zm7.27 1.56c1.66 0 3 1.34 3 3 0 .11-.01.22-.03.32l-3.29-3.29c.1-.02.21-.03.32-.03z"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={generatePassword}
              className="flex-1 rounded-xl border border-border bg-secondary py-2.5 text-xs font-semibold text-secondary-foreground transition hover:bg-secondary/80"
            >
              Generate Password
            </button>
            <button
              type="button"
              onClick={handleResetPassword}
              disabled={resetting || !tempPassword}
              className="flex-1 btn-cyan rounded-xl py-2.5 text-xs font-semibold disabled:opacity-50"
            >
              {resetting ? 'Resetting...' : 'Reset Password'}
            </button>
          </div>
        </section>

        {/* TAB 3: ASSIGNMENTS */}
        <div className={`space-y-6 ${activeTab !== 'assignments' ? 'hidden' : ''}`}>
          {/* SECTION 3: Teaching Assignments */}
          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider border-b border-border/50 pb-3">Teaching Assignments</h2>
            
            <div className="space-y-4">
              <MultiSelectDropdown
                label="Assigned Subjects"
                name="subjectIds"
                options={allSubjects.map(sub => ({ id: sub.id, label: `${sub.name} (${sub.code || ''})` }))}
                selectedValues={selectedSubjects}
                onChange={setSelectedSubjects}
              />

              <MultiSelectDropdown
                label="Assigned Classes"
                name="classIds"
                options={allClasses.map(cls => ({ id: cls.id, label: `${cls.name}${cls.section ? ' - ' + cls.section : ''}` }))}
                selectedValues={selectedClasses}
                onChange={setSelectedClasses}
              />
            </div>
          </section>

          {/* SECTION 4: Class Teacher Assignment */}
          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider border-b border-border/50 pb-3">Class Teacher Assignment</h2>
            
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-muted-foreground">Class Teacher Of</label>
              <select
                name="classTeacherClassId"
                value={classTeacherId ?? ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setClassTeacherId(val ? Number(val) : null);
                }}
                className="select-theme text-xs h-10 py-2.5 w-full border border-border rounded-xl"
              >
                <option value="">None</option>
                {allClasses.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    Class {cls.name}
                    {cls.section ? ` ${cls.section}` : ''}
                  </option>
                ))}
              </select>

              {/* CONFLICT WARNING BANNER */}
              {hasConflict && (
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3.5 text-xs text-rose-500 dark:text-rose-400 leading-relaxed space-y-1">
                  <p className="font-bold flex items-center gap-1">
                    <span>⚠️</span> Assignment Conflict
                  </p>
                  <p>
                    This class already has an assigned class teacher (<strong>{selectedClassConflict.teacherName}</strong>).
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* TAB 4: ACTIVITY LOGS */}
        <div className={activeTab !== 'activity' ? 'hidden' : ''}>
          {teacherLogs.length > 0 ? (
            <section className="rounded-2xl border border-border bg-card p-6 space-y-5 shadow-sm">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border/50 pb-3">Teacher Activity Logs</h3>
              <div className="flow-root">
                <ul className="-mb-8">
                  {teacherLogs.map((log, index) => (
                    <li key={log.id}>
                      <div className="relative pb-8">
                        {index !== teacherLogs.length - 1 && (
                          <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-border" aria-hidden="true" />
                        )}
                        <div className="relative flex space-x-3">
                          <div>
                            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-[10px]">
                              ⚙️
                            </span>
                          </div>
                          <div className="flex-1 min-w-0 pt-1.5 flex justify-between space-x-4">
                            <div>
                              <p className="text-xs font-semibold text-foreground">
                                {log.action.replace(/_/g, ' ')}
                              </p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {log.details}
                              </p>
                            </div>
                            <div className="text-right text-[10px] whitespace-nowrap text-muted-foreground">
                              {new Date(log.createdAt).toLocaleDateString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ) : (
            <div className="rounded-2xl border border-border bg-card p-6 text-center text-muted-foreground text-xs shadow-sm">
              No activity logs available for this teacher.
            </div>
          )}
        </div>
      </div>

      {/* DANGER ZONE - Always Visible */}
      <section className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-rose-500 dark:text-rose-400 uppercase tracking-wider mb-2">Danger Zone</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Permanently delete this teacher along with their linked user record. This action cannot be undone.
        </p>
        <input type="hidden" name="id" value={String(teacher.id)} />
        <DeleteButton action={deleteTeacherAction} label="Delete Teacher" />
      </section>
    </form>
  );
}
