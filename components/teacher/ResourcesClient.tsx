"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { toast } from "sonner";
import DeleteConfirmModal from "@/components/ui/DeleteConfirmModal";
import FormattedText from "@/components/shared/FormattedText";

type Resource = {
  id: number;
  title: string;
  description: string;
  subject: string;
  classLevel: string;
  resourceType: string;
  fileUrl: string | null;
  isAIGenerated: boolean;
  aiContent: string | null;
  downloadCount: number;
  viewCount: number;
  createdAt: string;
};

type Props = {
  teacherId: number | null;
  department: string | null;
  assignedClasses: { id: number; label: string }[];
  assignedSubjects: string[];
};

type AIGenerateForm = {
  tool: string;
  subject: string;
  classLevel: string;
  topic: string;
  difficultyLevel: "easy" | "medium" | "hard" | "mixed";
  learningObjective: string;
  resourceContext: string;
};

const RESOURCE_TYPES = [
  { value: "pdf", label: "PDF Document", icon: "📕" },
  { value: "document", label: "Document (DOCX)", icon: "📘" },
  { value: "presentation", label: "Presentation (PPTX)", icon: "📙" },
  { value: "image", label: "Image Asset", icon: "🖼️" },
  { value: "video", label: "Video Material", icon: "🎥" },
  { value: "link", label: "External Link", icon: "🔗" },
  { value: "notes", label: "Lecture Notes", icon: "📝" },
  { value: "quiz", label: "Quiz / Exam", icon: "❓" },
  { value: "worksheet", label: "Worksheet", icon: "📄" },
  { value: "lesson_plan", label: "Lesson Plan", icon: "📋" },
];

const AI_TOOLS = [
  { id: "notes", label: "Study Notes", desc: "Structured topic notes & concepts", icon: "📝" },
  { id: "lesson_plan", label: "Lesson Plan", desc: "45-min curriculum flow", icon: "📋" },
  { id: "quiz", label: "Quiz", desc: "10-question diagnostic quiz", icon: "❓" },
  { id: "mcqs", label: "MCQs Bank", desc: "Multiple-choice set with key", icon: "🔢" },
  { id: "question_paper", label: "Exam Paper", desc: "Standardized test paper", icon: "📑" },
  { id: "worksheet", label: "Worksheet", desc: "Practice & application drills", icon: "📄" },
  { id: "revision", label: "Revision Plan", desc: "7-day review schedule", icon: "⚡" },
  { id: "remedial", label: "Remedial Material", desc: "Foundational & step-by-step", icon: "🌱" },
  { id: "advanced", label: "Olympiad / Challenge", desc: "Higher-order thinking drills", icon: "🏆" },
  { id: "concept_explanation", label: "Concept Breakdown", desc: "Deep dive with examples", icon: "💡" },
  { id: "homework", label: "Homework", desc: "Take-home problem set", icon: "🏠" },
  { id: "answer_key", label: "Answer Key & Rubric", desc: "Detailed scoring rubric", icon: "🗝️" },
];

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

// Premium Tooltip Button
const ActionIconButton = React.memo(({
  icon,
  colorClass,
  tooltip,
  onClick,
  disabled = false,
  loading = false,
}: {
  icon: React.ReactNode;
  colorClass: string;
  tooltip: string;
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
  loading?: boolean;
}) => {
  return (
    <div className="relative group/btn">
      <button
        onClick={onClick}
        disabled={disabled || loading}
        type="button"
        className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all duration-200 active:scale-95 disabled:opacity-50 ${colorClass}`}
      >
        {loading ? (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          icon
        )}
      </button>
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 scale-0 group-hover/btn:scale-100 transition-all duration-150 origin-bottom bg-slate-900 text-[9px] font-bold text-white px-2 py-1 rounded shadow-md pointer-events-none whitespace-nowrap z-30 border border-slate-700/50">
        {tooltip}
      </span>
    </div>
  );
});
ActionIconButton.displayName = "ActionIconButton";

// Premium Skeleton Card
const SkeletonCard = () => (
  <div className="rounded-2xl border border-theme bg-surface p-5 space-y-4 animate-pulse flex flex-col gap-3">
    <div className="flex items-center gap-3">
      <div className="h-12 w-12 rounded-xl bg-hover" />
      <div className="space-y-2 flex-1">
        <div className="h-3 w-20 bg-hover rounded-full" />
        <div className="h-2.5 w-14 bg-hover rounded-full" />
      </div>
    </div>
    <div className="h-4 w-4/5 bg-hover rounded-full" />
    <div className="h-3 w-3/5 bg-hover rounded-full" />
    <div className="h-3 w-full bg-hover rounded-full" />
    <div className="h-3 w-5/6 bg-hover rounded-full" />
    <div className="flex gap-2 pt-2 border-t border-theme/50">
      <div className="h-8 flex-1 bg-hover rounded-lg" />
      <div className="h-8 w-8 bg-hover rounded-lg" />
      <div className="h-8 w-8 bg-hover rounded-lg" />
      <div className="h-8 w-8 bg-hover rounded-lg" />
    </div>
  </div>
);

export default function ResourcesClient({
  teacherId,
  department,
  assignedClasses,
  assignedSubjects,
}: Props) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Statistics Dashboard State
  const [stats, setStats] = useState({
    totalUploaded: 0,
    totalViews: 0,
    totalDownloads: 0,
    mostViewed: "None",
  });

  // Modals & States
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiForm, setAIForm] = useState<AIGenerateForm>({
    tool: "notes",
    subject: assignedSubjects[0] || department || "",
    classLevel: assignedClasses[0]?.label || "",
    topic: "",
    difficultyLevel: "medium",
    learningObjective: "",
    resourceContext: "",
  });
  const [refinementInput, setRefinementInput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [aiViewMode, setAiViewMode] = useState<"preview" | "edit">("preview");
  const [savingGenerated, setSavingGenerated] = useState(false);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: "",
    description: "",
    subject: assignedSubjects[0] || "",
    classLevel: assignedClasses[0]?.label || "",
    resourceType: "pdf",
    chapterTopic: "",
    externalUrl: "",
  });
  const [uploading, setUploading] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [previewResource, setPreviewResource] = useState<Resource | null>(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    subject: "",
    classLevel: "",
  });

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [resourceToDelete, setResourceToDelete] = useState<{ id: number; title: string } | null>(null);

  // Memoized clean metadata lists for dynamic filters
  const uniqueSubjects = useMemo(() => Array.from(new Set(assignedSubjects)), [assignedSubjects]);
  // assignedClasses is already deduplicated by ID from the server; use as-is
  const uniqueClasses = useMemo(() => assignedClasses, [assignedClasses]);

  // Statistics API
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/teacher/resources?action=stats");
      if (res.ok) {
        const data = await res.json();
        if (!data.error) setStats(data);
      }
    } catch (err) {
      console.error("Error loading stats", err);
    }
  }, []);

  // Resources list API
  const fetchResources = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    if (search) params.set("search", search);
    if (typeFilter) params.set("resourceType", typeFilter);
    if (subjectFilter) params.set("subject", subjectFilter);
    if (classFilter) params.set("classLevel", classFilter);

    try {
      const res = await fetch(`/api/teacher/resources?${params}`);
      if (res.ok) {
        const data = await res.json();
        const seen = new Set<number>();
        const unique = (data.items || []).filter((r: Resource) => {
          if (seen.has(r.id)) return false;
          seen.add(r.id);
          return true;
        });
        setResources(unique);
        setTotalPages(data.pages || 1);
      }
    } catch {
      toast.error("Failed to load resources");
    } finally {
      setLoading(false);
    }
  }, [page, search, typeFilter, subjectFilter, classFilter]);

  useEffect(() => {
    fetchResources();
    fetchStats();
  }, [fetchResources, fetchStats]);

  // Client-side sort
  const filteredAndSortedResources = useMemo(() => {
    return [...resources].sort((a, b) => {
      if (sortBy === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === "views") return b.viewCount - a.viewCount;
      if (sortBy === "downloads") return b.downloadCount - a.downloadCount;
      return 0;
    });
  }, [resources, sortBy]);

  // Derived stats from local resource list
  const activeResourcesCount = useMemo(() =>
    resources.filter(r => r.downloadCount > 0 || r.viewCount > 0).length,
    [resources]
  );

  // Drag & Drop
  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); }, []);

  const triggerFileUpload = useCallback((file: File) => {
    const validExtensions = ["pdf", "docx", "pptx", "png", "jpg", "jpeg", "webp", "mp4", "mov"];
    const fileExt = file.name.split(".").pop()?.toLowerCase() || "";
    if (!validExtensions.includes(fileExt)) { toast.error("Unsupported file format."); return; }
    if (file.size > 20 * 1024 * 1024) { toast.error("File size exceeds 20MB limit."); return; }

    setSelectedFile(file);
    setUploadProgress(0);
    setUploadStatus("uploading");

    const formData = new FormData();
    formData.append("file", file);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/teacher/resources/upload", true);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) setUploadProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status === 200) {
        const res = JSON.parse(xhr.responseText);
        setUploadedFileUrl(res.url);
        setUploadStatus("success");
        toast.success("File uploaded successfully!");
      } else {
        setUploadStatus("error");
        toast.error("File upload failed!");
      }
    };
    xhr.onerror = () => { setUploadStatus("error"); toast.error("Network upload error!"); };
    xhr.send(formData);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) triggerFileUpload(file);
  }, [triggerFileUpload]);

  // AI handlers
  const handleGenerate = useCallback(async () => {
    if (!aiForm.subject || (!aiForm.topic && !aiForm.resourceContext)) {
      toast.error("Please fill subject and topic or provide resource notes");
      return;
    }
    setGenerating(true);
    setGeneratedContent(null);
    try {
      const res = await fetch("/api/teacher/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(aiForm),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      const data = await res.json();
      setGeneratedContent(data.content);
      toast.success("Material generated successfully!");
    } catch (err: any) {
      toast.error(err.message || "AI generation failed");
    } finally {
      setGenerating(false);
    }
  }, [aiForm]);

  const handleRefine = useCallback(async (instruction: string) => {
    if (!generatedContent || !instruction.trim()) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/teacher/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...aiForm,
          refinementPrompt: instruction.trim(),
          previousContent: generatedContent,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Refinement failed");
      const data = await res.json();
      setGeneratedContent(data.content);
      setRefinementInput("");
      toast.success("Material updated with your refinements!");
    } catch (err: any) {
      toast.error(err.message || "Refinement failed");
    } finally {
      setGenerating(false);
    }
  }, [aiForm, generatedContent]);

  const handleSaveGenerated = useCallback(async () => {
    if (!generatedContent) return;
    setSavingGenerated(true);
    try {
      const titleText = `${aiForm.topic} - ${aiForm.tool.toUpperCase()}`;
      const res = await fetch("/api/teacher/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: titleText,
          subject: aiForm.subject,
          classLevel: aiForm.classLevel,
          resourceType: aiForm.tool,
          isAIGenerated: true,
          aiPrompt: `Generate ${aiForm.tool} for topic ${aiForm.topic}`,
          aiContent: generatedContent,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      toast.success("Resource saved to library!");
      setShowAIModal(false);
      setGeneratedContent(null);
      fetchResources();
      fetchStats();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingGenerated(false);
    }
  }, [generatedContent, aiForm, fetchResources, fetchStats]);

  // Upload handler
  const handleUpload = useCallback(async () => {
    if (!uploadForm.title) { toast.error("Title is required"); return; }
    const isLinkType = uploadForm.resourceType === "link";
    const finalUrl = isLinkType ? uploadForm.externalUrl : uploadedFileUrl;
    if (!finalUrl) {
      toast.error(isLinkType ? "Please enter an external URL" : "Please upload a resource file first");
      return;
    }
    setUploading(true);
    try {
      const displayTitle = uploadForm.chapterTopic
        ? `${uploadForm.title} (${uploadForm.chapterTopic})`
        : uploadForm.title;
      const res = await fetch("/api/teacher/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: displayTitle,
          description: uploadForm.description,
          subject: uploadForm.subject,
          classLevel: uploadForm.classLevel,
          resourceType: uploadForm.resourceType,
          fileUrl: finalUrl,
          isAIGenerated: false,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      toast.success("Resource added successfully!");
      setShowUploadModal(false);
      setUploadForm({
        title: "",
        description: "",
        subject: uniqueSubjects[0] || "",
        classLevel: uniqueClasses[0]?.label || "",
        resourceType: "pdf",
        chapterTopic: "",
        externalUrl: "",
      });
      setSelectedFile(null);
      setUploadedFileUrl(null);
      setUploadStatus("idle");
      fetchResources();
      fetchStats();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  }, [uploadForm, uploadedFileUrl, uniqueSubjects, uniqueClasses, fetchResources, fetchStats]);

  // Edit handlers
  const handleEditClick = useCallback((resource: Resource) => {
    setEditingResource(resource);
    setEditForm({
      title: resource.title,
      description: resource.description || "",
      subject: resource.subject || "",
      classLevel: resource.classLevel || "",
    });
    setShowEditModal(true);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingResource) return;
    try {
      setResources((prev) =>
        prev.map((r) =>
          r.id === editingResource.id
            ? { ...r, title: editForm.title, description: editForm.description, subject: editForm.subject, classLevel: editForm.classLevel }
            : r
        )
      );
      setShowEditModal(false);
      const res = await fetch(`/api/teacher/resources?id=${editingResource.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editForm.title, description: editForm.description, subject: editForm.subject, classLevel: editForm.classLevel }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to edit");
      toast.success("Resource updated successfully!");
      fetchResources();
    } catch (e: any) {
      toast.error(e.message || "Failed to update resource");
      fetchResources();
    }
  }, [editingResource, editForm, fetchResources]);

  // Delete handlers
  const askDelete = useCallback((id: number, title: string) => {
    setResourceToDelete({ id, title });
    setDeleteModalOpen(true);
  }, []);

  const executeDelete = useCallback(async () => {
    if (!resourceToDelete) return;
    const { id } = resourceToDelete;
    setResources((prev) => prev.filter((r) => r.id !== id));
    setDeleteModalOpen(false);
    try {
      const res = await fetch(`/api/teacher/resources?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      toast.success("Resource deleted successfully");
      fetchStats();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
      fetchResources();
    } finally {
      setResourceToDelete(null);
    }
  }, [resourceToDelete, fetchResources, fetchStats]);

  const handleShare = useCallback((res: Resource) => {
    const text = `📁 Shared Material: *${res.title}*\nSubject: ${res.subject}\nClass: ${res.classLevel}\nAccess Link: ${window.location.origin}${res.fileUrl || ""}`;
    navigator.clipboard.writeText(text);
    toast.success("Sharing details copied to clipboard!");
  }, []);

  const typeIcon = (type: string) => RESOURCE_TYPES.find((r) => r.value === type)?.icon || "📁";

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">

      {/* ── Hero / Header ── */}
      <div className="rounded-2xl border border-cyan-500/15 bg-gradient-to-r from-surface via-surface/60 to-surface px-8 py-6 relative overflow-hidden shadow-lg backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,rgba(6,182,212,0.08),transparent_60%)]" />
        <div className="relative z-10">
          <span className="inline-flex items-center rounded-full bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-3">
            Resource Center
          </span>
          <h1 className="text-2xl font-black tracking-tight text-primary">Resource Library</h1>
          <p className="mt-1 text-xs text-secondary">Upload notes, worksheets, PPTs, and share with your classes.</p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          type="button"
          className="relative z-10 inline-flex items-center gap-2 h-12 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 px-5 text-xs font-black shadow-lg shadow-cyan-400/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shrink-0 max-w-[200px]"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current shrink-0"><path d="M19 11h-6V5h-2v6H5v2h6v6h2v-6h6z" /></svg>
          Upload Resource
        </button>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Total Uploads",
            val: stats.totalUploaded,
            icon: "📁",
            accent: "text-cyan-400",
            glow: "from-cyan-500/5",
          },
          {
            label: "Downloads",
            val: stats.totalDownloads,
            icon: "📥",
            accent: "text-emerald-400",
            glow: "from-emerald-500/5",
          },
          {
            label: "Active Resources",
            val: activeResourcesCount,
            icon: "✅",
            accent: "text-violet-400",
            glow: "from-violet-500/5",
          },
          {
            label: "Most Downloaded",
            val: stats.mostViewed,
            icon: "🔥",
            accent: "text-amber-400",
            glow: "from-amber-500/5",
            truncate: true,
          },
        ].map((c, i) => (
          <div
            key={i}
            className={`rounded-2xl border border-theme bg-gradient-to-br ${c.glow} to-transparent p-5 flex items-center gap-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300`}
          >
            <span className="text-2xl shrink-0">{c.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] uppercase font-bold text-secondary tracking-widest">{c.label}</p>
              <p className={`text-lg font-black mt-0.5 ${c.truncate ? "truncate text-sm" : ""} ${c.accent}`}>
                {c.val}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── AI Teaching Workspace Launcher ── */}
      <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 via-card to-blue-500/10 p-5 shadow-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400 shrink-0 text-xl shadow-inner">
              🪄
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-foreground tracking-tight">AI Teaching Material Workspace</h2>
                <span className="rounded-full bg-cyan-500/20 text-cyan-400 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider border border-cyan-500/30">
                  Subject-Grounded
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Generate topic-specific study notes, diagnostic quizzes, lesson plans, or practice worksheets grounded in your curriculum or uploaded reference notes.
              </p>
            </div>
          </div>
          <button
            onClick={() => { setShowAIModal(true); setGeneratedContent(null); }}
            className="btn-cyan rounded-xl px-5 py-2.5 text-xs font-bold shrink-0 flex items-center gap-2 shadow-lg shadow-cyan-950/20 hover:scale-[1.02] transition"
          >
            <span>✨ Create New AI Material</span>
          </button>
        </div>
      </div>


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
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="h-10 w-full rounded-xl border border-theme bg-hover pl-9 pr-4 text-xs focus-visible:outline-none focus:ring-1 focus:ring-cyan-500 text-primary placeholder:text-secondary/40"
            />
          </div>

          {/* Subject */}
          <select
            value={subjectFilter}
            onChange={(e) => { setSubjectFilter(e.target.value); setPage(1); }}
            className="select-theme h-10 text-xs"
            style={{ width: "170px" }}
          >
            <option value="">All Subjects</option>
            {uniqueSubjects.map((sub) => <option key={sub} value={sub}>{sub}</option>)}
          </select>

          {/* Class */}
          <select
            value={classFilter}
            onChange={(e) => { setClassFilter(e.target.value); setPage(1); }}
            className="select-theme h-10 text-xs"
            style={{ width: "170px" }}
          >
            <option value="">All Classes</option>
            {uniqueClasses.map((cls) => <option key={cls.id} value={cls.label}>{cls.label}</option>)}
          </select>

          {/* Format */}
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="select-theme h-10 text-xs"
            style={{ width: "170px" }}
          >
            <option value="">All Formats</option>
            {RESOURCE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>

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
          </select>

          {/* Result count */}
          {!loading && (
            <span className="ml-auto text-[10px] text-secondary font-semibold whitespace-nowrap">
              {filteredAndSortedResources.length} resource{filteredAndSortedResources.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* ── Library Grid ── */}
      {loading ? (
        <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : filteredAndSortedResources.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-theme bg-surface/30 p-10 text-center max-w-md mx-auto">
          <span className="text-6xl block mb-4 filter drop-shadow-md">📂</span>
          <h3 className="text-sm font-bold text-primary">No resources yet</h3>
          <p className="mt-1.5 text-xs text-secondary max-w-xs mx-auto leading-relaxed">
            Upload study files, slides, or bookmarks to share with your students.
          </p>
          <button
            onClick={() => setShowUploadModal(true)}
            type="button"
            className="mt-5 bg-cyan-400 hover:bg-cyan-300 text-slate-950 rounded-xl px-5 py-2.5 text-xs font-bold transition active:scale-95 shadow-md shadow-cyan-400/20"
          >
            Add First Resource
          </button>
        </div>
      ) : (
        <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAndSortedResources.map((res) => {
            const icon = typeIcon(res.resourceType);
            const colors = RESOURCE_COLORS[res.resourceType] || DEFAULT_COLOR;

            return (
              <div
                key={res.id}
                className="group relative rounded-2xl border border-theme bg-surface hover:border-cyan-500/40 hover:shadow-[0_4px_32px_rgba(6,182,212,0.12)] hover:-translate-y-1 transition-all duration-300 p-5 flex flex-col gap-4"
              >
                {/* Card Top – Icon + Badges */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className={`text-2xl p-3 rounded-xl ring-1 ring-white/5 ${colors.bg} ${colors.text} ${colors.ring} shrink-0`}>
                      {icon}
                    </span>
                    <div className="min-w-0">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ring-1 ${colors.bg} ${colors.text} ${colors.ring}`}>
                        {res.resourceType.replace("_", " ")}
                      </span>
                      <p className="text-[10px] font-semibold text-secondary uppercase tracking-wider mt-0.5 truncate max-w-[140px]">
                        {res.subject}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full border border-theme bg-hover px-2 py-0.5 text-[9px] font-bold text-secondary shrink-0">
                    {res.classLevel}
                  </span>
                </div>

                {/* Title & Date */}
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-primary group-hover:text-cyan-400 transition-colors duration-200 leading-snug line-clamp-2">
                    {res.title}
                  </h3>
                  {res.description && (
                    <p className="text-[11px] text-secondary leading-relaxed line-clamp-2 mt-1.5">
                      {res.description}
                    </p>
                  )}
                  <p className="text-[10px] text-muted mt-2">
                    Uploaded {formatDate(res.createdAt)}
                    {res.isAIGenerated && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 text-[8px] font-bold text-cyan-400 uppercase tracking-wider">AI</span>
                    )}
                  </p>
                </div>

                {/* Stats Row */}
                <div className="flex items-center gap-4 text-[10px] font-semibold text-secondary border-t border-theme/50 pt-3">
                  <span className="flex items-center gap-1" title="Views">
                    <span className="text-sm">👁</span>
                    <span>{res.viewCount}</span>
                  </span>
                  <span className="flex items-center gap-1" title="Downloads">
                    <span className="text-sm">⬇</span>
                    <span>{res.downloadCount}</span>
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {res.isAIGenerated || res.aiContent ? (
                    <button
                      onClick={() => setPreviewResource(res)}
                      type="button"
                      className="flex-1 h-9 text-[11px] font-bold text-cyan-400 border border-cyan-500/25 bg-cyan-500/10 hover:bg-cyan-500/20 rounded-xl flex items-center justify-center gap-1.5 transition active:scale-95"
                    >
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" /></svg>
                      View
                    </button>
                  ) : res.fileUrl ? (
                    <a
                      href={res.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 h-9 text-[11px] font-bold text-cyan-400 border border-cyan-500/25 bg-cyan-500/10 hover:bg-cyan-500/20 rounded-xl flex items-center justify-center gap-1.5 transition active:scale-95"
                    >
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" /></svg>
                      View
                    </a>
                  ) : (
                    <div className="flex-1 h-9 rounded-xl border border-theme bg-hover/30 flex items-center justify-center text-[10px] text-muted">
                      No File
                    </div>
                  )}

                  <ActionIconButton
                    tooltip="Edit Metadata"
                    colorClass="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20"
                    icon="✏️"
                    onClick={() => handleEditClick(res)}
                  />
                  <ActionIconButton
                    tooltip="Copy share link"
                    colorClass="bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 border border-violet-500/20"
                    icon="🔗"
                    onClick={() => handleShare(res)}
                  />
                  <ActionIconButton
                    tooltip="Delete resource"
                    colorClass="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20"
                    icon="🗑️"
                    onClick={() => askDelete(res.id, res.title)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => setPage(p => Math.max(p - 1, 1))}
            disabled={page === 1}
            type="button"
            className="rounded-xl border border-theme bg-surface px-4 py-2 text-xs font-bold disabled:opacity-40 transition active:scale-95 hover:bg-hover"
          >
            ← Previous
          </button>
          <span className="text-xs font-semibold text-secondary">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(p + 1, totalPages))}
            disabled={page === totalPages}
            type="button"
            className="rounded-xl border border-theme bg-surface px-4 py-2 text-xs font-bold disabled:opacity-40 transition active:scale-95 hover:bg-hover"
          >
            Next →
          </button>
        </div>
      )}

      {/* ── AI Generate Modal ── */}
      {showAIModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-border bg-card shadow-2xl animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
            <button
              onClick={() => { setShowAIModal(false); setGeneratedContent(null); }}
              type="button"
              className="absolute right-5 top-5 z-10 flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-hover/50 text-muted-foreground hover:text-foreground transition"
            >
              ✕
            </button>
            <div className="border-b border-border px-6 py-4 shrink-0 bg-background/50 flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-400 text-lg">
                {AI_TOOLS.find(t => t.id === aiForm.tool)?.icon || "✨"}
              </span>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  AI Material Builder — {AI_TOOLS.find(t => t.id === aiForm.tool)?.label}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Generate customized, syllabus-grounded learning materials and question banks.
                </p>
              </div>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Tool Category Selector */}
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Select Material Type
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5 rounded-xl border border-border bg-background/50 p-1.5">
                  {AI_TOOLS.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setAIForm(f => ({ ...f, tool: t.id }))}
                      type="button"
                      className={`rounded-lg py-2 px-1 text-[10px] font-bold text-center transition flex flex-col items-center gap-1 ${
                        aiForm.tool === t.id
                          ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm"
                          : "text-muted-foreground hover:bg-hover hover:text-foreground"
                      }`}
                    >
                      <span className="text-sm">{t.icon}</span>
                      <span className="truncate w-full">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject, Class, Difficulty */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="block space-y-1">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Subject *</span>
                  <select className="select-theme text-xs" value={aiForm.subject} onChange={e => setAIForm(f => ({ ...f, subject: e.target.value }))}>
                    {uniqueSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
                <label className="block space-y-1">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Class / Level *</span>
                  <select className="select-theme text-xs" value={aiForm.classLevel} onChange={e => setAIForm(f => ({ ...f, classLevel: e.target.value }))}>
                    {uniqueClasses.map(c => <option key={c.id} value={c.label}>{c.label}</option>)}
                  </select>
                </label>
                <label className="block space-y-1">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Difficulty Level</span>
                  <select
                    className="select-theme text-xs"
                    value={aiForm.difficultyLevel}
                    onChange={e => setAIForm(f => ({ ...f, difficultyLevel: e.target.value as any }))}
                  >
                    <option value="easy">Easy (Foundational)</option>
                    <option value="medium">Medium (Standard)</option>
                    <option value="hard">Hard (Advanced / Olympiad)</option>
                    <option value="mixed">Mixed (Graduated Difficulty)</option>
                  </select>
                </label>
              </div>

              {/* Topic & Learning Objective */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Topic / Chapter *</span>
                  <input
                    type="text"
                    className="input-theme text-xs"
                    placeholder="e.g. Thermodynamics, Photosynthesis, Quadratic Equations..."
                    value={aiForm.topic}
                    onChange={e => setAIForm(f => ({ ...f, topic: e.target.value }))}
                  />
                </label>
                <label className="block space-y-1">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Learning Objective (Optional)</span>
                  <input
                    type="text"
                    className="input-theme text-xs"
                    placeholder="e.g. Master problem-solving steps & derivations..."
                    value={aiForm.learningObjective}
                    onChange={e => setAIForm(f => ({ ...f, learningObjective: e.target.value }))}
                  />
                </label>
              </div>

              {/* Reference Notes / Context */}
              <label className="block space-y-1">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Reference Notes / Teacher Context (Optional)
                </span>
                <textarea
                  className="textarea-theme text-xs"
                  rows={2}
                  placeholder="Paste textbook excerpts or specific points to ground AI output strictly in your curriculum..."
                  value={aiForm.resourceContext}
                  onChange={e => setAIForm(f => ({ ...f, resourceContext: e.target.value }))}
                />
              </label>

              {/* Generate Button */}
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating || (!aiForm.topic && !aiForm.resourceContext)}
                className="w-full btn-cyan rounded-2xl py-3 text-xs font-bold disabled:opacity-50 transition active:scale-95 shadow-md flex items-center justify-center gap-2"
              >
                {generating ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Generating {AI_TOOLS.find(t => t.id === aiForm.tool)?.label}...
                  </>
                ) : (
                  <>
                    <span>✨</span> Generate {AI_TOOLS.find(t => t.id === aiForm.tool)?.label}
                  </>
                )}
              </button>

              {/* Generated Content & Refinement Section */}
              {generatedContent && (
                <div className="space-y-4 pt-3 border-t border-border animate-in fade-in duration-250">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">Generated Material</span>
                      <div className="flex rounded-lg border border-border bg-background p-0.5 text-[10px] font-semibold">
                        <button
                          type="button"
                          onClick={() => setAiViewMode("preview")}
                          className={`px-2.5 py-1 rounded-md transition ${aiViewMode === "preview" ? "bg-cyan-500/15 text-cyan-400 font-bold" : "text-muted-foreground hover:text-foreground"}`}
                        >
                          👁️ Formatted View
                        </button>
                        <button
                          type="button"
                          onClick={() => setAiViewMode("edit")}
                          className={`px-2.5 py-1 rounded-md transition ${aiViewMode === "edit" ? "bg-cyan-500/15 text-cyan-400 font-bold" : "text-muted-foreground hover:text-foreground"}`}
                        >
                          ✏️ Edit Source
                        </button>
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground">Ready to review & save</span>
                  </div>

                  {/* Formatted View or Editable Textarea */}
                  {aiViewMode === "preview" ? (
                    <div className="max-h-[380px] overflow-y-auto rounded-2xl border border-cyan-500/20 bg-background/60 p-5 scrollbar-hide">
                      <FormattedText text={generatedContent} />
                    </div>
                  ) : (
                    <textarea
                      rows={10}
                      value={generatedContent}
                      onChange={e => setGeneratedContent(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background p-3.5 text-xs text-foreground font-mono leading-relaxed resize-y focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                    />
                  )}

                  {/* Refinement Suggestions */}
                  <div className="space-y-2">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Refine with AI:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        "Make it easier",
                        "Make it harder",
                        "Add more application questions",
                        "Focus on weak concepts",
                        "Create answer key",
                        "Convert to MCQs",
                        "Create a 7-day revision plan",
                      ].map(chip => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => handleRefine(chip)}
                          disabled={generating}
                          className="rounded-lg border border-border bg-hover/40 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground hover:text-cyan-400 hover:border-cyan-500/30 transition disabled:opacity-50"
                        >
                          + {chip}
                        </button>
                      ))}
                    </div>

                    {/* Custom Refinement Input */}
                    <div className="flex gap-2 pt-1">
                      <input
                        type="text"
                        placeholder="Custom instruction (e.g. Add 3 case study questions)..."
                        className="input-theme flex-1 text-xs"
                        value={refinementInput}
                        onChange={e => setRefinementInput(e.target.value)}
                        disabled={generating}
                      />
                      <button
                        type="button"
                        onClick={() => handleRefine(refinementInput)}
                        disabled={generating || !refinementInput.trim()}
                        className="btn-cyan rounded-xl px-4 py-1.5 text-xs font-bold disabled:opacity-50 shrink-0"
                      >
                        Refine
                      </button>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-2 border-t border-border">
                    <button
                      onClick={() => { navigator.clipboard.writeText(generatedContent); toast.success("Copied to clipboard!"); }}
                      type="button"
                      className="flex-1 rounded-xl border border-border bg-card py-2.5 text-xs font-bold text-foreground hover:bg-hover transition active:scale-95"
                    >
                      Copy Content
                    </button>
                    <button
                      onClick={handleSaveGenerated}
                      disabled={savingGenerated}
                      type="button"
                      className="flex-1 btn-cyan rounded-xl py-2.5 text-xs font-bold disabled:opacity-50 transition active:scale-95 shadow-sm"
                    >
                      {savingGenerated ? "Saving..." : "Save to Library"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}


      {/* ── Upload Modal ── */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/85 backdrop-blur-sm">
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-theme bg-surface shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <button
              onClick={() => setShowUploadModal(false)}
              type="button"
              className="absolute right-5 top-5 z-10 flex h-8 w-8 items-center justify-center rounded-lg border border-theme bg-hover text-secondary hover:text-primary transition"
            >
              ✕
            </button>
            <div className="border-b border-theme px-6 py-5 shrink-0">
              <h3 className="text-sm font-bold uppercase tracking-wider text-primary">Upload Material</h3>
              <p className="text-[10px] text-secondary mt-0.5">Share new documents or web links with selected classes.</p>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <label className="block space-y-1">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-secondary">Title *</span>
                <input type="text" className="input-theme" value={uploadForm.title} onChange={e => setUploadForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Gravity Study Guide" />
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="block space-y-1">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-secondary">Subject *</span>
                  <select className="select-theme" value={uploadForm.subject} onChange={e => setUploadForm(f => ({ ...f, subject: e.target.value }))}>
                    {uniqueSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
                <label className="block space-y-1">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-secondary">Class + Section *</span>
                  <select className="select-theme" value={uploadForm.classLevel} onChange={e => setUploadForm(f => ({ ...f, classLevel: e.target.value }))}>
                    {uniqueClasses.map(c => <option key={c.id} value={c.label}>{c.label}</option>)}
                  </select>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <label className="block space-y-1">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-secondary">Resource Type *</span>
                  <select className="select-theme" value={uploadForm.resourceType} onChange={e => setUploadForm(f => ({ ...f, resourceType: e.target.value }))}>
                    {RESOURCE_TYPES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </label>
                <label className="block space-y-1">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-secondary">Chapter / Topic</span>
                  <input type="text" className="input-theme" value={uploadForm.chapterTopic} onChange={e => setUploadForm(f => ({ ...f, chapterTopic: e.target.value }))} placeholder="e.g. Newton Laws" />
                </label>
              </div>
              <label className="block space-y-1">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-secondary">Description</span>
                <textarea className="textarea-theme resize-none" rows={2} value={uploadForm.description} onChange={e => setUploadForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief details about these notes..." />
              </label>
              {uploadForm.resourceType === "link" ? (
                <label className="block space-y-1 animate-in slide-in-from-top-2 duration-150">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-secondary">External URL *</span>
                  <input type="text" className="input-theme" value={uploadForm.externalUrl} onChange={e => setUploadForm(f => ({ ...f, externalUrl: e.target.value }))} placeholder="https://..." />
                </label>
              ) : (
                <div className="space-y-2.5">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-secondary">File Attachment</span>
                  <div
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    className="border border-dashed border-theme rounded-2xl p-6 text-center bg-hover/20 cursor-pointer hover:bg-hover/40 transition duration-150 select-none"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input type="file" ref={fileInputRef} className="hidden" onChange={e => e.target.files?.[0] && triggerFileUpload(e.target.files[0])} />
                    <p className="text-2xl mb-1.5">📁</p>
                    <p className="text-xs font-bold text-primary">Drag & drop or click to choose file</p>
                    <p className="text-[9px] text-secondary mt-1">PDF, DOCX, PPTX, Images, Videos up to 20MB</p>
                  </div>
                  {selectedFile && (
                    <div className="rounded-xl border border-theme bg-hover/20 p-3 space-y-2 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between text-xs text-primary font-bold">
                        <span className="truncate max-w-[240px]">{selectedFile.name}</span>
                        <span>{Math.round((selectedFile.size / 1024 / 1024) * 100) / 100} MB</span>
                      </div>
                      {uploadStatus === "uploading" && (
                        <div className="space-y-1">
                          <div className="h-1.5 w-full bg-hover rounded-full overflow-hidden">
                            <div className="h-full bg-cyan-400 transition-all duration-150" style={{ width: `${uploadProgress}%` }} />
                          </div>
                          <p className="text-[9px] text-cyan-400 font-bold text-right">Uploading: {uploadProgress}%</p>
                        </div>
                      )}
                      {uploadStatus === "success" && <p className="text-[9px] text-emerald-400 font-bold">✓ Upload complete. Ready to save.</p>}
                      {uploadStatus === "error" && <p className="text-[9px] text-rose-400 font-bold">✗ Upload failed. Try again.</p>}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="border-t border-theme px-6 py-4 flex justify-end gap-3 bg-hover/20 shrink-0">
              <button
                onClick={() => setShowUploadModal(false)}
                type="button"
                className="rounded-xl border border-theme bg-surface px-5 py-2.5 text-xs font-bold hover:bg-hover transition active:scale-95"
              >
                Discard
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading || (uploadForm.resourceType !== "link" && uploadStatus !== "success")}
                type="button"
                className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 rounded-xl px-6 py-2.5 text-xs font-bold disabled:opacity-50 transition active:scale-95 shadow-sm"
              >
                {uploading ? "Saving..." : "Add Resource"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {showEditModal && editingResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/85 backdrop-blur-sm">
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-theme bg-surface shadow-2xl animate-in zoom-in-95 duration-200 p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-primary">Edit Resource</h3>
            <label className="block space-y-1">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-secondary">Title *</span>
              <input type="text" className="input-theme" value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} />
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className="block space-y-1">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-secondary">Subject *</span>
                <select className="select-theme" value={editForm.subject} onChange={e => setEditForm(f => ({ ...f, subject: e.target.value }))}>
                  {uniqueSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label className="block space-y-1">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-secondary">Class Level *</span>
                <select className="select-theme" value={editForm.classLevel} onChange={e => setEditForm(f => ({ ...f, classLevel: e.target.value }))}>
                  {uniqueClasses.map(c => <option key={c.id} value={c.label}>{c.label}</option>)}
                </select>
              </label>
            </div>
            <label className="block space-y-1">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-secondary">Description</span>
              <textarea className="textarea-theme resize-none" rows={2} value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
            </label>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowEditModal(false)} type="button" className="rounded-xl border border-theme bg-surface px-5 py-2.5 text-xs font-bold hover:bg-hover transition active:scale-95">Cancel</button>
              <button onClick={handleSaveEdit} type="button" className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 rounded-xl px-5 py-2.5 text-xs font-bold transition active:scale-95 shadow-sm">Save Updates</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Preview Modal ── */}
      {previewResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/85 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-theme bg-surface shadow-2xl animate-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col">
            <button
              onClick={() => setPreviewResource(null)}
              type="button"
              className="absolute right-5 top-5 z-10 flex h-8 w-8 items-center justify-center rounded-lg border border-theme bg-hover text-secondary hover:text-primary transition"
            >
              ✕
            </button>
            <div className="border-b border-theme px-6 py-5 shrink-0">
              <h3 className="text-sm font-bold uppercase tracking-wider text-primary">{previewResource.title}</h3>
              <p className="text-[10px] text-secondary mt-0.5">{previewResource.subject} · {previewResource.classLevel}</p>
            </div>
            <div className="flex-1 overflow-y-auto rounded-2xl border border-theme bg-hover/10 p-6 m-6">
              {previewResource.aiContent ? (
                <FormattedText text={previewResource.aiContent} />
              ) : previewResource.description ? (
                <p className="text-xs text-primary leading-relaxed">{previewResource.description}</p>
              ) : (
                <p className="text-xs text-muted italic text-center py-6">No details available.</p>
              )}
            </div>
            <div className="border-t border-theme px-6 py-4 flex justify-end gap-3 bg-hover/20 shrink-0">
              <button
                onClick={() => setPreviewResource(null)}
                type="button"
                className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 rounded-xl px-6 py-2.5 text-xs font-bold transition active:scale-95 shadow-sm"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Modal ── */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        title="Delete Resource?"
        message={`Are you sure you want to delete "${resourceToDelete?.title}"? This action cannot be undone.`}
        onConfirm={executeDelete}
        onCancel={() => { setDeleteModalOpen(false); setResourceToDelete(null); }}
      />
    </div>
  );
}
