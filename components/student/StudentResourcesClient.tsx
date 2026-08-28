"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { useNotificationStore } from "@/store/useNotificationStore";
import FormattedText from "@/components/shared/FormattedText";

type ResourceType = {
  id: number;
  title: string;
  description: string | null;
  fileUrl: string | null;
  resourceType: string;
  subject: string | null;
  classLevel: string | null;
  teacherName: string | null;
  isAIGenerated: boolean;
  aiContent: string | null;
  downloadCount: number;
  viewCount: number;
  createdAt: string;
};

type ProgressType = {
  resourceId: number;
  progress: number;
  isCompleted: boolean;
  lastAccessedAt?: string;
};

type Props = {
  subjects: string[];
  initialResources: ResourceType[];
  initialBookmarkedIds: number[];
  initialProgressList: ProgressType[];
  weakSubjects: string[];
};

const RESOURCE_ICONS: Record<string, string> = {
  pdf: "📕",
  document: "📘",
  presentation: "📙",
  image: "🖼️",
  video: "🎥",
  link: "🔗",
  notes: "📝",
  quiz: "❓",
  worksheet: "📄",
  lesson_plan: "📋",
};

const RESOURCE_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
  pdf:          { bg: "bg-rose-500/15",    text: "text-rose-400",    ring: "ring-rose-500/20" },
  document:     { bg: "bg-blue-500/15",    text: "text-blue-400",    ring: "ring-blue-500/20" },
  presentation: { bg: "bg-amber-500/15",   text: "text-amber-400",   ring: "ring-amber-500/20" },
  image:        { bg: "bg-emerald-500/15", text: "text-emerald-400", ring: "ring-emerald-500/20" },
  video:        { bg: "bg-cyan-500/15",    text: "text-cyan-400",    ring: "ring-cyan-500/20" },
  link:         { bg: "bg-violet-500/15",  text: "text-violet-400",  ring: "ring-violet-500/20" },
  notes:        { bg: "bg-cyan-500/15",    text: "text-cyan-400",    ring: "ring-cyan-500/20" },
  quiz:         { bg: "bg-violet-500/15",  text: "text-violet-400",  ring: "ring-violet-500/20" },
  worksheet:    { bg: "bg-emerald-500/15", text: "text-emerald-400", ring: "ring-emerald-500/20" },
  lesson_plan:  { bg: "bg-amber-500/15",   text: "text-amber-400",   ring: "ring-amber-500/20" },
};

const DEFAULT_COLOR = { bg: "bg-slate-500/15", text: "text-slate-400", ring: "ring-slate-500/20" };

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });

// Premium Resource Card
const ResourceCard = React.memo(({
  resource,
  progress,
  isCompleted,
  isBookmarked,
  lastAccessed,
  onOpen,
  onDownload,
  onBookmark,
  onDoubt,
}: {
  resource: ResourceType;
  progress: number;
  isCompleted: boolean;
  isBookmarked: boolean;
  lastAccessed: string | null;
  onOpen: (r: ResourceType) => void;
  onDownload: (r: ResourceType) => void;
  onBookmark: (id: number) => void;
  onDoubt: (title: string) => void;
}) => {
  const icon = RESOURCE_ICONS[resource.resourceType] || "📁";
  const colors = RESOURCE_COLORS[resource.resourceType] || DEFAULT_COLOR;

  return (
    <div className="group relative rounded-2xl border border-theme bg-surface hover:border-cyan-500/40 hover:shadow-[0_4px_32px_rgba(6,182,212,0.12)] hover:-translate-y-1 transition-all duration-300 p-5 flex flex-col gap-4">

      {/* Top: icon + type/subject + bookmark */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`text-2xl p-3 rounded-xl ring-1 ring-white/5 ${colors.bg} ${colors.text} ${colors.ring} shrink-0`}>
            {icon}
          </span>
          <div className="min-w-0">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ring-1 ${colors.bg} ${colors.text} ${colors.ring}`}>
              {resource.resourceType.replace("_", " ")}
            </span>
            <p className="text-[10px] font-semibold text-secondary uppercase tracking-wider mt-0.5 truncate max-w-[130px]">
              {resource.subject}
            </p>
          </div>
        </div>
        {/* Bookmark toggle */}
        <button
          onClick={() => onBookmark(resource.id)}
          type="button"
          title={isBookmarked ? "Remove Bookmark" : "Bookmark"}
          className={`h-8 w-8 rounded-xl border flex items-center justify-center text-sm transition-all duration-200 hover:scale-110 active:scale-95 shrink-0 ${
            isBookmarked
              ? "bg-amber-500/15 border-amber-500/25 text-amber-400"
              : "bg-hover border-theme text-muted hover:text-amber-400 hover:border-amber-500/25 hover:bg-amber-500/10"
          }`}
        >
          {isBookmarked ? "★" : "☆"}
        </button>
      </div>

      {/* Body: title, class, teacher, date */}
      <div className="flex-1 space-y-1">
        <h3 className="text-sm font-bold text-primary group-hover:text-cyan-400 transition-colors duration-200 leading-snug line-clamp-2">
          {resource.title}
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          {resource.classLevel && (
            <span className="rounded-full border border-theme bg-hover px-2 py-0.5 text-[9px] font-bold text-secondary">
              {resource.classLevel}
            </span>
          )}
          {resource.teacherName && (
            <span className="text-[10px] text-secondary truncate max-w-[150px]">
              By {resource.teacherName}
            </span>
          )}
        </div>
        {resource.description && (
          <p className="text-[11px] text-secondary leading-relaxed line-clamp-2 pt-0.5">
            {resource.description}
          </p>
        )}
        <p className="text-[10px] text-muted pt-0.5">
          Uploaded {formatDate(resource.createdAt)}
        </p>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-[10px] font-semibold text-secondary border-t border-theme/50 pt-3">
        <span className="flex items-center gap-1" title="Views">
          <span className="text-sm">👁</span>
          <span>{resource.viewCount}</span>
        </span>
        <span className="flex items-center gap-1" title="Downloads">
          <span className="text-sm">⬇</span>
          <span>{resource.downloadCount}</span>
        </span>
        {lastAccessed && (
          <span className="ml-auto text-[9px] text-muted">
            {new Date(lastAccessed).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        )}
      </div>

      {/* Progress bar */}
      {progress > 0 && (
        <div className="space-y-1 -mt-1">
          <div className="flex items-center justify-between text-[9px] text-secondary font-bold">
            <span>{isCompleted ? "✓ Completed" : "In Progress"}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1 w-full bg-hover rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${isCompleted ? "bg-emerald-400" : "bg-cyan-400"}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => onOpen(resource)}
          type="button"
          className="flex-1 h-9 text-[11px] font-bold text-cyan-400 border border-cyan-500/25 bg-cyan-500/10 hover:bg-cyan-500/20 rounded-xl flex items-center justify-center gap-1.5 transition active:scale-95"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" /></svg>
          View
        </button>
        {resource.fileUrl && (
          <button
            onClick={() => onDownload(resource)}
            type="button"
            title="Download"
            className="h-9 w-9 rounded-xl border border-emerald-500/25 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 flex items-center justify-center transition active:scale-95"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" /></svg>
          </button>
        )}
        <button
          onClick={() => onDoubt(resource.title)}
          type="button"
          title="Ask AI"
          className="h-9 w-9 rounded-xl border border-violet-500/25 bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 flex items-center justify-center text-sm transition active:scale-95"
        >
          🤖
        </button>
      </div>
    </div>
  );
});
ResourceCard.displayName = "ResourceCard";

// Skeleton card
const SkeletonCard = () => (
  <div className="rounded-2xl border border-theme bg-surface p-5 space-y-4 animate-pulse flex flex-col gap-3">
    <div className="flex items-center gap-3">
      <div className="h-12 w-12 rounded-xl bg-hover" />
      <div className="space-y-2 flex-1">
        <div className="h-3 w-20 bg-hover rounded-full" />
        <div className="h-2.5 w-14 bg-hover rounded-full" />
      </div>
      <div className="h-8 w-8 rounded-xl bg-hover" />
    </div>
    <div className="h-4 w-4/5 bg-hover rounded-full" />
    <div className="h-3 w-3/5 bg-hover rounded-full" />
    <div className="h-3 w-full bg-hover rounded-full" />
    <div className="flex gap-2 pt-2 border-t border-theme/50">
      <div className="h-9 flex-1 bg-hover rounded-xl" />
      <div className="h-9 w-9 bg-hover rounded-xl" />
      <div className="h-9 w-9 bg-hover rounded-xl" />
    </div>
  </div>
);

export default function StudentResourcesClient({
  subjects,
  initialResources,
  initialBookmarkedIds,
  initialProgressList,
  weakSubjects,
}: Props) {
  const [resources, setResources] = useState<ResourceType[]>(initialResources);
  const [bookmarks, setBookmarks] = useState<number[]>(initialBookmarkedIds);
  const [progressList, setProgressList] = useState<ProgressType[]>(initialProgressList);
  const [stats, setStats] = useState({ available: 0, completed: 0, recent: 0 });
  const [loading, setLoading] = useState(false);

  // Filter states – Teacher & Section removed
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [showOnlyBookmarks, setShowOnlyBookmarks] = useState(false);

  // Modals
  const [previewResource, setPreviewResource] = useState<ResourceType | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [viewingProgress, setViewingProgress] = useState(0);
  const [doubtTopic, setDoubtTopic] = useState("");
  const [doubtResponse, setDoubtResponse] = useState("");
  const [solvingDoubt, setSolvingDoubt] = useState(false);
  const [showDoubtDrawer, setShowDoubtDrawer] = useState(false);
  const [isDoubtExpanded, setIsDoubtExpanded] = useState(false);

  const processedNotificationsRef = useRef<Set<number>>(new Set());

  // Derived bookmark count
  const bookmarkCount = bookmarks.length;

  // Downloaded count = items with progress >= 50
  const downloadedCount = useMemo(() =>
    progressList.filter(p => p.progress >= 50).length,
    [progressList]
  );

  // Stats API
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/student/resources/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stats" }),
      });
      if (res.ok) {
        const data = await res.json();
        if (!data.error) setStats(data);
      }
    } catch (err) {
      console.error("Error fetching statistics", err);
    }
  }, []);

  // Resources refresh
  const fetchResources = useCallback(async () => {
    try {
      const res = await fetch("/api/student/resources");
      if (res.ok) {
        const data = await res.json();
        setResources(data.availableResources || []);
        setBookmarks(data.bookmarkedIds || []);
        setProgressList(data.progressList || []);
      }
    } catch (err) {
      console.error("Error updating resource lists", err);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  // Notifications listener
  const notifications = useNotificationStore((s) => s.notifications);
  useEffect(() => {
    if (notifications.length > 0) {
      const latest = notifications[0];
      if (latest.title === "New Resource Added" && !latest.isRead) {
        if (!processedNotificationsRef.current.has(latest.id)) {
          processedNotificationsRef.current.add(latest.id);
          toast.info(latest.message, { duration: 6000 });
          fetchResources();
          fetchStats();
        }
      }
    }
  }, [notifications, fetchResources, fetchStats]);

  // View logging
  const handleTrackView = useCallback(async (res: ResourceType) => {
    setPreviewResource(res);
    setIsExpanded(false);
    const existing = progressList.find((p) => p.resourceId === res.id);
    setViewingProgress(existing ? existing.progress : 10);
    if (!existing) {
      setResources((prev) =>
        prev.map((r) => (r.id === res.id ? { ...r, viewCount: r.viewCount + 1 } : r))
      );
    }
    try {
      await fetch("/api/student/resources/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "view", resourceId: res.id }),
      });
      if (!existing) {
        setProgressList((prev) => [
          ...prev,
          { resourceId: res.id, progress: 10, isCompleted: false, lastAccessedAt: new Date().toISOString() },
        ]);
        fetchStats();
      }
    } catch (e) { console.error(e); }
  }, [progressList, fetchStats]);

  // Download logging
  const handleTrackDownload = useCallback(async (res: ResourceType) => {
    setResources((prev) =>
      prev.map((r) => (r.id === res.id ? { ...r, downloadCount: r.downloadCount + 1 } : r))
    );
    try {
      await fetch("/api/student/resources/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "download", resourceId: res.id }),
      });
      toast.success("Download started!");
      setProgressList((prev) =>
        prev.map((p) =>
          p.resourceId === res.id ? { ...p, progress: Math.max(p.progress, 50) } : p
        )
      );
      fetchStats();
      if (res.fileUrl) window.open(res.fileUrl, "_blank");
    } catch (e) { console.error(e); }
  }, [fetchStats]);

  // Bookmark toggle
  const handleToggleBookmark = useCallback(async (id: number) => {
    const wasBookmarked = bookmarks.includes(id);
    if (wasBookmarked) {
      setBookmarks((prev) => prev.filter((b) => b !== id));
      toast.success("Removed from bookmarks");
    } else {
      setBookmarks((prev) => [...prev, id]);
      toast.success("Bookmarked!");
    }
    try {
      const response = await fetch("/api/student/resources/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "bookmark", resourceId: id }),
      });
      const data = await response.json();
      if (data.bookmarked !== !wasBookmarked) {
        if (data.bookmarked) setBookmarks((prev) => [...prev, id]);
        else setBookmarks((prev) => prev.filter((b) => b !== id));
      }
    } catch (e) { toast.error("Failed to bookmark."); }
  }, [bookmarks]);

  // Progress update
  const handleUpdateProgress = useCallback(async (resourceId: number, progressVal: number) => {
    try {
      await fetch("/api/student/resources/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "progress", resourceId, progress: progressVal }),
      });
      setProgressList((prev) => {
        const idx = prev.findIndex((p) => p.resourceId === resourceId);
        const nextState = { resourceId, progress: progressVal, isCompleted: progressVal >= 100, lastAccessedAt: new Date().toISOString() };
        if (idx >= 0) { const updated = [...prev]; updated[idx] = nextState; return updated; }
        return [...prev, nextState];
      });
      toast.success(progressVal >= 100 ? "Completed! 🎉" : "Progress saved.");
      setPreviewResource(null);
      fetchStats();
    } catch (e) { toast.error("Failed to save progress."); }
  }, [fetchStats]);

  // AI Doubt Solver
  const handleAskDoubt = useCallback(async () => {
    if (!doubtTopic.trim()) return;
    setSolvingDoubt(true);
    setDoubtResponse("");
    try {
      const res = await fetch("/api/student/resources/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ask_doubt", topic: doubtTopic }),
      });
      const data = await res.json();
      if (!res.ok || !data.answer) {
        throw new Error(data.error || "Unable to get an AI explanation.");
      }
      setDoubtResponse(data.answer);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI Assistant is temporarily unavailable.");
    } finally {
      setSolvingDoubt(false);
    }
  }, [doubtTopic]);

  // Filtering & sorting (no teacher/section)
  const filteredAndSortedResources = useMemo(() => {
    let result = resources.filter((res) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        res.title.toLowerCase().includes(q) ||
        (res.description || "").toLowerCase().includes(q) ||
        (res.subject || "").toLowerCase().includes(q);

      if (!matchesSearch) return false;
      if (selectedSubject !== "all" && res.subject !== selectedSubject) return false;
      if (selectedType !== "all" && res.resourceType !== selectedType) return false;
      if (showOnlyBookmarks && !bookmarks.includes(res.id)) return false;
      return true;
    });

    return [...result].sort((a, b) => {
      if (sortBy === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === "views") return b.viewCount - a.viewCount;
      if (sortBy === "downloads") return b.downloadCount - a.downloadCount;
      if (sortBy === "recent") {
        const pA = progressList.find((p) => p.resourceId === a.id)?.lastAccessedAt || "";
        const pB = progressList.find((p) => p.resourceId === b.id)?.lastAccessedAt || "";
        return new Date(pB).getTime() - new Date(pA).getTime();
      }
      return 0;
    });
  }, [resources, searchQuery, selectedSubject, selectedType, showOnlyBookmarks, bookmarks, sortBy, progressList]);

  // Continue learning section
  const continueLearningItems = useMemo(() => {
    return resources
      .map((res) => {
        const progressItem = progressList.find((p) => p.resourceId === res.id);
        return {
          resource: res,
          progress: progressItem ? progressItem.progress : 0,
          isCompleted: progressItem ? progressItem.isCompleted : false,
        };
      })
      .filter((item) => item.progress > 0 && !item.isCompleted)
      .slice(0, 3);
  }, [resources, progressList]);

  const triggerAskDoubt = useCallback((title: string) => {
    setDoubtTopic(`Summarize and explain key concepts in "${title}"`);
    setShowDoubtDrawer(true);
    setDoubtResponse("");
  }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">

      {/* ── Hero Banner ── */}
      <div className="rounded-2xl border border-cyan-500/15 bg-gradient-to-r from-surface via-surface/60 to-surface px-8 py-6 relative overflow-hidden shadow-lg backdrop-blur-md">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,rgba(6,182,212,0.08),transparent_60%)]" />
        <div className="relative z-10">
          <span className="inline-flex items-center rounded-full bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-3">
            Learning Library
          </span>
          <h1 className="text-2xl font-black tracking-tight text-primary">Student Resource Hub</h1>
          <p className="mt-1 text-xs text-secondary max-w-xl">
            Access study sheets, slides, quizzes, and consult the AI doubt solver to boost your proficiency.
          </p>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Resources Available",
            val: stats.available || resources.length,
            icon: "📚",
            accent: "text-cyan-400",
            glow: "from-cyan-500/5",
          },
          {
            label: "Downloaded",
            val: downloadedCount,
            icon: "📥",
            accent: "text-emerald-400",
            glow: "from-emerald-500/5",
          },
          {
            label: "Bookmarked",
            val: bookmarkCount,
            icon: "⭐",
            accent: "text-amber-400",
            glow: "from-amber-500/5",
          },
          {
            label: "New Uploads",
            val: stats.recent,
            icon: "🆕",
            accent: "text-violet-400",
            glow: "from-violet-500/5",
          },
        ].map((c, i) => (
          <div
            key={i}
            className={`rounded-2xl border border-theme bg-gradient-to-br ${c.glow} to-transparent p-5 flex items-center gap-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300`}
          >
            <span className="text-2xl shrink-0">{c.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] uppercase font-bold text-secondary tracking-widest">{c.label}</p>
              <p className={`text-lg font-black mt-0.5 ${c.accent}`}>{c.val}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Continue Learning ── */}
      {continueLearningItems.length > 0 && (
        <div className="space-y-3 animate-in fade-in duration-300">
          <h2 className="text-xs font-black uppercase tracking-wider text-cyan-400 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
            Continue Learning
          </h2>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
            {continueLearningItems.map((item) => (
              <div key={item.resource.id} className="rounded-2xl border border-theme bg-surface p-4 space-y-3 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
                <div className="flex justify-between items-start gap-2">
                  <span className="text-xl">{RESOURCE_ICONS[item.resource.resourceType] || "📁"}</span>
                  <span className="text-[9px] font-bold text-cyan-400 border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {item.resource.subject}
                  </span>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-primary truncate">{item.resource.title}</h3>
                  <p className="text-[9px] text-secondary mt-0.5">By {item.resource.teacherName || "Faculty"}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[9px] text-secondary font-bold">
                    <span>Progress</span>
                    <span>{item.progress}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-hover rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-400 transition-all duration-300" style={{ width: `${item.progress}%` }} />
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => handleTrackView(item.resource)}
                    type="button"
                    className="flex-1 text-[10px] font-bold bg-cyan-400 hover:bg-cyan-300 text-slate-950 rounded-xl py-2 transition active:scale-95"
                  >
                    Resume
                  </button>
                  <button
                    onClick={() => handleTrackDownload(item.resource)}
                    type="button"
                    className="rounded-xl border border-theme bg-hover hover:bg-surface p-2 text-xs transition active:scale-95"
                    title="Download"
                  >
                    📥
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Single-Row Filter Toolbar ── */}
      <div className="rounded-2xl border border-theme bg-surface px-4 py-3 shadow-sm">
        <div className="flex flex-wrap gap-2.5 items-center">
          {/* Search */}
          <div className="relative" style={{ width: "300px", maxWidth: "100%" }}>
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-secondary/50 pointer-events-none">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.602 10.602Z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-xl border border-theme bg-hover pl-9 pr-4 text-xs focus-visible:outline-none focus:ring-1 focus:ring-cyan-500 text-primary placeholder:text-secondary/40"
            />
          </div>

          {/* Subject */}
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="select-theme h-10 text-xs"
            style={{ width: "170px" }}
          >
            <option value="all">All Subjects</option>
            {subjects.map((sub) => <option key={sub} value={sub}>{sub}</option>)}
          </select>

          {/* Format */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="select-theme h-10 text-xs"
            style={{ width: "170px" }}
          >
            <option value="all">All Formats</option>
            <option value="pdf">PDF Document</option>
            <option value="document">DOCX Word</option>
            <option value="presentation">Presentation</option>
            <option value="image">Image Asset</option>
            <option value="video">Video Material</option>
            <option value="link">Reference Links</option>
            <option value="notes">AI Notes</option>
            <option value="quiz">Quizzes</option>
            <option value="worksheet">Worksheets</option>
          </select>

          {/* Bookmarks toggle */}
          <button
            onClick={() => setShowOnlyBookmarks(v => !v)}
            type="button"
            className={`h-10 inline-flex items-center gap-2 px-4 rounded-xl border text-xs font-bold transition-all duration-200 active:scale-95 ${
              showOnlyBookmarks
                ? "bg-amber-500/15 border-amber-500/25 text-amber-400"
                : "border-theme bg-hover text-secondary hover:text-primary hover:border-amber-500/25 hover:bg-amber-500/10"
            }`}
          >
            <span>⭐</span>
            Bookmarked
          </button>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="select-theme h-10 text-xs"
            style={{ width: "170px" }}
          >
            <option value="newest">Sort: Newest</option>
            <option value="oldest">Sort: Oldest</option>
            <option value="views">Sort: Most Viewed</option>
            <option value="downloads">Sort: Most Downloaded</option>
            <option value="recent">Sort: Recently Accessed</option>
          </select>

          {/* Result count */}
          <span className="ml-auto text-[10px] text-secondary font-semibold whitespace-nowrap">
            {filteredAndSortedResources.length} resource{filteredAndSortedResources.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* ── Resource Grid ── */}
      {filteredAndSortedResources.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-theme bg-surface/30 p-10 text-center max-w-md mx-auto">
          <span className="text-6xl block mb-4 filter drop-shadow-md">📖</span>
          <h3 className="text-sm font-bold text-primary">No resources found</h3>
          <p className="mt-1.5 text-xs text-secondary max-w-sm mx-auto leading-relaxed">
            No learning materials match your filters. Try adjusting or clearing them.
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedSubject("all");
              setSelectedType("all");
              setShowOnlyBookmarks(false);
              setSortBy("newest");
            }}
            type="button"
            className="mt-5 rounded-xl border border-theme bg-hover hover:bg-surface px-5 py-2.5 text-xs font-bold text-primary transition active:scale-95"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAndSortedResources.map((res) => {
            const progressItem = progressList.find((p) => p.resourceId === res.id);
            return (
              <ResourceCard
                key={res.id}
                resource={res}
                progress={progressItem ? progressItem.progress : 0}
                isCompleted={progressItem ? progressItem.isCompleted : false}
                isBookmarked={bookmarks.includes(res.id)}
                lastAccessed={progressItem ? progressItem.lastAccessedAt || null : null}
                onOpen={handleTrackView}
                onDownload={handleTrackDownload}
                onBookmark={handleToggleBookmark}
                onDoubt={triggerAskDoubt}
              />
            );
          })}
        </div>
      )}

      {/* ── Preview Modal ── */}
      {previewResource && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-background/85 backdrop-blur-sm">
          <div
            className={`relative w-full overflow-hidden rounded-3xl border border-theme bg-surface shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col transition-all ${
              isExpanded
                ? "max-w-5xl h-[94vh]"
                : "max-w-2xl max-h-[85vh]"
            }`}
          >
            {/* Header controls: Expand & Close */}
            <div className="absolute right-5 top-5 z-10 flex items-center gap-2">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                type="button"
                title={isExpanded ? "Collapse View" : "Expand Full View"}
                className="flex h-8 items-center gap-1.5 px-2.5 rounded-lg border border-theme bg-hover text-secondary hover:text-primary hover:bg-hover/80 transition text-xs font-semibold"
              >
                {isExpanded ? (
                  <>
                    <span className="text-xs">🗗</span>
                    <span className="hidden sm:inline">Collapse</span>
                  </>
                ) : (
                  <>
                    <span className="text-xs">⛶</span>
                    <span className="hidden sm:inline">Expand</span>
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setPreviewResource(null);
                  setIsExpanded(false);
                }}
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-theme bg-hover text-secondary hover:text-primary transition"
              >
                ✕
              </button>
            </div>

            <div className="border-b border-theme px-6 py-5 shrink-0 pr-36">
              <span className="text-[8px] font-bold text-cyan-400 border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                {previewResource.subject}
              </span>
              <h3 className="text-sm sm:text-base font-bold text-primary mt-1.5 truncate">{previewResource.title}</h3>
              <p className="text-[10px] text-secondary mt-0.5">By {previewResource.teacherName || "Faculty"}</p>
            </div>

            <div className={`flex-1 overflow-y-auto rounded-2xl border border-theme bg-hover/10 ${isExpanded ? "p-6 sm:p-8 m-4 sm:m-6" : "p-6 m-6"}`}>
              {previewResource.fileUrl ? (
                <div className="space-y-4">
                  <p className="text-xs text-primary leading-relaxed">
                    This file is ready for your review. Click the link below to open it.
                  </p>
                  <a
                    href={previewResource.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-400 hover:text-cyan-300 border border-cyan-500/15 bg-cyan-500/5 px-4 py-2.5 rounded-xl hover:bg-cyan-500/10 transition"
                  >
                    🔗 Open: {previewResource.title}
                  </a>
                </div>
              ) : previewResource.aiContent ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    {previewResource.isAIGenerated && (
                      <span className="inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2.5 py-1 rounded-full">
                        ✨ AI Generated Material
                      </span>
                    )}
                    <span className="text-[10px] text-muted">
                      {isExpanded ? "Fullscreen Reading Mode" : "Compact Mode · Click Expand for full view"}
                    </span>
                  </div>
                  <div className={`text-xs text-primary leading-relaxed bg-hover/30 rounded-2xl border border-theme overflow-auto prose prose-invert max-w-none ${isExpanded ? "p-6 sm:p-8 min-h-[480px] prose-base text-sm" : "p-5 max-h-[360px] prose-sm"}`}>
                    <FormattedText text={previewResource.aiContent} />
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted italic text-center py-8">No content available.</p>
              )}
            </div>

            <div className="border-t border-theme px-6 py-4 space-y-3 bg-hover/10 shrink-0">
              <div className="flex justify-between items-center text-xs font-bold text-primary">
                <span>Update Study Progress:</span>
                <span className="text-cyan-400">{viewingProgress}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="10"
                value={viewingProgress}
                onChange={(e) => setViewingProgress(Number(e.target.value))}
                className="w-full h-1.5 bg-hover rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
              <div className="flex justify-end gap-3 pt-1">
                <button
                  onClick={() => {
                    setPreviewResource(null);
                    setIsExpanded(false);
                  }}
                  type="button"
                  className="rounded-xl border border-theme bg-surface px-5 py-2.5 text-xs font-bold hover:bg-hover transition"
                >
                  Close
                </button>
                <button
                  onClick={() => handleUpdateProgress(previewResource.id, viewingProgress)}
                  type="button"
                  className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 rounded-xl px-5 py-2.5 text-xs font-bold shadow-md shadow-cyan-400/10 transition active:scale-95"
                >
                  Save Progress
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── AI Doubt Solver ── */}
      {showDoubtDrawer && typeof document !== "undefined" && createPortal(
        <div
          className={`fixed inset-0 z-[99999] flex transition-all duration-300 ${
            isDoubtExpanded
              ? "items-center justify-center p-4 sm:p-8 backdrop-blur-md"
              : "items-stretch justify-end backdrop-blur-sm"
          }`}
          onClick={(e) => {
            if (e.target === e.currentTarget) { setShowDoubtDrawer(false); setIsDoubtExpanded(false); }
          }}
        >
          <div
            className={`flex flex-col shadow-2xl transition-all duration-300 overflow-hidden ${
              isDoubtExpanded
                ? "w-full max-w-[84vw] h-[90vh] rounded-3xl bg-surface border border-white/8"
                : "w-full max-w-[420px] h-full bg-surface border-l border-white/8"
            }`}
          >
            {/* ── Header ── */}
            <div className="relative shrink-0 bg-gradient-to-r from-cyan-600/15 via-violet-600/8 to-transparent border-b border-white/8">
              <div className="flex items-center justify-between px-5 pt-5 pb-4">
                {/* Left: logo + title */}
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center text-xl shadow-lg shadow-cyan-500/20 shrink-0">
                    🤖
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-primary leading-tight">AI Doubt Solver</h3>
                    <p className="text-[10px] text-secondary mt-0.5">Powered by Gemini · Adapts to your level</p>
                  </div>
                </div>

                {/* Right: controls */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setIsDoubtExpanded(!isDoubtExpanded)}
                    type="button"
                    className="h-8 px-3 rounded-xl bg-white/6 border border-white/10 text-secondary hover:text-primary hover:bg-white/10 transition text-xs font-medium flex items-center gap-1.5"
                  >
                    {isDoubtExpanded ? <><span>⊟</span><span className="hidden sm:inline text-[11px]">Collapse</span></> : <><span>⊞</span><span className="hidden sm:inline text-[11px]">Expand</span></>}
                  </button>
                  <button
                    onClick={() => { setShowDoubtDrawer(false); setIsDoubtExpanded(false); }}
                    type="button"
                    className="h-8 w-8 rounded-xl bg-white/6 border border-white/10 text-secondary hover:text-primary hover:bg-white/10 transition text-sm flex items-center justify-center"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Search row */}
              <div className="flex gap-2 px-5 pb-4">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-xs pointer-events-none">🔍</span>
                  <input
                    type="text"
                    value={doubtTopic}
                    onChange={(e) => setDoubtTopic(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !solvingDoubt && doubtTopic.trim()) handleAskDoubt(); }}
                    placeholder="Type any topic, concept or question..."
                    className="w-full h-10 pl-8 pr-3 rounded-xl bg-black/20 border border-white/10 text-xs text-primary placeholder-muted focus:outline-none focus:border-cyan-500/50 focus:bg-black/30 transition"
                  />
                </div>
                <button
                  onClick={handleAskDoubt}
                  disabled={solvingDoubt || !doubtTopic.trim()}
                  type="button"
                  className="h-10 px-5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-bold disabled:opacity-40 flex items-center gap-2 shadow-md shadow-cyan-500/25 transition active:scale-95 shrink-0"
                >
                  {solvingDoubt
                    ? <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" /><span>Thinking…</span></>
                    : <span>Ask AI</span>
                  }
                </button>
              </div>
            </div>

            {/* ── Content ── */}
            <div className="flex-1 overflow-y-auto p-5 min-h-0">
              {doubtResponse ? (
                <div className={`rounded-2xl border border-cyan-500/15 bg-cyan-500/5 p-5 sm:p-6 animate-in fade-in duration-300 prose prose-invert max-w-none text-primary leading-relaxed ${isDoubtExpanded ? "text-sm" : "text-xs"}`}>
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 rounded-full bg-cyan-400/20 flex items-center justify-center text-[10px]">✨</div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">AI Explanation</span>
                    </div>
                    <span className="text-[10px] text-muted truncate max-w-[120px]">{doubtTopic}</span>
                  </div>
                  <FormattedText text={doubtResponse} />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-violet-500/10 border border-white/8 flex items-center justify-center text-3xl mb-4">
                    💡
                  </div>
                  <p className="text-sm font-bold text-primary">Ask me anything!</p>
                  <p className="text-xs text-secondary mt-1.5 max-w-[260px] leading-relaxed">
                    Explanations adapt to your grade level — with real-life analogies, step-by-step breakdowns, and memory hacks.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2 justify-center">
                    {["Photosynthesis", "Quadratic Equations", "Poem", "Newton's Laws", "World War 2", "Fractions"].map(ex => (
                      <button
                        key={ex}
                        type="button"
                        onClick={() => setDoubtTopic(ex)}
                        className="text-[10px] px-3 py-1.5 rounded-full border border-white/10 bg-white/4 text-secondary hover:text-primary hover:bg-white/10 hover:border-cyan-500/30 transition"
                      >
                        {ex}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Footer ── */}
            <div className="shrink-0 px-5 py-3 border-t border-white/8 flex items-center justify-between gap-3">
              <p className="text-[10px] text-muted">Gemini AI · {isDoubtExpanded ? "Wide reading mode" : "Click Expand for full view"}</p>
              <button
                onClick={() => { setShowDoubtDrawer(false); setIsDoubtExpanded(false); }}
                type="button"
                className="h-8 px-4 rounded-xl border border-white/10 bg-white/5 text-xs font-medium text-secondary hover:text-primary hover:bg-white/10 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
