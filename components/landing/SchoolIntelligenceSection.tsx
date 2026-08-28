"use client";

import { 
  Building2, 
  ShieldCheck, 
  Activity, 
  BarChart2, 
  Layers
} from "lucide-react";

export default function SchoolIntelligenceSection() {
  const metrics = [
    { label: "Enrolled Students", val: "1,240+", badge: "100% Tracked", colorClass: "pub-text-accent" },
    { label: "Faculty & Staff", val: "84", badge: "Active Portals", colorClass: "pub-text-emerald" },
    { label: "Overall Attendance Rate", val: "97.2%", badge: "High Engagement", colorClass: "pub-text-blue" },
    { label: "Academic Pass Metric", val: "94.6%", badge: "Target Met", colorClass: "pub-text-emerald" }
  ];

  return (
    <section id="schools" className="relative py-24 public-page transition-colors duration-300">
      {/* Background Radial Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] rounded-full bg-radial from-blue-600/15 via-cyan-500/10 to-transparent blur-3xl pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3.5 py-1 text-xs font-bold pub-text-blue mb-4 shadow-sm">
            <Building2 className="h-3.5 w-3.5" />
            <span>SCHOOL INTELLIGENCE & INSTITUTIONAL ANALYTICS</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight pub-text-primary uppercase">
            SEE THE <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">WHOLE SCHOOL.</span>
          </h2>

          <p className="mt-4 text-base sm:text-lg pub-text-secondary leading-relaxed">
            Turn everyday academic activity into a clearer picture of student progress, classroom performance, and school-wide outcomes.
          </p>
        </div>

        {/* Intelligence Container */}
        <div className="pub-mockup-school rounded-3xl border p-6 sm:p-8 backdrop-blur-2xl shadow-xl transition-all duration-300">
          
          {/* Top Metrics Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {metrics.map((m) => (
              <div key={m.label} className="pub-card rounded-2xl border p-4 text-center shadow-sm">
                <span className="text-[11px] pub-text-muted block uppercase font-medium">{m.label}</span>
                <span className={`text-2xl sm:text-3xl font-extrabold ${m.colorClass} mt-1 block font-mono`}>{m.val}</span>
                <span className="text-[10px] font-semibold pub-text-secondary bg-slate-500/10 px-2 py-0.5 rounded-full mt-2 inline-block border pub-border-line">
                  {m.badge}
                </span>
              </div>
            ))}
          </div>

          {/* School Intelligence Chart & Insights Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            
            {/* Left Col: School Analytics Visualizer */}
            <div className="lg:col-span-7 pub-surface rounded-2xl border p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BarChart2 className="h-4 w-4 pub-text-accent" />
                  <h4 className="text-sm font-bold pub-text-primary uppercase">
                    School-Wide Academic & Attendance Trends
                  </h4>
                </div>
                <span className="text-[10px] font-mono font-bold pub-chip-cyan px-2.5 py-1 rounded-full border">
                  2025-2026 ACADEMIC YEAR
                </span>
              </div>

              {/* Chart Visual Simulation */}
              <div className="pub-chart relative h-64 w-full rounded-xl border p-4 flex flex-col justify-between shadow-inner">
                
                {/* Y-axis grid lines */}
                <div className="absolute inset-x-4 top-8 border-b pub-chart-grid-line" />
                <div className="absolute inset-x-4 top-24 border-b pub-chart-grid-line" />
                <div className="absolute inset-x-4 top-40 border-b pub-chart-grid-line" />

                {/* Bars representation */}
                <div className="relative z-10 flex items-end justify-between h-44 pt-4 px-2">
                  {[
                    { month: "SEP", height1: "70%", height2: "85%" },
                    { month: "OCT", height1: "78%", height2: "88%" },
                    { month: "NOV", height1: "82%", height2: "92%" },
                    { month: "DEC", height1: "88%", height2: "94%" },
                    { month: "JAN", height1: "92%", height2: "96%" },
                    { month: "FEB", height1: "95%", height2: "98%" }
                  ].map((bar) => (
                    <div key={bar.month} className="flex flex-col items-center gap-2">
                      <div className="flex items-end gap-1.5 h-36">
                        <div 
                          style={{ height: bar.height1 }} 
                          className="w-3 sm:w-4 rounded-t-md bg-gradient-to-t from-blue-600 to-cyan-400 opacity-85 hover:opacity-100 transition-opacity" 
                        />
                        <div 
                          style={{ height: bar.height2 }} 
                          className="w-3 sm:w-4 rounded-t-md bg-gradient-to-t from-emerald-600 to-emerald-400 opacity-90 hover:opacity-100 transition-opacity" 
                        />
                      </div>
                      <span className="text-[10px] font-mono pub-text-muted font-bold">{bar.month}</span>
                    </div>
                  ))}
                </div>

                {/* Legend */}
                <div className="flex items-center justify-center gap-6 pt-2 border-t pub-border-line text-[11px] pub-text-secondary">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
                    <span>Academic Average Score</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                    <span>Attendance Rate</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Col: Institutional Intelligence Features */}
            <div className="lg:col-span-5 space-y-4">
              
              <div className="pub-card rounded-2xl border p-4 shadow-sm hover:border-blue-500/40 transition-all">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-blue-500/20 pub-text-blue border border-blue-500/30 shrink-0">
                    <Activity className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold pub-text-primary">Early Academic Risk Detection</h4>
                    <p className="text-xs pub-text-secondary mt-1">
                      Identifies learning gaps early so teachers can offer timely support before major exams.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pub-card rounded-2xl border p-4 shadow-sm hover:border-cyan-500/40 transition-all">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-cyan-500/20 pub-text-accent border border-cyan-500/30 shrink-0">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold pub-text-primary">Institutional Privacy & Safety</h4>
                    <p className="text-xs pub-text-secondary mt-1">
                      Role-based permission architecture ensures data safety for students, parents, and administrative staff.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pub-card rounded-2xl border p-4 shadow-sm hover:border-emerald-500/40 transition-all">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-emerald-500/20 pub-text-emerald border border-emerald-500/30 shrink-0">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold pub-text-primary">Connected Parent-School Bridge</h4>
                    <p className="text-xs pub-text-secondary mt-1">
                      Keep parents informed on attendance, grades, and school announcements through direct parent portals.
                    </p>
                  </div>
                </div>
              </div>

            </div>

          </div>

        </div>

      </div>
    </section>
  );
}

