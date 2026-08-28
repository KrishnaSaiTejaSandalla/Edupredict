"use client";

import { 
  Users, 
  CheckSquare, 
  Plus, 
  UserCheck, 
  AlertCircle
} from "lucide-react";

export default function TeacherExperienceSection() {
  const teacherKPIs = [
    { label: "Active Classes", val: "5", desc: "148 Total Students", chipClass: "pub-chip-cyan" },
    { label: "Pending Submissions", val: "18", desc: "Batch Grading Ready", chipClass: "pub-chip-amber" },
    { label: "Class Avg Attendance", val: "97.8%", desc: "+2.1% this month", chipClass: "pub-chip-emerald" },
    { label: "Assessments Created", val: "12", desc: "Term 2 Syllabus", chipClass: "pub-chip-blue" }
  ];

  const recentStudents = [
    { name: "Sophia Chen", grade: "98% (A+)", status: "Exceeding Target", badgeClass: "pub-chip-emerald" },
    { name: "Ethan Vance", grade: "94% (A)", status: "Steady High", badgeClass: "pub-chip-cyan" },
    { name: "Oliver Smith", grade: "74% (C)", status: "AI Support Triggered", badgeClass: "pub-chip-amber" },
    { name: "Emma Davis", grade: "91% (A-)", status: "Steady High", badgeClass: "pub-chip-cyan" }
  ];

  return (
    <section id="teachers" className="relative py-24 public-page transition-colors duration-300">
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-bold pub-text-emerald mb-3 shadow-sm">
            <Users className="h-3.5 w-3.5" />
            <span>TEACHER WORKSPACE & CLASS MANAGEMENT</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight pub-text-primary uppercase">
            POWERFUL TOOLS FOR <span className="pub-text-emerald">PASSIONATE EDUCATORS.</span>
          </h2>

          <p className="mt-4 text-base sm:text-lg pub-text-secondary">
            Streamline lesson planning, automate routine attendance, grade assignments effortlessly, and track classroom performance in real-time.
          </p>
        </div>

        {/* Teacher Workspace UI Mockup */}
        <div className="pub-mockup-alt rounded-3xl border p-6 sm:p-8 backdrop-blur-2xl shadow-xl transition-all duration-300">
          
          {/* Top KPI Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {teacherKPIs.map((kpi) => (
              <div key={kpi.label} className="pub-card rounded-2xl border p-4 shadow-sm">
                <span className="text-[11px] pub-text-muted block font-medium uppercase tracking-wider">{kpi.label}</span>
                <span className="text-2xl sm:text-3xl font-extrabold pub-text-primary mt-1 block font-mono">{kpi.val}</span>
                <span className={`text-[10px] font-semibold mt-2 inline-block px-2.5 py-0.5 rounded-full border ${kpi.chipClass}`}>
                  {kpi.desc}
                </span>
              </div>
            ))}
          </div>

          {/* Teacher Roster & Assessment Layout Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Col: Class Roster & Student Performance */}
            <div className="lg:col-span-8 pub-surface rounded-2xl border p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4 pb-3 border-b pub-border-line">
                <div>
                  <h4 className="text-sm font-bold pub-text-primary flex items-center gap-2">
                    <UserCheck className="h-4 w-4 pub-text-emerald" />
                    CLASS 10-A STUDENT PERFORMANCE ROSTER
                  </h4>
                  <p className="text-[11px] pub-text-muted">Subject: Advanced Mathematics & Physics</p>
                </div>
                <button className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all flex items-center gap-1">
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create Assessment</span>
                </button>
              </div>

              {/* Roster Table Mock */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b pub-border-line pub-text-muted font-mono text-[11px]">
                      <th className="py-2.5 px-3">STUDENT</th>
                      <th className="py-2.5 px-3">CURRENT GRADE</th>
                      <th className="py-2.5 px-3">STATUS & INSIGHT</th>
                      <th className="py-2.5 px-3 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="pub-divide">
                    {recentStudents.map((st) => (
                      <tr key={st.name} className="hover:bg-slate-500/5 transition-colors">
                        <td className="py-3 px-3 font-semibold pub-text-primary">{st.name}</td>
                        <td className="py-3 px-3 font-mono font-bold pub-text-accent">{st.grade}</td>
                        <td className="py-3 px-3">
                          <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${st.badgeClass}`}>
                            {st.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button className="text-[11px] font-semibold pub-text-secondary hover:pub-text-primary underline">
                            View Profile
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Col: Quick Class Actions */}
            <div className="lg:col-span-4 space-y-4">
              
              {/* Automated Attendance Box */}
              <div className="pub-surface rounded-2xl border p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold pub-text-primary flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 pub-text-emerald" />
                    Today's Attendance
                  </h4>
                  <span className="text-[10px] font-bold pub-chip-emerald px-2 py-0.5 rounded-full border">
                    MARKED
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs pub-text-secondary pub-card p-3 rounded-xl border">
                  <span>28 Present • 1 Leave • 0 Absent</span>
                  <span className="font-mono pub-text-accent font-bold">96.5%</span>
                </div>
              </div>

              {/* Assessment Alert Box */}
              <div className="pub-alert rounded-2xl border p-4 shadow-sm">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 pub-text-amber shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-xs font-bold pub-alert-title">Classroom Intervention Alert</h5>
                    <p className="text-xs pub-alert-text mt-1">
                      2 students require reinforcement in Physics Vectors before Mid-Term Exam.
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

