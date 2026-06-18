function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export default function SettingsLoading() {
  return (
    <main className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8 space-y-8 transition-colors duration-200">
      {/* Header Row Skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <SkeletonBlock className="h-3 w-24" />
          <SkeletonBlock className="h-10 w-60 max-w-full" />
          <SkeletonBlock className="h-4 w-96 max-w-full" />
        </div>
        <SkeletonBlock className="h-11 w-32 rounded-xl shrink-0" />
      </div>

      {/* Main Settings Grid Skeleton */}
      <div className="grid gap-8 xl:grid-cols-[280px_1fr]">
        
        {/* Navigation Sidebar Skeleton */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-md space-y-6 transition-colors duration-200">
          <div className="rounded-xl border border-border/40 bg-card/40 p-4">
            <div className="flex items-center gap-3">
              <SkeletonBlock className="h-11 w-11 rounded-xl shrink-0" />
              <div className="space-y-2 min-w-0 flex-1">
                <SkeletonBlock className="h-3.5 w-24" />
                <SkeletonBlock className="h-3 w-16" />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            {[0, 1, 2, 3, 4].map((item) => (
              <SkeletonBlock key={item} className="h-11 w-full rounded-xl" />
            ))}
          </div>
        </div>

        {/* Content Pane Skeleton */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-md space-y-6 transition-colors duration-200">
          <div className="flex flex-col gap-5 border-b border-border/40 pb-6 sm:flex-row sm:items-center">
            <SkeletonBlock className="h-16 w-16 rounded-2xl shrink-0" />
            <div className="space-y-2 flex-1">
              <SkeletonBlock className="h-4.5 w-48" />
              <SkeletonBlock className="h-3.5 w-32" />
              <SkeletonBlock className="h-5 w-20 rounded-full" />
            </div>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {[0, 1, 2, 3].map((field) => (
              <div key={field} className="space-y-2">
                <SkeletonBlock className="h-3.5 w-24" />
                <SkeletonBlock className="h-11 w-full rounded-xl" />
              </div>
            ))}
          </div>
        </div>

      </div>
    </main>
  );
}
