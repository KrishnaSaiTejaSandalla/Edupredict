function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-white/[0.06] ${className}`} />;
}

export default function ReportsLoading() {
  return (
    <main className="min-h-screen bg-[#070b16] p-4 sm:p-6 lg:p-8 space-y-8">
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
        <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-6 shadow-xl space-y-4">
          <SkeletonBlock className="h-4 w-24" />
          <div className="space-y-3">
            <SkeletonBlock className="h-11 w-full rounded-xl" />
            <SkeletonBlock className="h-11 w-full rounded-xl" />
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-6 shadow-xl space-y-6">
          <div className="space-y-2 pb-4 border-b border-white/5">
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
      <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-xl space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-white/5">
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
