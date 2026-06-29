"use client";

import { useState, useTransition, useEffect } from "react";
import PageHeader from "@/components/shared/PageHeader";
import { toast } from "sonner";

type ResourceType = {
  id: number;
  title: string;
  description: string | null;
  fileUrl: string | null;
  resourceType: string;
  subject: string | null;
  classLevel: string | null;
  createdAt: Date;
  downloadCount: number;
};

type NoteType = {
  id: number;
  subjectName: string | null;
  topic: string;
  noteType: string;
  title: string;
  content: string;
  createdAt: Date;
};

type Props = {
  subjects: string[];
  initialRecent: ResourceType[];
  initialPopular: ResourceType[];
  initialRecommended: ResourceType[];
  initialNotes: NoteType[];
  weakSubjects: string[];
  recentTopics: { topic: string; subject: string }[];
};

export default function StudentResourcesClient({
  subjects,
  initialRecent,
  initialPopular,
  initialRecommended,
  initialNotes,
  weakSubjects,
  recentTopics,
}: Props) {
  const [activeTab, setActiveTab] = useState<"library" | "ai">("library");
  const [notes, setNotes] = useState<NoteType[]>(initialNotes);
  const [selectedNote, setSelectedNote] = useState<NoteType | null>(initialNotes[0] || null);

  // Classroom Files Filters
  const [libSearchQuery, setLibSearchQuery] = useState("");
  const [libSelectedSubject, setLibSelectedSubject] = useState("all");

  // Form states
  const [subject, setSubject] = useState(subjects[0] || "");
  const [topic, setTopic] = useState("");
  const [style, setStyle] = useState("cheatsheet");
  const [isPending, startTransition] = useTransition();

  const handleGenerate = () => {
    if (!subject) {
      toast.error("Please select a subject first.");
      return;
    }
    if (!topic.trim()) {
      toast.error("Please enter a topic.");
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/student/ai-resources", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject, topic, noteType: style }),
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || "Failed to generate notes");
        }

        const data = await response.json();
        toast.success("AI generated study notes successfully! 🚀");
        setTopic("");

        const newNote: NoteType = {
          id: Date.now(),
          subjectName: subject,
          topic,
          noteType: style,
          title: data.title,
          content: data.content,
          createdAt: new Date(),
        };

        setNotes((prev) => [newNote, ...prev]);
        setSelectedNote(newNote);
      } catch (e: any) {
        toast.error(e.message || "Something went wrong.");
      }
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard! 📋");
  };

  // Helper to filter classroom files
  const filterLib = (list: ResourceType[]) => {
    return list.filter((res) => {
      const matchesSearch =
        res.title.toLowerCase().includes(libSearchQuery.toLowerCase()) ||
        (res.description || "").toLowerCase().includes(libSearchQuery.toLowerCase());
      const matchesSubject =
        libSelectedSubject === "all" ||
        (res.subject || "").toLowerCase() === libSelectedSubject.toLowerCase();
      return matchesSearch && matchesSubject;
    });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      <PageHeader tag="Student Portal" title="Study Resources" description="Access teacher files or generate personalized AI notes." />

      {/* Tabs */}
      <div className="flex border-b border-theme">
        <button
          onClick={() => setActiveTab("library")}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all duration-200 ${
            activeTab === "library"
              ? "border-violet-500 text-violet-400"
              : "border-transparent text-secondary hover:text-primary"
          }`}
        >
          📂 Classroom Files
        </button>
        <button
          onClick={() => setActiveTab("ai")}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all duration-200 ${
            activeTab === "ai"
              ? "border-violet-500 text-violet-400"
              : "border-transparent text-secondary hover:text-primary"
          }`}
        >
          🤖 AI Notes & Cheatsheets
        </button>
      </div>

      {activeTab === "library" ? (
        <div className="space-y-6">
          {/* Library Search & Subject Filters */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-surface border border-theme p-4 rounded-2xl shadow-sm">
            <input
              type="text"
              placeholder="Search classroom files..."
              value={libSearchQuery}
              onChange={(e) => setLibSearchQuery(e.target.value)}
              className="w-full md:w-80 rounded-xl border border-theme bg-hover p-2.5 text-xs text-primary focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-secondary">Subject:</span>
              <select
                value={libSelectedSubject}
                onChange={(e) => setLibSelectedSubject(e.target.value)}
                className="rounded-xl border border-theme bg-hover px-3 py-1.5 text-xs text-primary focus:outline-none focus:ring-1 focus:ring-violet-500"
              >
                <option value="all" className="bg-surface text-primary">All Subjects</option>
                {subjects.map((sub) => (
                  <option key={sub} value={sub} className="bg-surface text-primary">{sub}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Recommended for You */}
            <div className="rounded-2xl border border-theme bg-surface p-6 space-y-4 md:col-span-2 shadow-md">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-sm font-bold text-violet-400 flex items-center gap-2">
                  <span>🤖</span> Recommended for You
                </h3>
                <span className="text-[10px] text-muted">Personalized to match your diary logs & weaker subjects</span>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {weakSubjects.length > 0 && (
                  <div className="rounded-xl bg-rose-500/5 border border-rose-500/20 px-3 py-1.5 text-[10px] text-rose-400 font-semibold flex items-center gap-1.5">
                    <span>💡 Focus areas:</span>
                    <span>{weakSubjects.join(", ")}</span>
                  </div>
                )}
                {recentTopics.length > 0 && (
                  <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 px-3 py-1.5 text-[10px] text-amber-400 font-semibold flex items-center gap-1.5">
                    <span>📅 Recent Lessons:</span>
                    <span>{recentTopics.map((t) => t.topic).slice(0, 2).join(", ")}</span>
                  </div>
                )}
                {weakSubjects.length === 0 && recentTopics.length === 0 && (
                  <span className="text-xs text-muted">Complete exams or check diary updates for personalized recommendations.</span>
                )}
              </div>

              {filterLib(initialRecommended).length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {filterLib(initialRecommended).map((res) => (
                    <div key={res.id} className="flex items-center justify-between rounded-xl border border-theme bg-hover/40 p-4 hover:bg-hover transition">
                      <div className="min-w-0 pr-2">
                        <p className="text-xs font-bold text-primary truncate">{res.title}</p>
                        <p className="text-[10px] text-muted truncate mt-0.5">{res.description || "Study guide"}</p>
                        <span className="inline-block mt-2 text-[9px] font-bold text-violet-400 uppercase tracking-wider">{res.subject}</span>
                      </div>
                      <a
                        href={res.fileUrl || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20 px-3 py-1.5 text-[10px] font-bold uppercase hover:bg-violet-500/20 transition"
                      >
                        Open
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted text-center py-6">No matching recommendations found.</p>
              )}
            </div>

            {/* Recently Uploaded */}
            <div className="rounded-2xl border border-theme bg-surface p-6 space-y-4 shadow-sm">
              <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-violet-400" />
                Recently Uploaded
              </h3>
              {filterLib(initialRecent).length > 0 ? (
                <div className="space-y-3">
                  {filterLib(initialRecent).map((res) => (
                    <div key={res.id} className="flex items-center justify-between rounded-xl border border-theme bg-hover/50 p-4 hover:bg-hover transition">
                      <div className="min-w-0 pr-2">
                        <p className="text-xs font-bold text-primary truncate">{res.title}</p>
                        <p className="text-[9px] text-muted truncate mt-0.5">{res.subject || "General"}</p>
                      </div>
                      <a
                        href={res.fileUrl || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20 px-3 py-1.5 text-[10px] font-bold uppercase hover:bg-violet-500/20 transition"
                      >
                        Open
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted text-center py-6">No recently uploaded files found.</p>
              )}
            </div>

            {/* Popular */}
            <div className="rounded-2xl border border-theme bg-surface p-6 space-y-4 shadow-sm">
              <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                Popular Resources
              </h3>
              {filterLib(initialPopular).length > 0 ? (
                <div className="space-y-3">
                  {filterLib(initialPopular).map((res) => (
                    <div key={res.id} className="flex items-center justify-between rounded-xl border border-theme bg-hover/50 p-4 hover:bg-hover transition">
                      <div className="min-w-0 pr-2">
                        <p className="text-xs font-bold text-primary truncate">{res.title}</p>
                        <p className="text-[9px] text-emerald-400 font-semibold uppercase mt-0.5">🔥 {res.downloadCount} views</p>
                      </div>
                      <a
                        href={res.fileUrl || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 text-[10px] font-bold uppercase hover:bg-emerald-500/20 transition"
                      >
                        Open
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted text-center py-6">No popular resources found.</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Sidebar Generator Form & History */}
          <div className="lg:col-span-1 space-y-6">
            <div className="rounded-2xl border border-theme bg-surface p-5 space-y-4">
              <h3 className="text-xs font-extrabold text-violet-400 uppercase tracking-widest">Generate Study Notes</h3>
              <div className="space-y-3">
                {/* Subject Selector */}
                <div>
                  <label className="block text-[10px] font-bold uppercase text-secondary mb-1.5">Subject</label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full rounded-xl border border-theme bg-hover p-2.5 text-xs text-primary focus:outline-none focus:ring-1 focus:ring-violet-500"
                  >
                    {subjects.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* Topic Input */}
                <div>
                  <label className="block text-[10px] font-bold uppercase text-secondary mb-1.5">Topic Name</label>
                  <input
                    type="text"
                    placeholder="e.g., Photosynthesis, Trigonometry"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full rounded-xl border border-theme bg-hover p-2.5 text-xs text-primary focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                </div>

                {/* Note Style */}
                <div>
                  <label className="block text-[10px] font-bold uppercase text-secondary mb-1.5">Study Style</label>
                  <select
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                    className="w-full rounded-xl border border-theme bg-hover p-2.5 text-xs text-primary focus:outline-none focus:ring-1 focus:ring-violet-500"
                  >
                    <option value="cheatsheet">🎯 Cheat Sheet</option>
                    <option value="revision">📝 Revision Notes</option>
                    <option value="mnemonic">🧠 Memory Mnemonics</option>
                    <option value="practice">💪 Practice Problems</option>
                  </select>
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={isPending}
                  className="w-full rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white p-2.5 text-xs font-bold shadow-lg shadow-violet-500/25 transition disabled:opacity-50"
                >
                  {isPending ? "Generating notes..." : "Generate AI Study Note"}
                </button>
              </div>
            </div>

            {/* Quick Presets from weak subjects */}
            {weakSubjects.length > 0 && (
              <div className="rounded-2xl border border-theme bg-surface p-5 space-y-3">
                <p className="text-xs font-extrabold text-rose-400 uppercase tracking-widest flex items-center gap-1.5">
                  <span>💡</span> Weak Areas Presets
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {weakSubjects.map((sub) => (
                    <button
                      key={sub}
                      onClick={() => {
                        setSubject(sub);
                        setTopic("Weak Subject Revision");
                      }}
                      className="rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 px-2 py-1 text-[10px] font-bold transition"
                    >
                      Quick Prep: {sub}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Notes history list */}
            <div className="rounded-2xl border border-theme bg-surface p-5 space-y-3">
              <p className="text-xs font-extrabold text-secondary uppercase tracking-widest">My Saved Notes</p>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {notes.map((note) => (
                  <button
                    key={note.id}
                    onClick={() => setSelectedNote(note)}
                    className={`w-full text-left rounded-xl p-3 border transition-colors ${
                      selectedNote?.id === note.id
                        ? "border-violet-500 bg-violet-500/10 text-violet-400"
                        : "border-theme bg-hover/30 text-secondary hover:bg-hover hover:text-primary"
                    }`}
                  >
                    <p className="text-xs font-bold truncate">{note.title}</p>
                    <div className="flex items-center justify-between text-[9px] text-muted mt-1.5">
                      <span className="font-semibold uppercase">{note.subjectName}</span>
                      <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Details Pane */}
          <div className="lg:col-span-2">
            {selectedNote ? (
              <div className="rounded-3xl border border-theme bg-surface p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-theme pb-4">
                  <div>
                    <span className="rounded-xl bg-violet-500/15 text-violet-400 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">{selectedNote.subjectName}</span>
                    <h2 className="text-base font-black text-primary mt-2">{selectedNote.title}</h2>
                  </div>
                  <button
                    onClick={() => copyToClipboard(selectedNote.content)}
                    className="rounded-xl border border-theme bg-hover hover:bg-surface px-3.5 py-2 text-xs font-bold text-primary transition flex items-center gap-1.5"
                  >
                    📋 Copy Note
                  </button>
                </div>
                <div className="prose prose-sm prose-invert max-w-none text-xs text-primary leading-relaxed whitespace-pre-wrap font-sans">
                  {selectedNote.content}
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-theme p-12 text-center text-muted">
                <p className="text-3xl mb-2">🤖</p>
                <p className="text-xs">No AI generated notes yet. Use the tool on the left to start learning!</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
