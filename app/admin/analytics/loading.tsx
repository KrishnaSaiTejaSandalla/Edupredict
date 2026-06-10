function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-white/[0.06] ${className}`} />;
}

export default function AnalyticsLoading() {
  return (
    <main className="min-h-screen bg-[#070b16] p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Header Skeleton */}
      <div className="space-y-3">
        <SkeletonBlock className="h-3 w-32" />
        <SkeletonBlock className="h-10 w-72 max-w-full" />
        <SkeletonBlock className="h-4 w-96 max-w-full" />
      </div>

      {/* Analytics Charts Grid Skeleton */}
      <div className="rounded-3xl border border-white/5 bg-white/[0.015] p-6 shadow-2xl">
        <div className="grid gap-6 xl:grid-cols-2">
          {[0, 1, 2, 3].map((card) => (
            <div key={card} className="rounded-2xl border border-white/5 bg-[#0b1020]/20 p-6 shadow-md">
              <div className="space-y-2 mb-6">
                <SkeletonBlock className="h-4 w-40" />
                <SkeletonBlock className="h-3.5 w-60" />
              </div>
              <SkeletonBlock className="h-72 w-full" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
