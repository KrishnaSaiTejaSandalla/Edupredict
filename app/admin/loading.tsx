function Shimmer({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-xl bg-white/[0.06] ${className}`} />
  );
}

export default function AdminLoading() {
  return (
    <main className="min-h-screen bg-[#070b16] p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="space-y-3">
        <Shimmer className="h-3 w-24 rounded-full" />
        <Shimmer className="h-10 w-80 max-w-full" />
        <Shimmer className="h-4 w-[480px] max-w-full" />
      </div>

      {/* KPI Cards */}
      <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-white/10 bg-white/[0.035] p-6 shadow-xl shadow-black/40"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-3 flex-1">
                <Shimmer className="h-3 w-28" />
                <Shimmer className="h-9 w-20" />
              </div>
              <Shimmer className="h-12 w-12 shrink-0 rounded-xl" />
            </div>
          </div>
        ))}
      </section>

      {/* Charts Container */}
      <section className="rounded-3xl border border-white/10 bg-white/[0.015] p-6 shadow-2xl">
        <div className="mb-5 space-y-2">
          <Shimmer className="h-5 w-48" />
          <Shimmer className="h-3 w-64" />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Shimmer className="h-64 w-full rounded-2xl" />
          <Shimmer className="h-64 w-full rounded-2xl" />
        </div>
      </section>

      {/* Bottom Grid: Lists + Sidebar */}
      <section className="grid gap-8 lg:grid-cols-12">
        {/* Left: Recent Students + Gender */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          {/* Recent Students card */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-6 shadow-xl shadow-black/20">
            <div className="mb-6 flex items-center justify-between">
              <div className="space-y-2">
                <Shimmer className="h-5 w-36" />
                <Shimmer className="h-3 w-64" />
              </div>
              <Shimmer className="h-4 w-16" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.015] p-4"
                >
                  <div className="flex items-center gap-3.5">
                    <Shimmer className="h-10 w-10 rounded-xl shrink-0" />
                    <div className="space-y-1.5">
                      <Shimmer className="h-3.5 w-32" />
                      <Shimmer className="h-3 w-20" />
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right space-y-1">
                      <Shimmer className="h-2.5 w-16" />
                      <Shimmer className="h-4 w-10" />
                    </div>
                    <div className="text-right space-y-1">
                      <Shimmer className="h-2.5 w-16" />
                      <Shimmer className="h-4 w-10" />
                    </div>
                    <Shimmer className="h-6 w-20 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Gender Distribution card */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-6 shadow-xl shadow-black/20">
            <div className="mb-6 space-y-2">
              <Shimmer className="h-5 w-48" />
              <Shimmer className="h-3 w-36" />
            </div>
            <div className="space-y-5">
              {[0, 1].map((i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-2">
                    <Shimmer className="h-3.5 w-12" />
                    <Shimmer className="h-3.5 w-8" />
                  </div>
                  <Shimmer className="h-2 w-full rounded-full" />
                  <Shimmer className="mt-1 h-3 w-20" />
                </div>
              ))}
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4 rounded-xl bg-slate-900/50 p-4">
              {[0, 1].map((i) => (
                <div key={i} className="text-center space-y-2">
                  <Shimmer className="h-5 w-5 mx-auto rounded-full" />
                  <Shimmer className="h-8 w-12 mx-auto" />
                  <Shimmer className="h-3 w-10 mx-auto" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Exams + Alerts */}
        <div className="lg:col-span-4 flex flex-col gap-8">
          {/* Upcoming Exams */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-6 shadow-xl shadow-black/20">
            <div className="mb-6 space-y-2">
              <Shimmer className="h-5 w-36" />
              <Shimmer className="h-3 w-48" />
            </div>
            <div className="space-y-3.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-white/5 bg-white/[0.02] p-4"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="space-y-1.5 flex-1">
                      <Shimmer className="h-4 w-32" />
                      <Shimmer className="h-3 w-20" />
                    </div>
                    <Shimmer className="h-6 w-16 rounded-lg shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* System Alerts */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-6 shadow-xl shadow-black/20">
            <div className="mb-6 space-y-2">
              <Shimmer className="h-5 w-28" />
              <Shimmer className="h-3 w-44" />
            </div>
            <div className="space-y-3.5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl border-l-4 border-l-white/10 border border-white/5 bg-white/[0.015] p-4"
                >
                  <Shimmer className="h-4 w-40 mb-2" />
                  <Shimmer className="h-3 w-full mb-1" />
                  <Shimmer className="h-3 w-3/4" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
