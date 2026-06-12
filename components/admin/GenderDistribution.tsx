"use client";

export default function GenderDistribution({
  data,
}: {
  data: { gender: string; count: number }[];
}) {
  const total = data.reduce((sum, item) => sum + item.count, 0);

  const filtered = data.filter(
    (g) => g.gender.toLowerCase() === "male" || g.gender.toLowerCase() === "female"
  );

  const sortedData = [
    ...filtered.filter((g) => g.gender.toLowerCase() === "male"),
    ...filtered.filter((g) => g.gender.toLowerCase() === "female"),
  ];

  return (
    <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/40 to-white/[0.035] p-4 shadow-lg shadow-black/20">
      {/* changed p-6 to p-4 */}
      <div className="mb-4">
        <h2 className="text-base font-semibold tracking-tight text-white">
          Gender Distribution
        </h2>
        <p className="mt-1 text-xs text-slate-500">Student demographics</p>
        {/* mb-6 to mb-4, text-sm to text xs */}
      </div>

      <div className="space-y-1">
        {/* //reduced to 1 from 5 for better UI */}
        {sortedData.map((item) => {
          const percentage = total ? Math.round((item.count / total) * 100) : 0;
          const color =
            item.gender.toLowerCase() === "male" ? "from-blue-500" : "from-pink-500";

          return (
            <div key={item.gender}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-300 capitalize">
                  {item.gender}
                </span>
                <span className="text-sm font-semibold text-white">{percentage}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-800/50">
                {/* changed h-2 to h-1.5 */}
                <div
                  className={`h-full bg-gradient-to-r ${color} to-slate-700 rounded-full transition-all duration-500`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              {/* <p className="mt-1 text-xs text-slate-500">{item.count} students</p> */}
              <p className="text-[12px] text-slate-500">{item.count} students</p>
              {/* changed mt-1 text-xs to text-[12px] */}
            </div>
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 rounded-xl bg-slate-900/50 p-2">
        {/* changed p-4 to p-2 */}
        {sortedData.map((item) => {
          const percentage = total ? Math.round((item.count / total) * 100) : 0;
          const icon =
            item.gender.toLowerCase() === "male" ? (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12a3 3 0 100-6 3 3 0 000 6z" />
                <path
                  fillRule="evenodd"
                  d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"
                />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12a3 3 0 100-6 3 3 0 000 6z" />
                <path
                  fillRule="evenodd"
                  d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"
                />
              </svg>
            );

          return (
            <div key={`stat-${item.gender}`} className="text-center">
              <div
                className={`flex justify-center mb-2 text-${item.gender.toLowerCase() === "male" ? "blue" : "pink"
                  }-400`}
              >
                {icon}
              </div>
              <p className="text-2xl font-bold text-white">{percentage}%</p>
              <p className="mt-1 text-xs text-slate-400 capitalize">{item.gender}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
