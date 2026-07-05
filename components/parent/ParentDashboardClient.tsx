"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { uploadUserProfileImage } from "@/lib/settings-actions";
import ImageCropperModal from "@/components/shared/ImageCropperModal";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type ChildrenList = {
  studentId: number;
  studentUserId: number;
  rollNumber: string | null;
  gender: string | null;
  name: string;
  email: string | null;
  classId: number;
  className: string;
  classSection: string | null;
  displayClass: string;
  profileImageUrl?: string | null;
}[];

type DashboardData = {
  gpa: number;
  classRank: number;
  classSize: number;
  overallAvg: number;
  attendancePercent: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  totalDays: number;
  pendingAssignmentsCount: number;
  upcomingExamsCount: number;
  recentResults: {
    id: number;
    marks: string | number;
    maxMarks: number;
    recordedDate: string;
    examName: string;
    subjectName: string;
  }[];
  upcomingExams: {
    id: number;
    name: string;
    examDate: string;
    startTime: string;
    endTime: string;
    subjectName: string;
  }[];
  unreadAnnouncements: {
    id: number;
    title: string;
    message: string;
    priority: string;
    createdAt: string;
    attachmentUrl?: string;
  }[];
  todayAttendance: {
    status: string;
    remarks: string | null;
  } | null;
  assignments: {
    pending: { id: number; title: string; subjectName: string; dueDate: string }[];
    submitted: { id: number; title: string; subjectName: string; submittedAt: string }[];
  };
  subjectPerformance: {
    subjectName: string;
    studentAvg: number;
    classAvg: number;
    riskLevel: string;
    predictedScore: number;
  }[];
  performanceTrend: {
    month: string;
    score: number;
  }[];
  aiInsights: string[];
  busTracking: {
    registrationNumber: string;
    routeName: string | null;
    driverName: string | null;
    driverPhone: string | null;
    currentStop: string;
    eta: string;
  } | null;
  todayClasses: {
    id: number;
    startTime: string;
    endTime: string;
    roomNumber: string;
    subjectName: string;
  }[];
  recentActivities: {
    type: string;
    title: string;
    description: string;
    timeAgo: string;
  }[];
};

type Props = {
  childrenList: ChildrenList;
  selectedStudent: ChildrenList[0];
  data: DashboardData;
};

const SUBJECT_COLORS = [
  "from-cyan-400 to-cyan-500",
  "from-blue-400 to-blue-500",
  "from-purple-400 to-purple-500",
  "from-emerald-400 to-emerald-500",
  "from-pink-400 to-pink-500",
  "from-amber-400 to-amber-500",
];

function percentToGrade(pct: number): string {
  if (pct >= 95) return "A+";
  if (pct >= 90) return "A";
  if (pct >= 85) return "A-";
  if (pct >= 80) return "B+";
  if (pct >= 75) return "B";
  if (pct >= 70) return "B-";
  if (pct >= 65) return "C+";
  if (pct >= 60) return "C";
  if (pct >= 50) return "D";
  return "F";
}

export default function ParentDashboardClient({ childrenList, selectedStudent, data }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [isUploadingStudentProfile, setIsUploadingStudentProfile] = useState(false);
  const studentFileInputRef = useRef<HTMLInputElement>(null);

  const handleStudentImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      toast.error("File size must be under 3MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCropImageSrc(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleStudentCropSave = async (blob: Blob) => {
    setIsUploadingStudentProfile(true);
    setCropImageSrc(null);
    const data = new FormData();
    data.append("image", blob, "student-profile.jpg");

    try {
      await uploadUserProfileImage(selectedStudent.studentUserId, data);
      toast.success("Profile photo updated successfully.");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile photo");
    } finally {
      setIsUploadingStudentProfile(false);
    }
  };

  const handleStudentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sId = e.target.value;
    router.push(`${pathname}?studentId=${sId}` as Route);
  };

  const initials = selectedStudent.name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const overallGrade = percentToGrade(data.overallAvg);

  // Compute days left helper
  const getDaysLeft = (examDateStr: string) => {
    const diff = new Date(examDateStr).getTime() - new Date().setHours(0, 0, 0, 0);
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days < 0) return "Passed";
    if (days === 0) return "Today";
    if (days === 1) return "1 Day Left";
    return `${days} Days Left`;
  };

  // Activity Icon Helper
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "assignment": return "📝";
      case "marks": return "📊";
      case "diary": return "📔";
      case "attendance": return "⏱️";
      case "announcement": return "📢";
      default: return "🔔";
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 animate-in fade-in duration-300">
      {/* Selector and Dropdown */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-400">
            Parent Overview
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-primary">
            Student Performance Dashboard
          </h1>
        </div>

        {childrenList.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-secondary uppercase tracking-wider">Switch Student:</span>
            <select
              value={selectedStudent.studentId}
              onChange={handleStudentChange}
              className="h-10 rounded-xl border border-theme bg-surface px-3 text-xs font-semibold text-primary outline-none focus:border-cyan-500 transition cursor-pointer"
            >
              {childrenList.map((c) => (
                <option key={c.studentId} value={c.studentId}>
                  {c.name} ({c.className})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 1. HERO CARD */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 p-6 md:p-8 text-white border border-indigo-500/20 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
        {/* Subtle decorative lights */}
        <div className="absolute top-0 right-0 h-64 w-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 h-64 w-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Profile and basic info */}
        <div className="flex flex-col md:flex-row items-center gap-6 z-10 w-full md:w-auto text-center md:text-left">
          <div className="relative h-24 w-24 rounded-full overflow-hidden border-2 border-cyan-400 bg-white/[0.04] shrink-0 group">
            {isUploadingStudentProfile ? (
              <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center z-20">
                <span className="h-4 w-4 animate-spin border-2 border-cyan-400 border-t-transparent rounded-full" />
              </div>
            ) : null}
            {selectedStudent.profileImageUrl ? (
              <img src={selectedStudent.profileImageUrl} alt={selectedStudent.name} className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-cyan-400 to-cyan-600 text-2xl font-black text-white">
                {initials}
              </span>
            )}

            <button
              type="button"
              onClick={() => studentFileInputRef.current?.click()}
              className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white cursor-pointer transition-opacity duration-200 z-10 rounded-full"
            >
              <span className="text-xl font-bold bg-cyan-400 text-slate-950 w-8 h-8 rounded-full flex items-center justify-center shadow-lg border border-slate-950">
                ＋
              </span>
            </button>

            <input
              ref={studentFileInputRef}
              type="file"
              accept="image/png, image/jpeg, image/webp"
              className="hidden"
              onChange={handleStudentImageChange}
            />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-white">{selectedStudent.name}</h2>
            <p className="text-xs font-semibold text-cyan-300">
              Class {selectedStudent.displayClass} • Roll {selectedStudent.rollNumber || "N/A"}
            </p>
            <div className="inline-block rounded-full bg-cyan-500/10 border border-cyan-500/20 px-3.5 py-1 text-[10px] font-bold text-cyan-300 uppercase tracking-widest">
              General Stream
            </div>

            {/* Metric Pills */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 pt-3">
              <span className="flex items-center gap-1.5 rounded-xl bg-slate-950/40 border border-white/5 px-3.5 py-2 text-xs font-bold text-cyan-300">
                📊 GPA {data.gpa || "0.0"}
              </span>
              <span className="flex items-center gap-1.5 rounded-xl bg-slate-950/40 border border-white/5 px-3.5 py-2 text-xs font-bold text-cyan-300">
                📅 {data.attendancePercent}% Attendance
              </span>
              <span className="flex items-center gap-1.5 rounded-xl bg-slate-950/40 border border-white/5 px-3.5 py-2 text-xs font-bold text-cyan-300">
                🏆 Rank {data.classRank} / {data.classSize}
              </span>
            </div>
          </div>
        </div>

        {/* Circular Progress widget */}
        <div className="flex flex-col items-center gap-3 shrink-0 z-10">
          <div className="relative h-28 w-28 flex items-center justify-center">
            {/* SVG Background Ring */}
            <svg className="absolute transform -rotate-95 w-full h-full" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="8"
                fill="transparent"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="url(#cyanGrad)"
                strokeWidth="8"
                strokeDasharray={`${2.512 * data.attendancePercent} ${251.2 - 2.512 * data.attendancePercent}`}
                strokeLinecap="round"
                fill="transparent"
              />
              <defs>
                <linearGradient id="cyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#22d3ee" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
            </svg>
            <div className="text-center">
              <span className="block text-2xl font-black tracking-tight text-white">{data.attendancePercent}%</span>
              <span className="text-[9px] text-cyan-300/80 font-bold uppercase tracking-wider block">Attendance</span>
            </div>
          </div>
          <span className="text-[10px] text-cyan-300 font-bold uppercase tracking-widest">This Term Overview</span>
        </div>
      </div>

      {/* Image Cropper */}
      {cropImageSrc && (
        <ImageCropperModal
          imageSrc={cropImageSrc}
          onClose={() => setCropImageSrc(null)}
          onSave={handleStudentCropSave}
        />
      )}

      {/* 2. KPI CARDS */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        {[
          {
            title: "Attendance",
            value: `${data.attendancePercent}%`,
            sub: `${data.presentCount} Present / ${data.totalDays} Days`,
            gradient: "from-emerald-500 to-teal-600",
            icon: "📅",
            href: "/parent/attendance",
          },
          {
            title: "Average Score",
            value: `${Math.round(data.overallAvg)}%`,
            sub: `GPA ${data.gpa || "0.0"} (${overallGrade})`,
            gradient: "from-violet-500 to-purple-600",
            icon: "⭐",
            href: "/parent/results",
          },
          {
            title: "Assignments",
            value: String(data.pendingAssignmentsCount),
            sub: "Pending",
            gradient: "from-amber-500 to-orange-600",
            icon: "📌",
            href: "/parent/assignments",
          },
          {
            title: "Upcoming Exams",
            value: String(data.upcomingExamsCount),
            sub: data.upcomingExams[0] ? `Next: ${data.upcomingExams[0].subjectName}` : "No Exams",
            gradient: "from-rose-500 to-pink-600",
            icon: "📝",
            href: "/parent/exams",
          },
          {
            title: "AI Status",
            value: data.overallAvg >= 75 ? "Excellent" : data.overallAvg >= 60 ? "On Track" : "Needs Help",
            sub: "Keep it up!",
            gradient: "from-cyan-500 to-blue-600",
            icon: "🧠",
            href: "/parent/performance",
          },
        ].map((card, idx) => (
          <Link
            key={idx}
            href={card.href as Route}
            className={`relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br ${card.gradient} border border-white/10 shadow-xl hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300 group flex flex-col justify-between`}
          >
            {/* Background Icon */}
            <div className="absolute -top-2 -right-2 opacity-10 text-[80px] leading-none select-none group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 pointer-events-none">
              {card.icon}
            </div>

            <div className="relative z-10">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/70 block">
                {card.title}
              </span>
              <p className="mt-2 text-2xl font-black text-white">
                {card.value}
              </p>
            </div>

            <div className="relative z-10 flex justify-between items-center mt-4 pt-3 border-t border-white/15">
              <span className="text-[10px] text-white/60 font-medium">{card.sub}</span>
              <span className="text-[10px] font-bold text-white group-hover:translate-x-1 transition-transform">
                View →
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* 3. COLUMNS ROW 1 */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Subject Performance */}
        <div className="rounded-3xl border border-theme bg-surface p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center border-b border-subtle pb-3">
              <h3 className="text-sm font-bold text-primary">Subject Performance</h3>
              <Link href={"/parent/results" as Route} className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300">
                View all →
              </Link>
            </div>
            <div className="mt-6 space-y-4">
              {data.subjectPerformance.map((subj, idx) => {
                const colorCls = SUBJECT_COLORS[idx % SUBJECT_COLORS.length];
                return (
                  <div key={subj.subjectName} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-secondary">{subj.subjectName}</span>
                      <span className="text-primary font-bold">{subj.studentAvg}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-hover/30 overflow-hidden">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${colorCls} transition-all duration-500`}
                        style={{ width: `${subj.studentAvg}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              {data.subjectPerformance.length === 0 && (
                <div className="text-center text-xs text-muted py-8">
                  No performance data recorded.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Performance Trend Chart */}
        <div className="rounded-3xl border border-theme bg-surface p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-primary border-b border-subtle pb-3">
              Performance Trend
            </h3>
            <div className="h-48 w-full mt-4">
              {data.performanceTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.performanceTrend} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} style={{ fontSize: "10px", fill: "var(--text-muted)" }} />
                    <YAxis domain={[0, 100]} tickLine={false} axisLine={false} style={{ fontSize: "10px", fill: "var(--text-muted)" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(15, 23, 42, 0.95)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "12px",
                        color: "#fff",
                        fontSize: "11px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#06b6d4"
                      strokeWidth={3}
                      dot={{ r: 4, stroke: "#06b6d4", strokeWidth: 2, fill: "#0f172a" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-muted">
                  No exam trend data available.
                </div>
              )}
            </div>
          </div>
          <div className="rounded-xl border border-theme bg-hover/20 p-3.5 text-[10px] text-secondary font-bold flex items-center gap-2 mt-4">
            📈 Consistent progress tracked across past terms.
          </div>
        </div>

        {/* Upcoming Exams */}
        <div className="rounded-3xl border border-theme bg-surface p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center border-b border-subtle pb-3">
              <h3 className="text-sm font-bold text-primary">Upcoming Exams</h3>
              <Link href={"/parent/exams" as Route} className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300">
                View all →
              </Link>
            </div>
            <div className="mt-4 space-y-3">
              {data.upcomingExams.map((exam) => (
                <div
                  key={exam.id}
                  className="rounded-xl border border-theme bg-hover/20 p-3.5 flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <span className="block text-xs font-bold text-primary">{exam.subjectName}</span>
                    <span className="block text-[10px] text-muted font-medium">
                      {exam.examDate} • {exam.startTime}
                    </span>
                  </div>
                  <span className="rounded-lg bg-cyan-500/10 px-2.5 py-1.5 text-[9px] font-extrabold text-cyan-400 uppercase tracking-wider border border-cyan-500/20 shrink-0">
                    {getDaysLeft(exam.examDate)}
                  </span>
                </div>
              ))}

              {data.upcomingExams.length === 0 && (
                <div className="text-center text-xs text-muted py-8">
                  No upcoming examinations.
                </div>
              )}
            </div>
          </div>
          <Link href={"/parent/exams" as Route} className="text-[10px] font-bold text-muted hover:text-primary transition mt-4 block text-center uppercase tracking-widest">
            View Full Exam Schedule →
          </Link>
        </div>
      </div>

      {/* 4. COLUMNS ROW 2 */}
      <div className="grid gap-6 lg:grid-cols-4">
        {/* Today's Schedule with cute illustration decoration */}
        <div className="rounded-3xl border border-theme bg-surface p-6 shadow-sm lg:col-span-1 flex flex-col justify-between overflow-hidden relative min-h-[290px]">
          <div>
            <div className="flex justify-between items-center border-b border-subtle pb-3">
              <h3 className="text-sm font-bold text-primary">Today's Classes</h3>
              <Link href={"/parent/timetable" as Route} className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300">
                Full →
              </Link>
            </div>
            <div className="mt-4 space-y-2.5 z-10 relative max-h-[140px] overflow-y-auto scrollbar-hide pr-1">
              {data.todayClasses.map((cls) => (
                <div key={cls.id} className="flex items-center gap-2 text-xs font-semibold">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shrink-0" />
                  <span className="text-muted shrink-0 text-[10px]">{cls.startTime}</span>
                  <span className="text-primary truncate">{cls.subjectName}</span>
                </div>
              ))}

              {data.todayClasses.length === 0 && (
                <p className="text-xs text-muted py-4">No classes scheduled today.</p>
              )}
            </div>
          </div>

          {/* SVG Illustration at bottom right */}
          <div className="absolute right-2 bottom-2 w-20 h-20 opacity-20 pointer-events-none">
            <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400 h-full w-full">
              <path d="M12 25h76v58H12z" />
              <path d="M12 35h76M12 45h76" />
              <circle cx="50" cy="65" r="10" />
              <path d="M50 60v5M50 65h5" />
            </svg>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-3xl border border-theme bg-surface p-6 shadow-sm lg:col-span-1 flex flex-col justify-between min-h-[290px]">
          <div>
            <div className="flex justify-between items-center border-b border-subtle pb-3">
              <h3 className="text-sm font-bold text-primary">Recent Activity</h3>
              <Link href={"/parent/notifications" as Route} className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300">
                All →
              </Link>
            </div>
            <div className="mt-4 space-y-3 max-h-[180px] overflow-y-auto scrollbar-hide pr-1">
              {data.recentActivities.map((act, index) => (
                <div key={index} className="flex gap-2.5 text-xs">
                  <span className="shrink-0 text-sm mt-0.5">{getActivityIcon(act.type)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-primary truncate">{act.title}</p>
                    <p className="text-[10px] text-secondary truncate mt-0.5">{act.description}</p>
                    <span className="text-[9px] text-muted block mt-0.5">{act.timeAgo}</span>
                  </div>
                </div>
              ))}

              {data.recentActivities.length === 0 && (
                <div className="text-center text-xs text-muted py-6">
                  No recent updates.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* AI Insight Quotes */}
        <div className="rounded-3xl border border-theme bg-gradient-to-br from-slate-900 to-emerald-950 p-6 shadow-sm lg:col-span-1 flex flex-col justify-between min-h-[290px] border-emerald-500/20">
          <div>
            <div className="flex justify-between items-center border-b border-emerald-500/10 pb-3">
              <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                <span>🧠</span> AI Insights
              </h3>
              <span className="rounded bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 text-[8px] font-black text-emerald-400 uppercase tracking-widest">
                Beta
              </span>
            </div>
            <div className="mt-4 space-y-3 text-xs leading-relaxed text-emerald-100 font-semibold italic">
              <span className="text-2xl font-black text-emerald-500 leading-none">“</span>
              {data.aiInsights.map((insight, idx) => (
                <p key={idx} className="mt-1">
                  {insight}
                </p>
              ))}
              {data.aiInsights.length === 0 && (
                <p className="mt-1">Insights compile daily as student grades and homework activities register.</p>
              )}
            </div>
          </div>
          <span className="text-[9px] text-emerald-500/70 font-bold uppercase tracking-widest block pt-2 border-t border-emerald-500/10">
            Powered by EduPredict AI
          </span>
        </div>

        {/* Bus Tracking */}
        <div className="rounded-3xl border border-theme bg-surface p-6 shadow-sm lg:col-span-1 flex flex-col justify-between min-h-[290px]">
          <div>
            <div className="flex justify-between items-center border-b border-subtle pb-3">
              <h3 className="text-sm font-bold text-primary">Bus Tracking</h3>
              <Link href={"/parent/bus-tracking" as Route} className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300">
                Track →
              </Link>
            </div>

            {data.busTracking ? (
              <div className="mt-4 space-y-3 text-xs">
                <div className="flex items-center justify-between font-bold text-primary border-b border-theme pb-2">
                  <span>Route: {data.busTracking.routeName || "Route 3"}</span>
                  <span className="rounded bg-emerald-500/15 border border-emerald-500/25 px-1.5 py-0.5 text-[9px] text-emerald-400 font-bold">
                    On Time
                  </span>
                </div>
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-secondary">
                    <span>ETA:</span>
                    <span className="font-extrabold text-cyan-400">{data.busTracking.eta}</span>
                  </div>
                  <div className="flex items-center justify-between text-secondary">
                    <span>Current Stop:</span>
                    <span className="font-bold text-primary">{data.busTracking.currentStop}</span>
                  </div>
                  <div className="flex items-center justify-between text-secondary">
                    <span>Driver:</span>
                    <span className="font-semibold text-primary">{data.busTracking.driverName}</span>
                  </div>
                  {data.busTracking.driverPhone && (
                    <div className="flex items-center justify-between text-muted">
                      <span>Contact:</span>
                      <span className="font-bold text-secondary">{data.busTracking.driverPhone}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center text-xs text-muted py-10">
                No transport assigned.
              </div>
            )}
          </div>
          {data.busTracking && (
            <div className="text-[10px] text-muted text-center pt-2 border-t border-theme">
              GPS active • Updates every 10s
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
