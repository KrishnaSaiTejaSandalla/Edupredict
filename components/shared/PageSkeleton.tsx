/**
 * Generic loading skeleton matching admin's existing shimmer pattern.
 * Configurable for KPI cards, table rows, and chart areas.
 */

function Shimmer({ className = "" }: { className?: string }) {
  return (
    <div
      className={`skeleton ${className}`}
    />
  );
}

type PageSkeletonProps = {
  kpiCount?: number;
  tableRows?: number;
  showChart?: boolean;
};

export default function PageSkeleton({
  kpiCount = 4,
  tableRows = 5,
  showChart = false,
}: PageSkeletonProps) {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="space-y-3">
        <Shimmer className="h-3 w-24 rounded-full" />
        <Shimmer className="h-10 w-80 max-w-full" />
        <Shimmer className="h-4 w-[480px] max-w-full" />
      </div>

      {/* KPI Cards */}
      {kpiCount > 0 && (
        <section
          className="grid gap-4"
          style={{
            gridTemplateColumns: `repeat(auto-fill, minmax(220px, 1fr))`,
          }}
        >
          {Array.from({ length: kpiCount }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-theme bg-surface p-6"
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
      )}

      {/* Chart area */}
      {showChart && (
        <section className="rounded-2xl border border-theme bg-surface p-6">
          <div className="mb-5 space-y-2">
            <Shimmer className="h-5 w-48" />
            <Shimmer className="h-3 w-64" />
          </div>
          <Shimmer className="h-64 w-full rounded-2xl" />
        </section>
      )}

      {/* Table rows */}
      {tableRows > 0 && (
        <section className="rounded-2xl border border-theme bg-surface p-6">
          <div className="mb-5 space-y-2">
            <Shimmer className="h-5 w-36" />
            <Shimmer className="h-3 w-64" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: tableRows }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-xl border border-subtle bg-hover/20 p-4"
              >
                <div className="flex items-center gap-3.5">
                  <Shimmer className="h-10 w-10 rounded-xl shrink-0" />
                  <div className="space-y-1.5">
                    <Shimmer className="h-3.5 w-32" />
                    <Shimmer className="h-3 w-20" />
                  </div>
                </div>
                <Shimmer className="h-6 w-20 rounded-full" />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
