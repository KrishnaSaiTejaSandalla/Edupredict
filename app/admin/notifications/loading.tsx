function Shimmer({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-white/[0.06] ${className}`}
    />
  );
}

export default function NotificationsLoading() {
  return (
    <main className="min-h-screen bg-[#070b16] p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-3">
          <Shimmer className="h-3 w-32" />
          <Shimmer className="h-10 w-72 max-w-full" />
          <Shimmer className="h-4 w-96 max-w-full" />
        </div>
        <Shimmer className="h-11 w-36 rounded-xl" />
      </div>

      {/* Grid: Feed + Sidebar */}
      <section className="grid gap-8 xl:grid-cols-[1fr_320px]">
        {/* Left: Controls + Feed */}
        <div className="space-y-6">
          {/* Controls bar */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-white/5 bg-gradient-to-br from-slate-950/40 to-white/[0.02] p-4 shadow-md">
            <div className="flex flex-wrap gap-2">
              {[88, 64, 80, 64].map((w, i) => (
                <Shimmer key={i} className={`h-9 w-${w === 64 ? "16" : w === 80 ? "20" : w === 88 ? "24" : "20"} rounded-xl`} />
              ))}
            </div>
            <Shimmer className="h-10 w-56 rounded-xl" />
          </div>

          {/* Feed list */}
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/40 to-white/[0.035] p-6 shadow-xl shadow-black/20">
            <div className="space-y-3.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-white/5 bg-white/[0.015] p-4"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <Shimmer className="h-4 w-48" />
                    <div className="flex items-center gap-2">
                      <Shimmer className="h-5 w-16 rounded-full" />
                      <Shimmer className="h-2 w-2 rounded-full" />
                    </div>
                  </div>
                  <Shimmer className="h-3 w-full mb-1" />
                  <Shimmer className="h-3 w-3/4 mb-3" />
                  <Shimmer className="h-3 w-28" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Preferences sidebar */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/40 to-white/[0.035] p-6 shadow-xl shadow-black/20 self-start">
          <div className="border-b border-white/5 pb-4 space-y-2">
            <Shimmer className="h-4 w-28" />
            <Shimmer className="h-3 w-48" />
          </div>
          <div className="mt-6 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Shimmer key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
