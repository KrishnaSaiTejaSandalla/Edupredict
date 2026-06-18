"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";

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

  useEffect(() => { fetchResources(); }, [page, search, typeFilter]);

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

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this resource?")) return;
    try {
      const res = await fetch(`/api/teacher/resources?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      toast.success("Resource deleted");
      fetchResources();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const typeIcon = (type: string) => RESOURCE_TYPES.find((r) => r.value === type)?.icon || "📁";
  const typeLabel = (type: string) => RESOURCE_TYPES.find((r) => r.value === type)?.label || type;

  return (
    <main className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8 space-y-8 transition-colors duration-200">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-500 dark:text-cyan-400">Faculty Portal</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Resources</h1>
        <p className="mt-2 text-sm text-muted-foreground">Build your teaching material library with AI-powered content generation.</p>
      </div>

      {/* AI Toolkit */}
      <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/5 to-blue-500/5 p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21m0 0l-.813-5.096L3 15.094l5.096-.813L9 9.125l.813 5.156L15 15.094l-5.188.81Z" />
            </svg>
          </span>
          <div>
            <h2 className="text-base font-semibold text-foreground">AI Teaching Toolkit</h2>
            <p className="text-xs text-muted-foreground">Generate teaching materials instantly with AI</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {AI_TOOLS.map((tool) => (
            <button
              key={tool.id}
              onClick={() => { setAIForm(f => ({ ...f, tool: tool.id })); setShowAIModal(true); setGeneratedContent(null); }}
              className={`group rounded-xl border bg-gradient-to-br p-4 text-left hover:-translate-y-0.5 transition-all duration-200 hover:shadow-lg ${tool.color}`}
            >
              <span className="text-xl mb-2 block">{tool.icon}</span>
              <p className="text-xs font-bold text-foreground group-hover:text-cyan-400 transition">{tool.label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{tool.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Resource Library Header */}
      <div className="border-b border-theme pb-4">
        <h2 className="text-lg font-bold text-foreground">Resource Library</h2>
      </div>

      {/* Toolbar Row */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.602 10.602Z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search resources..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="h-10 w-full rounded-xl border border-theme bg-surface pl-9 pr-3 text-xs text-primary outline-none focus:border-cyan-500 placeholder:text-muted transition-all"
            />
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="h-10 rounded-xl border border-theme bg-surface px-3 text-xs text-primary outline-none focus:border-cyan-500 sm:max-w-[180px]"
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
          className="h-10 rounded-xl btn-blue px-4 py-2 text-xs font-bold flex items-center justify-center gap-1.5 shrink-0 self-start sm:self-auto w-full sm:w-auto"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M19 11h-6V5h-2v6H5v2h6v6h2v-6h6z" /></svg>
          Add Resource
        </button>
      </div>

      {/* Resources Grid */}
      {loading ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1,2,3,4].map(i => <div key={i} className="skeleton h-36 rounded-2xl" />)}
        </div>
      ) : resources.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-theme bg-surface p-16 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-hover text-2xl">📁</div>
          <h3 className="text-base font-semibold text-primary">No Resources Yet</h3>
          <p className="mt-2 text-sm text-secondary max-w-sm mx-auto">
            Use the AI Toolkit above to generate teaching materials or add your own resources.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {resources.map((resource) => (
            <div
              key={resource.id}
              className="group rounded-2xl border border-border bg-card hover:border-cyan-500/30 hover:-translate-y-1 transition-all duration-300 p-5 shadow-sm hover:shadow-lg flex flex-col"
            >
              <div className="flex items-start gap-3 mb-3">
                <span className="text-xl shrink-0">{typeIcon(resource.resourceType)}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-foreground group-hover:text-cyan-400 transition truncate">{resource.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{resource.subject || "N/A"} {resource.classLevel ? `· ${resource.classLevel}` : ""}</p>
                </div>
                <button
                  onClick={() => handleDelete(resource.id)}
                  className="shrink-0 opacity-0 group-hover:opacity-100 rounded-lg p-1 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current"><path d="M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-3.5l-1-1zM18 7H6v12c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7z"/></svg>
                </button>
              </div>

              {resource.description && (
                <p className="text-[10px] text-secondary line-clamp-2 mb-3">{resource.description}</p>
              )}

              <div className="mt-auto flex items-center gap-2">
                <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${
                  resource.isAIGenerated ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-violet-500/10 text-violet-400 border-violet-500/20"
                }`}>
                  {resource.isAIGenerated ? "✨ AI" : typeLabel(resource.resourceType)}
                </span>
                <span className="text-[9px] text-muted-foreground ml-auto">{resource.downloadCount} views</span>
              </div>

              {resource.aiContent && (
                <button
                  onClick={() => setPreviewResource(resource)}
                  className="mt-3 text-[10px] font-semibold text-cyan-400 hover:text-cyan-300 border border-cyan-500/20 bg-cyan-500/10 rounded-lg px-3 py-1.5 transition w-full text-center"
                >
                  Preview Content
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-secondary border border-subtle hover:bg-hover disabled:opacity-30 transition">← Prev</button>
          <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-secondary border border-subtle hover:bg-hover disabled:opacity-30 transition">Next →</button>
        </div>
      )}

      {/* AI Generate Modal */}
      {showAIModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-border bg-card shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-foreground">
                  {AI_TOOLS.find(t => t.id === aiForm.tool)?.icon} {AI_TOOLS.find(t => t.id === aiForm.tool)?.label}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">AI-powered content generation</p>
              </div>
              <button onClick={() => { setShowAIModal(false); setGeneratedContent(null); }} className="text-muted-foreground hover:text-foreground transition">
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
              </button>
            </div>

            {/* Tool selector */}
            <div className="grid grid-cols-4 gap-1 rounded-xl border border-subtle bg-hover p-1">
              {AI_TOOLS.map(t => (
                <button key={t.id} onClick={() => setAIForm(f => ({ ...f, tool: t.id }))} className={`rounded-lg py-2 text-[10px] font-semibold text-center transition ${aiForm.tool === t.id ? "bg-cyan-500/20 text-cyan-400" : "text-muted-foreground hover:text-foreground"}`}>
                  {t.icon} {t.label.replace("Generate ", "")}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Subject *</span>
                <input type="text" className="input-theme" value={aiForm.subject} onChange={e => setAIForm(f => ({ ...f, subject: e.target.value }))} placeholder="e.g. Mathematics" />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Class / Level</span>
                <input type="text" className="input-theme" value={aiForm.classLevel} onChange={e => setAIForm(f => ({ ...f, classLevel: e.target.value }))} placeholder="e.g. Class 8" />
              </label>
            </div>
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Topic *</span>
              <input type="text" className="input-theme" value={aiForm.topic} onChange={e => setAIForm(f => ({ ...f, topic: e.target.value }))} placeholder="e.g. Quadratic Equations, Photosynthesis..." />
            </label>

            <button onClick={handleGenerate} disabled={generating || !aiForm.subject || !aiForm.topic} className="btn-cyan w-full rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
              {generating ? (
                <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Generating...</>
              ) : "Generate Content"}
            </button>

            {generatedContent && (
              <div className="space-y-3">
                <div className="rounded-xl border border-subtle bg-hover/30 p-4 max-h-60 overflow-y-auto">
                  <pre className="text-xs text-foreground leading-relaxed whitespace-pre-wrap font-sans">{generatedContent}</pre>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { navigator.clipboard.writeText(generatedContent); toast.success("Copied!"); }} className="flex-1 rounded-xl border border-subtle py-2 text-xs font-semibold text-secondary hover:bg-hover transition">Copy</button>
                  <button onClick={handleSaveGenerated} disabled={savingGenerated} className="flex-1 btn-cyan rounded-xl py-2 text-xs font-semibold disabled:opacity-50">{savingGenerated ? "Saving..." : "Save to Library"}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground">Add Resource</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-muted-foreground hover:text-foreground transition">
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
              </button>
            </div>
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Title *</span>
              <input type="text" className="input-theme" value={uploadForm.title} onChange={e => setUploadForm(f => ({ ...f, title: e.target.value }))} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Subject</span>
                <input type="text" className="input-theme" value={uploadForm.subject} onChange={e => setUploadForm(f => ({ ...f, subject: e.target.value }))} />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Type *</span>
                <select className="select-theme" value={uploadForm.resourceType} onChange={e => setUploadForm(f => ({ ...f, resourceType: e.target.value }))}>
                  {RESOURCE_TYPES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </label>
            </div>
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Description</span>
              <textarea className="textarea-theme" rows={2} value={uploadForm.description} onChange={e => setUploadForm(f => ({ ...f, description: e.target.value }))} />
            </label>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowUploadModal(false)} className="rounded-xl border border-subtle px-4 py-2 text-xs font-semibold text-secondary hover:bg-hover transition">Cancel</button>
              <button onClick={handleUpload} disabled={uploading} className="btn-cyan rounded-xl px-5 py-2 text-xs font-semibold disabled:opacity-50">{uploading ? "Adding..." : "Add Resource"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Content Preview Modal */}
      {previewResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-start justify-between gap-3 shrink-0">
              <div>
                <h3 className="text-base font-bold text-foreground">{previewResource.title}</h3>
                <div className="flex gap-2 mt-1">
                  <span className="rounded-full bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 text-[9px] font-bold text-cyan-400">✨ AI Generated</span>
                  <span className="text-[10px] text-muted-foreground">{previewResource.subject}</span>
                </div>
              </div>
              <button onClick={() => setPreviewResource(null)} className="text-muted-foreground hover:text-foreground transition shrink-0">
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto rounded-xl border border-subtle bg-hover/30 p-4">
              <pre className="text-xs text-foreground leading-relaxed whitespace-pre-wrap font-sans">{previewResource.aiContent}</pre>
            </div>
            <div className="shrink-0 flex justify-end gap-2">
              <button onClick={() => { navigator.clipboard.writeText(previewResource.aiContent || ""); toast.success("Copied!"); }} className="rounded-xl border border-subtle px-4 py-2 text-xs font-semibold text-secondary hover:bg-hover transition">Copy Content</button>
              <button onClick={() => setPreviewResource(null)} className="btn-cyan rounded-xl px-5 py-2 text-xs font-semibold">Close</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
