function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export default function ExamsLoading() {
  return (
    <main className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8 space-y-8 transition-colors duration-200">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <SkeletonBlock className="h-3 w-20" />
          <SkeletonBlock className="h-10 w-64 max-w-full" />
          <SkeletonBlock className="h-4 w-80 max-w-full" />
        </div>
        <SkeletonBlock className="h-11 w-36 rounded-xl shrink-0" />
      </div>

      {/* Exams Data Table Skeleton */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-md space-y-4 transition-colors duration-200">
        <div className="flex justify-between items-center pb-2 border-b border-border/40">
          <SkeletonBlock className="h-4 w-32" />
          <SkeletonBlock className="h-4 w-12" />
        </div>
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((item) => (
            <SkeletonBlock key={item} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </main>
  );
}
