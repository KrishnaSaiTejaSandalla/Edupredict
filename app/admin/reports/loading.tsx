function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export default function ReportsLoading() {
  return (
    <main className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8 space-y-8 transition-colors duration-200">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <SkeletonBlock className="h-3 w-28" />
          <SkeletonBlock className="h-10 w-64 max-w-full" />
          <SkeletonBlock className="h-4 w-96 max-w-full" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <SkeletonBlock className="h-16 w-36 rounded-2xl" />
          <SkeletonBlock className="h-16 w-36 rounded-2xl" />
        </div>
      </div>

      {/* Grouping Filters & Class Insights Skeleton */}
      <section className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-md space-y-4 transition-colors duration-200">
          <SkeletonBlock className="h-4 w-24" />
          <div className="space-y-3">
            <SkeletonBlock className="h-11 w-full rounded-xl" />
            <SkeletonBlock className="h-11 w-full rounded-xl" />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-md space-y-6 transition-colors duration-200">
          <div className="space-y-2 pb-4 border-b border-border/40">
            <SkeletonBlock className="h-4 w-32" />
            <SkeletonBlock className="h-3 w-52" />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <SkeletonBlock className="h-20 w-full rounded-xl" />
            <SkeletonBlock className="h-20 w-full rounded-xl" />
            <SkeletonBlock className="h-20 w-full rounded-xl" />
          </div>
        </div>
      </section>

      {/* Reports Table Skeleton */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-md space-y-4 transition-colors duration-200">
        <div className="flex justify-between items-center pb-2 border-b border-border/40">
          <SkeletonBlock className="h-4 w-36" />
          <SkeletonBlock className="h-4 w-12" />
        </div>
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((item) => (
            <SkeletonBlock key={item} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </main>
  );
}
