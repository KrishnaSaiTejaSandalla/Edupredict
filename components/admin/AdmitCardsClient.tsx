'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { toast } from 'sonner';
import PageHeader from '@/components/shared/PageHeader';
import KpiCard from '@/components/shared/KpiCard';
import {
  AdmitCardClassOption,
  AdmitCardStudentRecord,
  StudentAdmitCardDetails,
  VerifiedStudentInfo,
} from '@/lib/admit-card-actions';

function formatDateOfBirth(dob?: string | null): string {
  if (!dob) return 'N/A';
  try {
    const match = dob.match(/^(\d{4})-(\d{2})-(\d{2})/);
    let dateObj: Date;
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const day = parseInt(match[3], 10);
      dateObj = new Date(year, month, day);
    } else {
      dateObj = new Date(dob);
    }
    if (isNaN(dateObj.getTime())) return dob;
    return dateObj.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dob;
  }
}

interface AdmitCardsClientProps {
  initialClasses: AdmitCardClassOption[];
  initialStudents: AdmitCardStudentRecord[];
}

export default function AdmitCardsClient({
  initialClasses,
  initialStudents,
}: AdmitCardsClientProps) {
  const [classesList] = useState<AdmitCardClassOption[]>(initialClasses);
  const [students, setStudents] = useState<AdmitCardStudentRecord[]>(initialStudents);
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Modal states
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [admitCardData, setAdmitCardData] = useState<StudentAdmitCardDetails | null>(null);
  const [admitCardQrDataUrl, setAdmitCardQrDataUrl] = useState<string>('');
  const [isAdmitCardLoading, setIsAdmitCardLoading] = useState<boolean>(false);

  // Verify Modal states
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState<boolean>(false);
  const [verifyTokenInput, setVerifyTokenInput] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verifyResult, setVerifyResult] = useState<VerifiedStudentInfo | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Fetch / filter students when class or search changes
  useEffect(() => {
    let isCancelled = false;
    const fetchFilteredStudents = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (selectedClassId !== 'all') {
          params.set('classId', selectedClassId);
        }
        if (searchQuery.trim()) {
          params.set('search', searchQuery.trim());
        }

        const res = await fetch(`/api/admin/admit-cards/students?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch students');
        const data = await res.json();
        if (!isCancelled) {
          setStudents(data.students || []);
        }
      } catch (err) {
        console.error('Error fetching filtered students:', err);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    const timer = setTimeout(() => {
      fetchFilteredStudents();
    }, 200);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [selectedClassId, searchQuery]);

  // Load individual admit card
  const handleOpenAdmitCard = async (studentId: number) => {
    setSelectedStudentId(studentId);
    setIsAdmitCardLoading(true);
    setAdmitCardData(null);
    setAdmitCardQrDataUrl('');

    try {
      const res = await fetch(`/api/admin/admit-cards/${studentId}`);
      if (!res.ok) throw new Error('Failed to load admit card details');
      const data: StudentAdmitCardDetails = await res.json();
      setAdmitCardData(data);

      if (data.student.qrToken) {
        const qrUrl = await QRCode.toDataURL(data.student.qrToken, {
          width: 240,
          margin: 1,
          color: {
            dark: '#090d16',
            light: '#ffffff',
          },
          errorCorrectionLevel: 'H',
        });
        setAdmitCardQrDataUrl(qrUrl);
      }
    } catch (err) {
      console.error('Error loading admit card:', err);
    } finally {
      setIsAdmitCardLoading(false);
    }
  };

  const handleCloseAdmitCard = () => {
    setSelectedStudentId(null);
    setAdmitCardData(null);
    setAdmitCardQrDataUrl('');
  };

  // QR Verification
  const handleVerifyQr = async () => {
    if (!verifyTokenInput.trim()) return;
    setIsVerifying(true);
    setVerifyResult(null);
    setVerifyError(null);

    try {
      const res = await fetch('/api/admin/admit-cards/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: verifyTokenInput.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.isValid) {
        setVerifyError(data.message || 'Invalid or unrecognized student QR code');
      } else {
        setVerifyResult(data);
      }
    } catch (err: any) {
      setVerifyError('Verification request failed. Please check network.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          tag="OPERATIONS"
          title="Admit Cards"
          description="Generate, inspect, and verify student admit cards with secure unique QR credentials."
        />

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setIsVerifyModalOpen(true);
              setVerifyTokenInput('');
              setVerifyResult(null);
              setVerifyError(null);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition-all hover:from-cyan-400 hover:to-blue-500 hover:shadow-cyan-500/30"
          >
            <svg
              className="h-4 w-4 fill-current"
              viewBox="0 0 24 24"
            >
              <path d="M4 4h6v6H4V4zm2 2v2h2V6H6zm8-2h6v6h-6V4zm2 2v2h2V6h-2zM4 14h6v6H4v-6zm2 2v2h2v-2H6zm10 0h2v2h-2v-2zm-2-2h2v2h-2v-2zm4 4h2v2h-2v-2zm-2 2h2v2h-2v-2zm4-4h2v4h-2v-4z" />
            </svg>
            Verify Student QR
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total Students"
          value={String(initialStudents.length)}
          colorScheme="cyan"
          icon={
            <svg className="h-6 w-6 fill-current" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          }
        />
        <KpiCard
          label="Active Classes"
          value={String(classesList.length)}
          colorScheme="violet"
          icon={
            <svg className="h-6 w-6 fill-current" viewBox="0 0 24 24">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
            </svg>
          }
        />
        <KpiCard
          label="Displayed Students"
          value={String(students.length)}
          colorScheme="emerald"
          icon={
            <svg className="h-6 w-6 fill-current" viewBox="0 0 24 24">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
          }
        />
        <KpiCard
          label="Admit Card Status"
          value="100% Ready"
          colorScheme="blue"
          icon={
            <svg className="h-6 w-6 fill-current" viewBox="0 0 24 24">
              <path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" />
            </svg>
          }
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-theme bg-surface p-4 sm:flex-row sm:items-center sm:justify-between shadow-sm">
        {/* Class Filter */}
        <div className="flex items-center gap-3">
          <label htmlFor="class-filter" className="text-xs font-semibold uppercase tracking-wider text-secondary whitespace-nowrap">
            Class Filter:
          </label>
          <select
            id="class-filter"
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="rounded-xl border border-theme bg-base px-3.5 py-2 text-sm font-medium text-primary shadow-sm outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
          >
            <option value="all">All Classes ({classesList.length})</option>
            {classesList.map((cls) => (
              <option key={cls.id} value={String(cls.id)}>
                {cls.displayName}
              </option>
            ))}
          </select>
        </div>

        {/* Search Bar */}
        <div className="relative flex-1 sm:max-w-md">
          <span className="absolute inset-y-0 left-3 flex items-center text-muted pointer-events-none">
            <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Search by student name, roll number, student ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-theme bg-base py-2 pl-9 pr-8 text-sm text-primary placeholder-muted outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-2.5 flex items-center text-muted hover:text-primary transition"
            >
              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Student Records Grid */}
      {isLoading ? (
        <div className="flex h-48 items-center justify-center rounded-2xl border border-theme bg-surface">
          <div className="flex flex-col items-center gap-2">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
            <p className="text-xs text-secondary font-medium">Loading student records...</p>
          </div>
        </div>
      ) : students.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-theme bg-surface py-12 px-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400">
            <svg className="h-7 w-7 fill-current" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
            </svg>
          </div>
          <h3 className="mt-4 text-base font-semibold text-primary">No student records found</h3>
          <p className="mt-1 text-sm text-secondary max-w-sm">
            {searchQuery
              ? `No matching students for "${searchQuery}". Try adjusting your search or class filter.`
              : 'No students available in the selected class.'}
          </p>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="mt-4 text-xs font-semibold text-cyan-400 hover:text-cyan-300 underline"
            >
              Clear search filter
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {students.map((student) => {
            const initials = student.studentName
              .split(' ')
              .filter(Boolean)
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase();

            return (
              <div
                key={student.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-theme bg-surface p-5 shadow-sm transition duration-200 hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-950/20"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {student.profileImageUrl ? (
                        <img
                          src={student.profileImageUrl}
                          alt={student.studentName}
                          className="h-11 w-11 rounded-xl object-cover border border-theme"
                        />
                      ) : (
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 text-sm font-bold text-cyan-400">
                          {initials}
                        </div>
                      )}
                      <div className="min-w-0">
                        <h4 className="truncate text-sm font-bold text-primary group-hover:text-cyan-400 transition">
                          {student.studentName}
                        </h4>
                        <p className="text-xs text-secondary truncate">
                          ID: STU-{student.id.toString().padStart(4, '0')}
                        </p>
                      </div>
                    </div>

                    <span className="shrink-0 rounded-lg bg-cyan-500/10 px-2.5 py-1 text-xs font-semibold text-cyan-400 border border-cyan-500/20">
                      {student.classDisplayName}
                    </span>
                  </div>

                  <div className="mt-4 space-y-1.5 border-t border-theme/60 pt-3 text-xs text-secondary">
                    <div className="flex items-center justify-between">
                      <span className="text-muted">Roll Number:</span>
                      <span className="font-semibold text-primary">
                        {student.rollNumber || 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted">Gender:</span>
                      <span className="capitalize text-primary">{student.gender || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted">Email:</span>
                      <span className="truncate max-w-[140px] text-primary">{student.email}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-theme/60">
                  <button
                    type="button"
                    onClick={() => handleOpenAdmitCard(student.id)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-hover py-2.5 text-xs font-semibold text-primary transition duration-150 hover:bg-cyan-500 hover:text-slate-950"
                  >
                    <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
                    </svg>
                    View Admit Card
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Individual Admit Card Modal */}
      {selectedStudentId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4  backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-theme bg-surface p-6 sm:p-8 shadow-2xl transition-all scrollbar-hide"
            id="printable-admit-card"
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={handleCloseAdmitCard}
              className="absolute top-5 right-5 flex h-9 w-9 items-center justify-center rounded-xl bg-hover text-secondary hover:text-primary transition"
            >
              <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>

            {isAdmitCardLoading ? (
              <div className="flex h-64 flex-col items-center justify-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
                <p className="text-xs font-medium text-secondary">Generating official admit card...</p>
              </div>
            ) : admitCardData ? (
              <div className="space-y-6">
                {/* Official School Header */}
                <div className="text-center border-b border-theme pb-5">
                  <div className="inline-flex items-center justify-center gap-3 mb-1">
                    {admitCardData.school?.logoUrl && (
                      <img
                        src={admitCardData.school.logoUrl}
                        alt="School Logo"
                        className="h-10 w-10 object-contain rounded-lg"
                      />
                    )}
                    <h2 className="text-xl font-bold tracking-tight text-primary sm:text-2xl">
                      {admitCardData.school?.name || 'EduPredict International School'}
                    </h2>
                  </div>
                  {admitCardData.school?.address && (
                    <p className="text-xs text-secondary">
                      {admitCardData.school.address}
                      {admitCardData.school.city ? `, ${admitCardData.school.city}` : ''}
                      {admitCardData.school.pincode ? ` - ${admitCardData.school.pincode}` : ''}
                    </p>
                  )}
                  <div className="mt-2 inline-block rounded-full bg-cyan-500/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-cyan-400 border border-cyan-500/20">
                    Official Student Admit Card
                  </div>
                </div>

                {/* Main Card Body */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
                  {/* Left Column: Student Details */}
                  <div className="sm:col-span-2 space-y-3">
                    <div className="flex items-center gap-3.5">
                      {admitCardData.student.profileImageUrl ? (
                        <img
                          src={admitCardData.student.profileImageUrl}
                          alt={admitCardData.student.name}
                          className="h-16 w-16 rounded-2xl object-cover border-2 border-cyan-500/40 shadow-md"
                        />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/15 border-2 border-cyan-500/30 text-lg font-bold text-cyan-400">
                          {admitCardData.student.name
                            .split(' ')
                            .filter(Boolean)
                            .map((n) => n[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h3 className="text-lg font-bold text-primary">
                          {admitCardData.student.name}
                        </h3>
                        <p className="text-xs font-mono text-cyan-400">
                          STU-{admitCardData.student.id.toString().padStart(4, '0')}
                        </p>
                        <p className="text-xs text-secondary mt-0.5">
                          {admitCardData.student.email}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 rounded-2xl border border-theme bg-base/50 p-3.5 text-xs">
                      <div>
                        <span className="block text-muted">Class & Section:</span>
                        <span className="font-semibold text-primary">
                          {admitCardData.classInfo.displayName}
                        </span>
                      </div>
                      <div>
                        <span className="block text-muted">Roll Number:</span>
                        <span className="font-semibold text-primary">
                          {admitCardData.student.rollNumber || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="block text-muted">Date of Birth:</span>
                        <span className="font-semibold text-primary">
                          {formatDateOfBirth(admitCardData.student.dateOfBirth)}
                        </span>
                      </div>
                      <div>
                        <span className="block text-muted">Gender:</span>
                        <span className="font-semibold capitalize text-primary">
                          {admitCardData.student.gender || 'N/A'}
                        </span>
                      </div>
                      {admitCardData.student.phoneNumber && (
                        <div>
                          <span className="block text-muted">Phone:</span>
                          <span className="font-semibold text-primary">
                            {admitCardData.student.phoneNumber}
                          </span>
                        </div>
                      )}
                      {admitCardData.classInfo.academicYear && (
                        <div>
                          <span className="block text-muted">Academic Year:</span>
                          <span className="font-semibold text-primary">
                            {admitCardData.classInfo.academicYear}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Unique Secure QR Code */}
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-theme bg-base p-4 text-center min-w-0 overflow-hidden">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary mb-2">
                      Secure QR Identity
                    </p>
                    {admitCardQrDataUrl ? (
                      <div className="rounded-xl bg-white p-2.5 shadow-inner">
                        <img
                          src={admitCardQrDataUrl}
                          alt="Student QR Code"
                          className="h-36 w-36 object-contain"
                        />
                      </div>
                    ) : (
                      <div className="h-36 w-36 bg-hover rounded-xl flex items-center justify-center text-xs text-muted">
                        QR Pending
                      </div>
                    )}
                    <div className="mt-2.5 w-full min-w-0 max-w-full flex items-center justify-between gap-1 rounded-lg border border-theme bg-surface/60 px-2 py-1">
                      <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-muted text-left">
                        {admitCardData.student.qrToken}
                      </span>
                      {admitCardData.student.qrToken && (
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(admitCardData.student.qrToken);
                            setCopiedToken(admitCardData.student.qrToken);
                            toast.success('QR ID copied');
                            setTimeout(() => {
                              setCopiedToken((curr) => (curr === admitCardData.student.qrToken ? null : curr));
                            }, 2000);
                          }}
                          title="Copy QR Identifier"
                          aria-label="Copy QR Identifier"
                          className="p-1 rounded text-secondary hover:text-cyan-400 hover:bg-cyan-500/10 transition shrink-0"
                        >
                          {copiedToken === admitCardData.student.qrToken ? (
                            <svg className="h-3.5 w-3.5 text-emerald-400 fill-current" viewBox="0 0 24 24">
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                            </svg>
                          ) : (
                            <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                              <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
                            </svg>
                          )}
                        </button>
                      )}
                    </div>
                    <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400">
                      <svg className="h-3 w-3 fill-current" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                      </svg>
                      Cryptographically Signed
                    </span>
                  </div>
                </div>

                {/* Footer and Security Notice */}
                <div className="rounded-xl border border-theme/60 bg-base/30 p-3 text-[11px] text-muted flex items-start gap-2">
                  <svg className="h-4 w-4 shrink-0 text-cyan-400 mt-0.5 fill-current" viewBox="0 0 24 24">
                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
                  </svg>
                  <span>
                    This admit card is an official school credential. Present the unique QR code at exam halls or school transport scanners for digital authorization.
                  </span>
                </div>

                {/* Modal Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-2 border-t border-theme">
                  <button
                    type="button"
                    onClick={handleCloseAdmitCard}
                    className="rounded-xl border border-theme bg-hover px-4 py-2 text-xs font-semibold text-secondary hover:text-primary transition"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400 transition shadow-lg shadow-cyan-500/20"
                  >
                    <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                      <path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z" />
                    </svg>
                    Print Admit Card
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* QR Code Verification Modal */}
      {isVerifyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl border border-theme bg-surface p-6 sm:p-7 shadow-2xl">
            <div className="flex items-center justify-between border-b border-theme pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
                  <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                    <path d="M4 4h6v6H4V4zm2 2v2h2V6H6zm8-2h6v6h-6V4zm2 2v2h2V6h-2zM4 14h6v6H4v-6zm2 2v2h2v-2H6zm10 0h2v2h-2v-2zm-2-2h2v2h-2v-2zm4 4h2v2h-2v-2zm-2 2h2v2h-2v-2zm4-4h2v4h-2v-4z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-primary">Verify Student QR Code</h3>
                  <p className="text-xs text-secondary">Authenticate student QR tokens via backend verification</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsVerifyModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-hover text-secondary hover:text-primary transition"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-secondary uppercase tracking-wider mb-1.5">
                  Enter or Scan QR Token
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. STU-QR-A1B2C3D4E5F6..."
                    value={verifyTokenInput}
                    onChange={(e) => setVerifyTokenInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleVerifyQr();
                    }}
                    className="flex-1 rounded-xl border border-theme bg-base px-3.5 py-2.5 text-sm font-mono text-primary placeholder-muted outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyQr}
                    disabled={isVerifying || !verifyTokenInput.trim()}
                    className="rounded-xl bg-cyan-500 px-4 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
                  >
                    {isVerifying ? 'Verifying...' : 'Verify'}
                  </button>
                </div>
              </div>

              {/* Error Display */}
              {verifyError && (
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-400 flex items-center gap-2">
                  <svg className="h-4 w-4 shrink-0 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                  </svg>
                  <span>{verifyError}</span>
                </div>
              )}

              {/* Success Result Display */}
              {verifyResult && verifyResult.isValid && verifyResult.student && (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    </svg>
                    Verified Student Identity
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted block">Student Name:</span>
                      <span className="font-bold text-primary">{verifyResult.student.name}</span>
                    </div>
                    <div>
                      <span className="text-muted block">Student ID:</span>
                      <span className="font-mono text-cyan-400">
                        STU-{verifyResult.student.id.toString().padStart(4, '0')}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted block">Class:</span>
                      <span className="font-semibold text-primary">{verifyResult.student.classDisplayName}</span>
                    </div>
                    <div>
                      <span className="text-muted block">Roll Number:</span>
                      <span className="font-semibold text-primary">{verifyResult.student.rollNumber || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-muted block">School:</span>
                      <span className="text-primary truncate">{verifyResult.student.schoolName}</span>
                    </div>
                    {verifyResult.transport && (
                      <div>
                        <span className="text-muted block">Transport Bus:</span>
                        <span className="font-semibold text-primary">{verifyResult.transport.busNumber}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setIsVerifyModalOpen(false)}
                className="rounded-xl border border-theme bg-hover px-4 py-2 text-xs font-semibold text-secondary hover:text-primary transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
