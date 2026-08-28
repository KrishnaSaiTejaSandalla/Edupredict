"use client";

import { 
  BookOpen, 
  Users, 
  Building2, 
  CheckCircle2, 
  Sparkles
} from "lucide-react";

export default function BuiltForSchoolSection() {
  const pillars = [
    {
      role: "STUDENTS",
      icon: BookOpen,
      color: "from-cyan-500 to-blue-600",
      borderColor: "border-cyan-500/30",
      lightBorder: "pub-pillar-cyan",
      description:
        "Learn smarter, track progress, complete assignments, and stay connected with your school.",
      highlights: [
        "Personalized learning progress tracker",
        "Instant grade & assignment notifications",
        "Interactive AI study assistant"
      ],
      previewStats: [
        { label: "Study Progress", val: "88%", colorClass: "pub-text-accent" },
        { label: "Assignments Completed", val: "24/26", colorClass: "pub-text-emerald" }
      ]
    },
    {
      role: "TEACHERS",
      icon: Users,
      color: "from-emerald-500 to-teal-600",
      borderColor: "border-emerald-500/30",
      lightBorder: "pub-pillar-emerald",
      description:
        "Manage classes, assignments, assessments, student progress, and classroom communication.",
      highlights: [
        "One-click attendance & batch grading",
        "Real-time class analytics & bell curve",
        "Direct parent & student announcements"
      ],
      previewStats: [
        { label: "Classes Managed", val: "5 Active", colorClass: "pub-text-emerald" },
        { label: "Avg Attendance", val: "97.4%", colorClass: "pub-text-accent" }
      ]
    },
    {
      role: "SCHOOLS",
      icon: Building2,
      color: "from-blue-500 to-indigo-600",
      borderColor: "border-blue-500/30",
      lightBorder: "pub-pillar-blue",
      description:
        "Bring learning, administration, communication, and student progress into one connected platform.",
      highlights: [
        "School-wide operational dashboards",
        "Multi-branch performance metrics",
        "Automated parent-teacher connection"
      ],
      previewStats: [
        { label: "Platform Uptime", val: "99.99%", colorClass: "pub-text-blue" },
        { label: "Risk Alerts Prevented", val: "142", colorClass: "pub-text-emerald" }
      ]
    }
  ];

  return (
    <section id="features" className="relative py-24 public-page transition-colors duration-300">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full bg-radial from-cyan-500/10 via-emerald-500/5 to-transparent blur-3xl pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1 text-xs font-bold pub-text-accent mb-4 shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
            <span>THE EDUPREDICT ECOSYSTEM</span>
          </div>
          
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight pub-text-primary uppercase">
            BUILT FOR THE <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">ENTIRE SCHOOL.</span>
          </h2>
          
          <p className="mt-4 text-base sm:text-lg pub-text-secondary">
            EduPredict connects every role in the educational ecosystem into a seamless, intelligent workspace.
          </p>
        </div>

        {/* 3 Columns Grid Cards */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          {pillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div
                key={pillar.role}
                className={`group relative rounded-3xl border ${pillar.borderColor} ${pillar.lightBorder} pub-card p-6 sm:p-8 backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl shadow-lg flex flex-col justify-between`}
              >
                <div>
                  {/* Icon & Title */}
                  <div className="flex items-center justify-between mb-6">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r ${pillar.color} text-slate-950 p-2.5 shadow-md group-hover:scale-110 transition-transform`}>
                      <Icon className="h-6 w-6 stroke-[2.5]" />
                    </div>
                    <span className="text-xs font-mono font-bold tracking-widest pub-text-muted uppercase">
                      {pillar.role} PORTAL
                    </span>
                  </div>

                  <h3 className="text-2xl font-extrabold tracking-tight pub-text-primary mb-3">
                    {pillar.role}
                  </h3>

                  <p className="text-sm pub-text-secondary leading-relaxed font-normal mb-6">
                    "{pillar.description}"
                  </p>

                  {/* Highlights List */}
                  <ul className="space-y-2.5 mb-8">
                    {pillar.highlights.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs pub-text-secondary">
                        <CheckCircle2 className="h-4 w-4 shrink-0 pub-text-accent mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Preview Mini Stats Widget */}
                <div className="rounded-2xl border pub-border-line pub-surface p-4 shadow-sm">
                  <div className="grid grid-cols-2 gap-2 text-center">
                    {pillar.previewStats.map((stat, sIdx) => (
                      <div key={sIdx} className="p-2 rounded-xl bg-slate-500/5">
                        <span className="text-[10px] pub-text-muted block uppercase font-medium">{stat.label}</span>
                        <span className={`text-sm font-bold ${stat.colorClass}`}>{stat.val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}

