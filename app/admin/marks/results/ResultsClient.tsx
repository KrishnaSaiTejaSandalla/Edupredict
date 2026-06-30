"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

type Props = {
  classList: { id: number; name: string }[];
  subjectList: { id: number; name: string }[];
  examTypeList: string[];
  examMonthList: string[];
};

export default function ResultsClient({ classList, subjectList, examTypeList, examMonthList }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [type, setType] = useState("");
  const [month, setMonth] = useState("");

  // Hydrate state from URL on first mount or searchParams change
  useEffect(() => {
    setClassId(searchParams.get("classId") || "");
    setSubjectId(searchParams.get("subjectId") || "");
    setType(searchParams.get("type") || "");
    setMonth(searchParams.get("month") || "");
  }, [searchParams]);

  const formatMonthYear = (my: string) => {
    if (!my || !my.includes("-")) return my;
    const [y, m] = my.split("-");
    const date = new Date(Number(y), Number(m) - 1, 1);
    const monthName = date.toLocaleString("default", { month: "long" });
    return `${monthName} ${y}`;
  };

  const applyFilter = () => {
    if (!classId) {
      toast.error("Please Select a Class");
      return;
    }
    if (!subjectId) {
      toast.error("Please Select a Subject");
      return;
    }
    if (!type) {
      toast.error("Please Select an Exam Type");
      return;
    }
    if (!month) {
      toast.error("Please Select an Exam Month");
      return;
    }

    const params = new URLSearchParams({ classId, subjectId, type, month, page: "1" });
    router.replace(`/admin/marks/results?${params.toString()}`);
  };

  const isReady = !!classId && !!subjectId && !!type && !!month;

  return (
    <div className="grid gap-5 md:grid-cols-5 items-end bg-card p-5 rounded-2xl border border-border">
      {/* CLASS */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
          Class
        </label>
        <select
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          className="select-theme w-full"
        >
          <option value="">Select Class</option>
          {classList.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* SUBJECT */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
          Subject
        </label>
        <select
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          className="select-theme w-full"
        >
          <option value="">Select Subject</option>
          {subjectList.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* EXAM TYPE */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
          Exam Type
        </label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="select-theme w-full"
        >
          <option value="">Select Type</option>
          {examTypeList.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {/* EXAM MONTH */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
          Exam Month
        </label>
        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="select-theme w-full"
        >
          <option value="">Select Month</option>
          {examMonthList.map((m) => (
            <option key={m} value={m}>
              {formatMonthYear(m)}
            </option>
          ))}
        </select>
      </div>

      {/* APPLY */}
      <button
        onClick={applyFilter}
        className={`h-11 rounded-xl font-bold text-white transition-all duration-200 w-full
          ${isReady
            ? "btn-cyan"
            : "bg-cyan-500/70 cursor-pointer"}
        `}
      >
        Apply Filter
      </button>
    </div>
  );
}