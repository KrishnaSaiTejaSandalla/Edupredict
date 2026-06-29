"use client";

import { useState, useEffect, useTransition } from "react";
import PageHeader from "@/components/shared/PageHeader";
import { toast } from "sonner";
import CustomSelect from "@/components/ui/CustomSelect";

type MappingType = {
  classId: number;
  className: string;
  subjectId: number;
  subjectName: string;
};

type DiaryEntry = {
  id: number;
  topicTaught: string;
  homework: string | null;
  date: string;
  subjectId: number;
  subjectName: string;
  classId: number;
  className: string;
};

type Props = {
  teacherId: number;
  mappings: MappingType[];
};

export default function TeacherDiaryClient({ teacherId, mappings }: Props) {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Form states
  const uniqueClasses = Array.from(new Map(mappings.map(m => [m.classId, m])).values());
  const [selectedClassId, setSelectedClassId] = useState<number>(uniqueClasses[0]?.classId || 0);

  const [topicTaught, setTopicTaught] = useState("");
  const [homework, setHomework] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  // AI Modal states
  const [aiTool, setAiTool] = useState("homework");
  const [aiTopic, setAiTopic] = useState("");
  const [generatingAI, setGeneratingAI] = useState(false);

  const filteredSubjects = mappings.filter(m => m.classId === selectedClassId);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number>(filteredSubjects[0]?.subjectId || 0);

  useEffect(() => {
    const firstSubj = mappings.find(m => m.classId === selectedClassId);
    if (firstSubj) {
      setSelectedSubjectId(firstSubj.subjectId);
    }
  }, [selectedClassId, mappings]);

  const activeMapping = mappings.find(m => m.classId === selectedClassId && m.subjectId === selectedSubjectId);

  const fetchEntries = async () => {
    try {
      const res = await fetch("/api/teacher/diary");
      if (res.ok) {
        const data = await res.json();
        setEntries(data);
      }
    } catch {
      toast.error("Failed to load diary entries");
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMapping) {
      toast.error("No class/subject mapping assigned to you.");
      return;
    }
    if (!topicTaught.trim()) {
      toast.error("Please enter the topic taught.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/teacher/diary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            classId: activeMapping.classId,
            subjectId: activeMapping.subjectId,
            topicTaught,
            homework: homework.trim() || null,
            date,
          }),
        });

        if (res.ok) {
          toast.success("Diary entry saved successfully! 📘");
          setTopicTaught("");
          setHomework("");
          setShowForm(false);
          fetchEntries();
        } else {
          const data = await res.json();
          throw new Error(data.error || "Failed to save");
        }
      } catch (err: any) {
        toast.error(err.message || "Something went wrong.");
      }
    });
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this entry?")) return;
    try {
      const res = await fetch(`/api/teacher/diary?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Diary entry deleted.");
        fetchEntries();
      } else {
        toast.error("Failed to delete entry");
      }
    } catch {
      toast.error("Error deleting entry");
    }
  };

  const handleGenerateAI = async () => {
    if (!activeMapping) return;
    const searchTopic = aiTopic.trim() || topicTaught.trim();
    if (!searchTopic) {
      toast.error("Please enter a topic name for the AI generator.");
      return;
    }

    setGeneratingAI(true);
    try {
      const res = await fetch("/api/teacher/ai/homework", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool: aiTool,
          subject: activeMapping.subjectName,
          classLevel: activeMapping.className,
          topic: searchTopic,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setHomework(data.content);
        setShowAIModal(false);
        setAiTopic("");
        toast.success("AI Homework generated successfully! 🪄");
      } else {
        toast.error("Failed to generate AI homework");
      }
    } catch {
      toast.error("Error calling AI service");
    } finally {
      setGeneratingAI(false);
    }
  };

  // Compute stats
  const totalEntries = entries.length;
  const entriesToday = entries.filter((e) => e.date === new Date().toISOString().split("T")[0]).length;
  const classesCovered = Array.from(new Set(entries.map((e) => e.classId))).length;
  const aiGeneratedCount = entries.filter((e) => e.homework && e.homework.includes("─")).length; // Simple proxy for structured content

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader tag="Teacher Console" title="Class Diary" description="Log topics taught, homework assigned, and generate tasks using AI." />
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white px-5 py-3 text-xs font-bold whitespace-nowrap self-start sm:self-auto transition duration-200 shadow-lg shadow-violet-500/25"
        >
          {showForm ? "Close Panel" : "+ Log Class Progress"}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl p-5 border border-theme bg-surface relative overflow-hidden">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider">Total Entries</p>
          <p className="mt-2 text-3xl font-black text-violet-400">{totalEntries}</p>
          <p className="mt-1 text-xs text-secondary">Logged in class diary</p>
          <div className="absolute top-0 right-0 p-3 text-4xl opacity-10">📖</div>
        </div>
        <div className="rounded-2xl p-5 border border-theme bg-surface relative overflow-hidden">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider">Entries Today</p>
          <p className="mt-2 text-3xl font-black text-emerald-400">{entriesToday}</p>
          <p className="mt-1 text-xs text-secondary">Keep daily logs updated</p>
          <div className="absolute top-0 right-0 p-3 text-4xl opacity-10">📅</div>
        </div>
        <div className="rounded-2xl p-5 border border-theme bg-surface relative overflow-hidden">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider">Classes Mapped</p>
          <p className="mt-2 text-3xl font-black text-amber-400">{classesCovered}</p>
          <p className="mt-1 text-xs text-secondary">Active learning cohorts</p>
          <div className="absolute top-0 right-0 p-3 text-4xl opacity-10">🏫</div>
        </div>
        <div className="rounded-2xl p-5 border border-theme bg-surface relative overflow-hidden">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider">AI Homework Tasks</p>
          <p className="mt-2 text-3xl font-black text-purple-400">{aiGeneratedCount}</p>
          <p className="mt-1 text-xs text-secondary">Generated using AI Toolkit</p>
          <div className="absolute top-0 right-0 p-3 text-4xl opacity-10">🪄</div>
        </div>
      </div>

      {/* Log Progress Form */}
      {showForm && (
        <div className="rounded-3xl border border-theme bg-surface p-6 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-300">
          <h2 className="text-xs font-extrabold uppercase tracking-widest text-violet-400 mb-6">
            Log Class Progress & Homework
          </h2>
          <form onSubmit={handleSave} className="grid gap-5 md:grid-cols-2">
            {/* Class Selector */}
            <div>
              <label className="block text-[10px] font-bold uppercase text-secondary mb-1.5">Select Class</label>
              <CustomSelect
                options={uniqueClasses.map((m) => ({ value: m.classId, label: m.className }))}
                value={selectedClassId}
                onChange={(val) => setSelectedClassId(Number(val))}
                className="w-full"
              />
            </div>

            {/* Subject Selector */}
            <div>
              <label className="block text-[10px] font-bold uppercase text-secondary mb-1.5">Select Subject</label>
              <CustomSelect
                options={filteredSubjects.map((m) => ({ value: m.subjectId, label: m.subjectName }))}
                value={selectedSubjectId}
                onChange={(val) => setSelectedSubjectId(Number(val))}
                className="w-full"
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-[10px] font-bold uppercase text-secondary mb-1.5">Log Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-theme bg-hover p-2.5 text-xs text-primary focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>

            {/* Topic Taught */}
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold uppercase text-secondary mb-1.5">Topic Taught *</label>
              <input
                type="text"
                placeholder="e.g., Introduction to Quadratic Equations"
                value={topicTaught}
                onChange={(e) => setTopicTaught(e.target.value)}
                required
                className="w-full rounded-xl border border-theme bg-hover p-2.5 text-xs text-primary focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>

            {/* Homework & AI Helper */}
            <div className="md:col-span-2 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] font-bold uppercase text-secondary">Homework Assignment (Optional)</label>
                <button
                  type="button"
                  onClick={() => setShowAIModal(true)}
                  className="rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 px-2 py-1 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition"
                >
                  🪄 AI Homework Toolkit
                </button>
              </div>
              <textarea
                placeholder="Add homework questions or instructions for the student..."
                rows={5}
                value={homework}
                onChange={(e) => setHomework(e.target.value)}
                className="w-full rounded-xl border border-theme bg-hover p-4 text-xs text-primary focus:outline-none focus:ring-1 focus:ring-violet-500 resize-none transition"
              />
            </div>

            {/* Actions */}
            <div className="md:col-span-2 flex gap-3 mt-2">
              <button
                type="submit"
                disabled={isPending}
                className="rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white px-5 py-2.5 text-xs font-bold disabled:opacity-50"
              >
                {isPending ? "Saving..." : "Save Diary Log"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-xl border border-theme bg-surface px-5 py-2.5 text-xs font-bold text-primary hover:bg-hover transition duration-200"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Diary Logs Table */}
      <div className="rounded-2xl border border-theme bg-surface overflow-hidden">
        <div className="p-5 border-b border-theme">
          <h2 className="text-sm font-bold text-primary flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-violet-400" />
            Class Diary History
          </h2>
        </div>

        {entries.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-theme bg-hover/50 text-[10px] font-bold uppercase tracking-wider text-secondary">
                  <th className="py-4 px-6">Date</th>
                  <th className="py-4 px-6">Class</th>
                  <th className="py-4 px-6">Subject</th>
                  <th className="py-4 px-6">Topic Taught</th>
                  <th className="py-4 px-6">Homework Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme">
                {entries.map((e) => (
                  <tr key={e.id} className="hover:bg-hover/30 transition-colors">
                    <td className="py-4 px-6 text-xs font-semibold text-primary">
                      {new Date(e.date).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6 text-xs text-primary font-bold">{e.className}</td>
                    <td className="py-4 px-6 text-xs font-bold text-violet-400 uppercase tracking-wider">{e.subjectName}</td>
                    <td className="py-4 px-6 text-xs text-secondary max-w-xs truncate">{e.topicTaught}</td>
                    <td className="py-4 px-6 text-xs">
                      {e.homework ? (
                        <span className="text-emerald-400 font-medium">Assigned</span>
                      ) : (
                        <span className="text-muted">None</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => handleDelete(e.id)}
                        className="rounded-xl border border-theme bg-surface text-muted hover:text-rose-500 hover:border-rose-500/30 px-3 py-1.5 text-[10px] font-bold uppercase transition"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-muted text-sm">
            No diary entries logged yet. Click "+ Log Class Progress" to create one.
          </div>
        )}
      </div>

      {/* AI Helper Modal */}
      {showAIModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAIModal(false)} />
          <div className="relative w-full max-w-md rounded-3xl border border-theme bg-surface p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-violet-400 mb-4 flex items-center gap-1.5">
              🪄 AI Homework Assistant
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-secondary mb-1.5">Topic Name</label>
                <input
                  type="text"
                  placeholder="Defaults to current Topic Taught"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  className="w-full rounded-xl border border-theme bg-hover p-2.5 text-xs text-primary focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-secondary mb-1.5">Task Format</label>
                <CustomSelect
                  options={[
                    { value: "homework", label: "📝 Homework Assignment (Mixed Questions)" },
                    { value: "mcqs", label: "Circle Quiz (10 MCQs with Answer Key)" },
                    { value: "worksheet", label: "Practice Worksheet (Short Answers)" },
                    { value: "revision", label: "Revision Summary Checklist" },
                  ]}
                  value={aiTool}
                  onChange={(val) => setAiTool(String(val))}
                  className="w-full"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleGenerateAI}
                  disabled={generatingAI}
                  className="flex-1 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white p-2.5 text-xs font-bold shadow-lg transition"
                >
                  {generatingAI ? "AI Generating..." : "Generate & Insert"}
                </button>
                <button
                  onClick={() => setShowAIModal(false)}
                  className="rounded-xl border border-theme bg-surface px-4 py-2.5 text-xs font-bold text-primary hover:bg-hover transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
