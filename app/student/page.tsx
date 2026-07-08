"use client";

import useSWR from "swr";
import StudentDashboardClient from "@/components/student/StudentDashboardClient";

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error("Failed to fetch student dashboard");
  return res.json();
});

export default function StudentPage() {
  const { data, error, isLoading } = useSWR("/api/dashboard/student", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  });

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8 space-y-8 animate-pulse">
        <div>
          <div className="h-4 w-20 bg-muted rounded"></div>
          <div className="h-8 w-64 bg-muted rounded mt-2"></div>
          <div className="h-4 w-96 bg-muted rounded mt-2"></div>
        </div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-muted rounded-2xl border border-border/50"></div>
          ))}
        </div>
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-8 h-80 bg-muted rounded-2xl"></div>
          <div className="lg:col-span-4 h-80 bg-muted rounded-2xl"></div>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <p className="text-red-500 font-medium">Failed to load student dashboard metrics.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  return <StudentDashboardClient userName={data.userName} data={data.dashboard} />;
}
