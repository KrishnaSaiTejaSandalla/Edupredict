"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import DeleteConfirmModal from "@/components/ui/DeleteConfirmModal";

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
  createdAt: string;
};

type Props = {
  teacherId: number | null;
  department: string | null;
};

type AIGenerateForm = {
  tool: "notes" | "quiz" | "worksheet" | "lesson_plan";
  subject: string;
  classLevel: string;
  topic: string;
};

const RESOURCE_TYPES = [
  { value: "notes", label: "Notes", icon: "📝" },
  { value: "quiz", label: "Quiz", icon: "❓" },
  { value: "worksheet", label: "Worksheet", icon: "📄" },
  { value: "lesson_plan", label: "Lesson Plan", icon: "📋" },
  { value: "other", label: "Other", icon: "📁" },
];

const AI_TOOLS = [
  { id: "notes" as const, label: "Generate Notes", desc: "Create structured study notes", icon: "📝", color: "from-blue-500/15 border-blue-500/20 text-blue-400" },
  { id: "quiz" as const, label: "Generate Quiz", desc: "Create MCQ/short answer questions", icon: "❓", color: "from-violet-500/15 border-violet-500/20 text-violet-400" },
  { id: "worksheet" as const, label: "Generate Worksheet", desc: "Create practice exercises", icon: "📄", color: "from-emerald-500/15 border-emerald-500/20 text-emerald-400" },
  { id: "lesson_plan" as const, label: "Generate Lesson Plan", desc: "Create structured lesson plan", icon: "📋", color: "from-amber-500/15 border-amber-500/20 text-amber-400" },
];

export default function ResourcesClient({ teacherId, department }: Props) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // AI Toolkit Modal
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiForm, setAIForm] = useState<AIGenerateForm>({
    tool: "notes",
    subject: department || "",
    classLevel: "",
    topic: "",
  });
  const [generating, setGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [savingGenerated, setSavingGenerated] = useState(false);

  // Upload Modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState({ title: "", description: "", subject: "", classLevel: "", resourceType: "notes" });
  const [uploading, setUploading] = useState(false);

  // Preview Modal
  const [previewResource, setPreviewResource] = useState<Resource | null>(null);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [resourceToDelete, setResourceToDelete] = useState<{ id: number; title: string } | null>(null);

  const fetchResources = () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    if (search) params.set("search", search);
    if (typeFilter) params.set("resourceType", typeFilter);

    fetch(`/api/teacher/resources?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setResources(data.items || []);
        setTotalPages(data.pages || 1);
      })
      .catch(() => toast.error("Failed to load resources"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchResources();
  }, [page, search, typeFilter]);

  const handleGenerate = async () => {
    if (!aiForm.subject || !aiForm.topic) {
      toast.error("Please fill subject and topic");
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
    } catch (err: any) {
      toast.error(err.message || "AI generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveGenerated = async () => {
    if (!generatedContent) return;
    setSavingGenerated(true);
    try {
      const res = await fetch("/api/teacher/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${aiForm.topic} - ${RESOURCE_TYPES.find(r => r.value === aiForm.tool)?.label || aiForm.tool}`,
          subject: aiForm.subject,
          classLevel: aiForm.classLevel,
          resourceType: aiForm.tool,
          isAIGenerated: true,
          aiPrompt: `${aiForm.tool} on ${aiForm.topic} for ${aiForm.subject} ${aiForm.classLevel}`,
          aiContent: generatedContent,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      toast.success("Resource saved to library!");
      setShowAIModal(false);
      setGeneratedContent(null);
      fetchResources();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingGenerated(false);
    }
  };

  const handleUpload = async () => {
    if (!uploadForm.title || !uploadForm.resourceType) {
      toast.error("Title and resource type are required");
      return;
    }
    setUploading(true);
    try {
      const res = await fetch("/api/teacher/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...uploadForm, isAIGenerated: false }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      toast.success("Resource added!");
      setShowUploadModal(false);
      setUploadForm({ title: "", description: "", subject: "", classLevel: "", resourceType: "notes" });
      fetchResources();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const askDelete = (id: number, title: string) => {
    setResourceToDelete({ id, title });
    setDeleteModalOpen(true);
  };

  const executeDelete = async () => {
    if (!resourceToDelete) return;
    const { id } = resourceToDelete;
    setDeleteModalOpen(false);
    try {
      const res = await fetch(`/api/teacher/resources?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      toast.success("Resource deleted");
      
      setResources((prev) => {
        const updated = prev.filter((r) => r.id !== id);
        if (updated.length === 0 && page > 1) {
          setPage((p) => p - 1);
        } else {
          fetchResources();
        }
        return updated;
      });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setResourceToDelete(null);
    }
  };

  const typeIcon = (type: string) => RESOURCE_TYPES.find((r) => r.value === type)?.icon || "📁";
  const typeLabel = (type: string) => RESOURCE_TYPES.find((r) => r.value === type)?.label || type;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-400">Faculty Portal</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Resources</h1>
        <p className="mt-2 text-sm text-muted-foreground">Build your teaching material library with AI-powered content generation.</p>
      </div>

      {/* AI Toolkit */}
      <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/5 via-cyan-500/5 to-blue-500/5 p-6 space-y-5">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21m0 0l-.813-5.096L3 15.094l5.096-.813L9 9.125l.813 5.156L15 15.094l-5.188.81Z" />
            </svg>
          </span>
          <div>
            <h2 className="text-base font-bold tracking-tight text-foreground">AI Teaching Toolkit</h2>
            <p className="text-xs text-muted-foreground">Generate structured notes, quizzes, or worksheets using Artificial Intelligence</p>
          </div>
        </div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {AI_TOOLS.map((tool) => (
            <button
              key={tool.id}
              onClick={() => { setAIForm(f => ({ ...f, tool: tool.id })); setShowAIModal(true); setGeneratedContent(null); }}
              className={`group rounded-2xl border bg-card p-5 text-left hover:-translate-y-1 transition-all duration-300 hover:shadow-md ${tool.color}`}
            >
              <span className="text-2xl mb-3 block">{tool.icon}</span>
              <p className="text-xs font-bold text-foreground group-hover:text-cyan-400 transition">{tool.label}</p>
              <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{tool.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Resource Library Header */}
      <div className="border-b border-border pb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">Resource Library</h2>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground/50">
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.602 10.602Z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search resources..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm focus-visible:outline-none focus:ring-accent focus:border-transparent"
            />
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="select-theme w-full sm:w-44"
          >
            <option value="">All Types</option>
            {RESOURCE_TYPES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        {/* Add Resource Button */}
        <button
          onClick={() => setShowUploadModal(true)}
          className="rounded-xl btn-blue px-5 py-3 text-xs font-bold whitespace-nowrap flex items-center justify-center gap-1.5 shrink-0 self-start sm:self-auto w-full sm:w-auto"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M19 11h-6V5h-2v6H5v2h6v6h2v-6h6z" /></svg>
          Add Resource
        </button>
      </div>

      {/* Resources Grid */}
      {loading ? (
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-36 rounded-2xl" />)}
        </div>
      ) : resources.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border bg-card p-16 text-center shadow-sm max-w-lg mx-auto">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-hover text-muted-foreground text-2xl">📁</div>
          <h3 className="text-sm font-bold text-foreground">No resources available yet.</h3>
          <p className="mt-2 text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
            Use the AI Toolkit above to generate teaching materials or add your own resources.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {resources.map((resource) => (
            <div
              key={resource.id}
              className="group rounded-2xl border border-border bg-card hover:border-cyan-500/30 hover:-translate-y-1 transition-all duration-300 p-5 shadow-sm hover:shadow-lg flex flex-col justify-between min-h-[160px]"
            >
              <div>
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-xl shrink-0">{typeIcon(resource.resourceType)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-foreground group-hover:text-cyan-400 transition truncate">{resource.title}</p>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">{resource.subject || "N/A"} {resource.classLevel ? `· ${resource.classLevel}` : ""}</p>
                  </div>
                  <button
                    onClick={() => askDelete(resource.id, resource.title)}
                    className="shrink-0 opacity-0 group-hover:opacity-100 rounded-lg p-1 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition"
                    title="Delete Resource"
                  >
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current"><path d="M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-3.5l-1-1zM18 7H6v12c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7z" /></svg>
                  </button>
                </div>

                {resource.description && (
                  <p className="text-xs text-secondary leading-relaxed line-clamp-2 mb-4">{resource.description}</p>
                )}
              </div>

              <div className="space-y-3.5">
                <div className="flex items-center gap-2">
                  <span className={`rounded-lg border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${resource.isAIGenerated ? "bg-cyan-500/10 text-cyan-500 dark:text-cyan-400 border-cyan-500/20" : "bg-violet-500/10 text-violet-500 dark:text-violet-400 border-violet-500/20"
                    }`}>
                    {resource.isAIGenerated ? "✨ AI Generated" : typeLabel(resource.resourceType)}
                  </span>
                  <span className="text-[10px] font-medium text-muted-foreground ml-auto">{resource.downloadCount} views</span>
                </div>

                {resource.aiContent && (
                  <button
                    onClick={() => setPreviewResource(resource)}
                    className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 border border-cyan-500/20 bg-cyan-500/10 rounded-xl px-3 py-1.5 transition w-full text-center"
                  >
                    Preview Content
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground pt-4 border-t border-border mt-4 w-full">
          <div>
            {page > 1 && (
              <button
                onClick={() => setPage(p => p - 1)}
                className="rounded-xl border border-border bg-card px-4 py-2.5 hover:bg-hover transition duration-150"
              >
                ← Previous
              </button>
            )}
          </div>
          <span className="tabular-nums">Page {page} of {totalPages}</span>
          <div>
            {page < totalPages && (
              <button
                onClick={() => setPage(p => p + 1)}
                className="rounded-xl border border-border bg-card px-4 py-2.5 hover:bg-hover transition duration-150"
              >
                Next →
              </button>
            )}
          </div>
        </div>
      )}

      {/* AI Generate Modal */}
      {showAIModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm transition-all duration-300">
          <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-border bg-card shadow-2xl shadow-black/40 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            {/* Close Button */}
            <button
              onClick={() => { setShowAIModal(false); setGeneratedContent(null); }}
              className="absolute right-5 top-5 z-10 flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-hover text-muted-foreground hover:text-foreground hover:bg-background transition duration-200"
            >
              ✕
            </button>

            {/* Header */}
            <div className="border-b border-border px-6 py-5 shrink-0">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                {AI_TOOLS.find(t => t.id === aiForm.tool)?.icon} {AI_TOOLS.find(t => t.id === aiForm.tool)?.label}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">AI-powered content generator</p>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Tool selector */}
              <div className="grid grid-cols-4 gap-1 rounded-xl border border-border bg-hover/20 p-1 shrink-0">
                {AI_TOOLS.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setAIForm(f => ({ ...f, tool: t.id }))}
                    className={`rounded-lg py-2.5 text-[10px] font-bold text-center transition ${aiForm.tool === t.id ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-sm" : "text-secondary hover:bg-hover hover:text-primary"}`}
                  >
                    {t.icon} {t.label.replace("Generate ", "")}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4 shrink-0">
                <label className="block space-y-1.5">
                  <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Subject *</span>
                  <input type="text" className="input-theme" value={aiForm.subject} onChange={e => setAIForm(f => ({ ...f, subject: e.target.value }))} placeholder="e.g. Mathematics" />
                </label>
                <label className="block space-y-1.5">
                  <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Class / Level</span>
                  <input type="text" className="input-theme" value={aiForm.classLevel} onChange={e => setAIForm(f => ({ ...f, classLevel: e.target.value }))} placeholder="e.g. Class 8" />
                </label>
              </div>
              <label className="block space-y-1.5 shrink-0">
                <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Topic *</span>
                <input type="text" className="input-theme" value={aiForm.topic} onChange={e => setAIForm(f => ({ ...f, topic: e.target.value }))} placeholder="e.g. Quadratic Equations, Photosynthesis..." />
              </label>

              <button
                onClick={handleGenerate}
                disabled={generating || !aiForm.subject || !aiForm.topic}
                className="btn-cyan w-full rounded-xl py-3 text-xs font-bold whitespace-nowrap disabled:opacity-50 flex items-center justify-center gap-2 shrink-0"
              >
                {generating ? (
                  <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Generating content...</>
                ) : "Generate Content"}
              </button>

              {generatedContent && (
                <div className="space-y-4 pt-2 shrink-0 animate-in fade-in duration-200">
                  <div className="rounded-xl border border-border bg-hover/20 p-4 max-h-60 overflow-y-auto">
                    <pre className="text-xs text-foreground leading-relaxed whitespace-pre-wrap font-sans">{generatedContent}</pre>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => { navigator.clipboard.writeText(generatedContent); toast.success("Copied to clipboard!"); }}
                      className="flex-1 rounded-xl border border-border bg-background py-2.5 text-xs font-bold text-foreground hover:bg-hover transition duration-200"
                    >
                      Copy to Clipboard
                    </button>
                    <button
                      onClick={handleSaveGenerated}
                      disabled={savingGenerated}
                      className="flex-1 btn-cyan rounded-xl py-2.5 text-xs font-bold whitespace-nowrap disabled:opacity-50"
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

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm transition-all duration-300">
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-border bg-card shadow-2xl shadow-black/40 animate-in fade-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button
              onClick={() => setShowUploadModal(false)}
              className="absolute right-5 top-5 z-10 flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-hover text-muted-foreground hover:text-foreground hover:bg-background transition duration-200"
            >
              ✕
            </button>

            {/* Header */}
            <div className="border-b border-border px-6 py-5">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">Add Resource</h3>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              <label className="block space-y-1.5">
                <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Title *</span>
                <input type="text" className="input-theme" value={uploadForm.title} onChange={e => setUploadForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Class Notes - Algebra" />
              </label>
              <div className="grid grid-cols-3 gap-4">
                <label className="block space-y-1.5">
                  <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Subject</span>
                  <input type="text" className="input-theme" value={uploadForm.subject} onChange={e => setUploadForm(f => ({ ...f, subject: e.target.value }))} placeholder="e.g. Math" />
                </label>
                <label className="block space-y-1.5">
                  <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Class / Level</span>
                  <input type="text" className="input-theme" value={uploadForm.classLevel} onChange={e => setUploadForm(f => ({ ...f, classLevel: e.target.value }))} placeholder="e.g. Class 8A" />
                </label>
                <label className="block space-y-1.5">
                  <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type *</span>
                  <select className="select-theme" value={uploadForm.resourceType} onChange={e => setUploadForm(f => ({ ...f, resourceType: e.target.value }))}>
                    {RESOURCE_TYPES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </label>
              </div>
              <label className="block space-y-1.5">
                <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</span>
                <textarea className="textarea-theme" rows={2} value={uploadForm.description} onChange={e => setUploadForm(f => ({ ...f, description: e.target.value }))} placeholder="Provide instructions or description..." />
              </label>
            </div>

            {/* Footer */}
            <div className="border-t border-border px-6 py-4 flex justify-end gap-3 bg-background/50">
              <button
                onClick={() => setShowUploadModal(false)}
                className="rounded-xl border border-border bg-background px-5 py-2.5 text-xs font-bold text-foreground hover:bg-hover transition duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="btn-cyan rounded-xl px-5 py-2.5 text-xs font-bold whitespace-nowrap disabled:opacity-50"
              >
                {uploading ? "Adding..." : "Add Resource"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content Preview Modal */}
      {previewResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm transition-all duration-300">
          <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-border bg-card shadow-2xl shadow-black/40 animate-in fade-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col">
            {/* Close Button */}
            <button
              onClick={() => setPreviewResource(null)}
              className="absolute right-5 top-5 z-10 flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-hover text-muted-foreground hover:text-foreground hover:bg-background transition duration-200"
            >
              ✕
            </button>

            {/* Header */}
            <div className="border-b border-border px-6 py-5 shrink-0">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">{previewResource.title}</h3>
              <div className="flex gap-2 mt-1.5">
                <span className="rounded-lg bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 text-[9px] font-bold text-cyan-500 dark:text-cyan-400 uppercase tracking-wider">✨ AI Generated</span>
                <span className="text-[10px] text-muted-foreground font-semibold">{previewResource.subject}</span>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto rounded-xl border border-border bg-hover/20 p-6 m-6">
              <pre className="text-xs text-foreground leading-relaxed whitespace-pre-wrap font-sans">{previewResource.aiContent}</pre>
            </div>

            {/* Footer */}
            <div className="border-t border-border px-6 py-4 flex justify-end gap-3 bg-background/50 shrink-0">
              <button
                onClick={() => { navigator.clipboard.writeText(previewResource.aiContent || ""); toast.success("Copied to clipboard!"); }}
                className="rounded-xl border border-border bg-background px-5 py-2.5 text-xs font-bold text-foreground hover:bg-hover transition duration-200"
              >
                Copy Content
              </button>
              <button
                onClick={() => setPreviewResource(null)}
                className="btn-cyan rounded-xl px-5 py-2.5 text-xs font-bold whitespace-nowrap"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        title="Delete Resource?"
        message={`Are you sure you want to delete the resource "${resourceToDelete?.title}"? This action cannot be undone.`}
        onConfirm={() => { executeDelete(); }}
        onCancel={() => { setDeleteModalOpen(false); setResourceToDelete(null); }}
      />
    </div>
  );
}
