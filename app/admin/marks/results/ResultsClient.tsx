"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

export default function ResultsClient({ classList }: any) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [classId, setClassId] = useState("");
    const [examId, setExamId] = useState("");
    const [examList, setExamList] = useState<any[]>([]);
    const [loadingExams, setLoadingExams] = useState(false);

    // Track whether this is the initial mount hydration
    const isInitialMount = useRef(true);

    // Hydrate state from URL on first mount
    useEffect(() => {
        const urlClassId = searchParams.get("classId") || "";
        const urlExamId = searchParams.get("examId") || "";
        setClassId(urlClassId);
        setExamId(urlExamId);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Fetch exams whenever classId changes
    useEffect(() => {
        if (!classId) {
            setExamList([]);
            // Only reset examId when user changes class, not on first hydration
            if (!isInitialMount.current) {
                setExamId("");
            }
            isInitialMount.current = false;
            return;
        }

        const load = async () => {
            setLoadingExams(true);
            try {
                const res = await fetch(`/api/exams?classId=${classId}`);
                const data = await res.json();
                setExamList(data);
            } catch {
                setExamList([]);
            } finally {
                setLoadingExams(false);
            }
        };

        // On user-driven class change (not initial hydration), reset exam selection
        if (!isInitialMount.current) {
            setExamId("");
        }
        isInitialMount.current = false;

        load();
    }, [classId]);

    const applyFilter = () => {
        // CASE 1: neither selected
        if (!classId && !examId) {
            toast.error("Please Select Class and Exam");
            return;
        }
        // CASE 2: class selected but exam not selected
        if (classId && !examId) {
            toast.error("Please Select an Exam");
            return;
        }
        // CASE 3: exam selected but class not selected (edge case)
        if (!classId && examId) {
            toast.error("Please Select a Class");
            return;
        }

        const params = new URLSearchParams({ classId, examId });
        router.replace(`/admin/marks/results?${params.toString()}`);
    };

    const isExamDisabled = !classId || loadingExams || (!loadingExams && examList.length === 0);
    const isReady = !!classId && !!examId;

    return (
        <div className="grid gap-5 md:grid-cols-3">

            {/* CLASS */}
            <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="select-theme"
            >
                <option value="">Select Class</option>
                {classList.map((c: any) => (
                    <option key={c.id} value={c.id}>
                        {c.name}
                    </option>
                ))}
            </select>

            {/* EXAM */}
            <select
                value={examId}
                onChange={(e) => setExamId(e.target.value)}
                disabled={!classId || loadingExams}
                className="select-theme disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <option value="">
                    {!classId
                        ? "Select Class First"
                        : loadingExams
                            ? "Loading exams…"
                            : examList.length === 0
                                ? "No exams available"
                                : "Select Exam"}
                </option>
                {examList.map((e: any) => (
                    <option key={e.id} value={e.id}>
                        {e.name}
                    </option>
                ))}
            </select>

            {/* APPLY — never disabled so toast validation always fires */}
            <button
                onClick={applyFilter}
                className={`h-11 rounded-xl font-bold text-white transition-all duration-200
                    ${isReady
                        ? "bg-blue-500 hover:bg-blue-400 active:scale-[0.97]"
                        : "bg-blue-500/70 cursor-pointer"
                    }`}
            >
                Apply Filter
            </button>

        </div>
    );
}