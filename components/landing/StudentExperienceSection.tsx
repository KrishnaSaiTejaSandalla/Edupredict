"use client";

import { 
  BookOpen, 
  GraduationCap, 
  Award, 
  Clock, 
  CheckCircle2, 
  Sparkles, 
} from "lucide-react";

export default function StudentExperienceSection() {
  const subjects = [
    { name: "Advanced Mathematics", grade: "A (96%)", progress: 96, teacher: "Dr. Evelyn Vance" },
    { name: "Physics & Chemistry", grade: "A- (91%)", progress: 91, teacher: "Prof. Marcus Thorne" },
    { name: "Computer Science", grade: "A+ (98%)", progress: 98, teacher: "Mrs. Sarah Jenkins" },
    { name: "World Literature", grade: "B+ (88%)", progress: 88, teacher: "Mr. David Miller" }
  ];

  const assignments = [
    { title: "Calculus Optimization Problem Set", subject: "Math", due: "Tomorrow, 5:00 PM", status: "In Progress", chipClass: "pub-chip-amber" },
    { title: "Quantum Physics Lab Report", subject: "Physics", due: "Aug 28, 2026", status: "Submitted", chipClass: "pub-chip-emerald" },
    { title: "Python Data Structures Project", subject: "CS", due: "Sep 02, 2026", status: "Assigned", chipClass: "pub-chip-cyan" }
  ];

  return (
    <section id="students" className="relative py-24 public-page transition-colors duration-300">
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1 text-xs font-bold pub-text-accent mb-3 shadow-sm">
              <GraduationCap className="h-3.5 w-3.5" />
              <span>STUDENT DASHBOARD EXPERIENCE</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight pub-text-primary uppercase">
              LEARN SMARTER. <span className="pub-text-accent">TRACK EVERYTHING.</span>
            </h2>
            <p className="mt-2 text-base pub-text-secondary max-w-xl">
              Empowering students with instant visibility into their academic performance, assignments, schedules, and AI learning insights.
            </p>
          </div>

        </div>

        {/* Student Dashboard Representation Box */}
        <div className="pub-mockup rounded-3xl border p-6 sm:p-8 backdrop-blur-2xl shadow-xl transition-all duration-300">
          
          {/* Top Bar of Student Dashboard */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 mb-6 border-b pub-border-line">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-cyan-400 to-emerald-400 flex items-center justify-center font-bold text-slate-950 text-sm shadow-md">
                LM
              </div>
              <div>
                <h3 className="text-base font-bold pub-text-primary">Liam Miller</h3>
                <p className="text-xs pub-text-muted">Grade 10 • Student ID: #2026-8942</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs pub-text-emerald font-semibold shadow-sm">
                <CheckCircle2 className="h-4 w-4" />
                <span>Attendance: 98.5%</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1.5 text-xs pub-text-accent font-semibold shadow-sm">
                <Award className="h-4 w-4" />
                <span>GPA: 3.94 / 4.0</span>
              </div>
            </div>
          </div>

          {/* Main Dashboard Layout Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Col: Subject Progress Breakdown */}
            <div className="lg:col-span-7 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider pub-text-muted flex items-center gap-2">
                <BookOpen className="h-4 w-4 pub-text-accent" />
                Enrolled Subjects & Live Mastery
              </h4>

              <div className="space-y-3">
                {subjects.map((sub) => (
                  <div key={sub.name} className="pub-card rounded-2xl border p-4 hover:border-cyan-500/40 shadow-sm transition-all">
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <h5 className="text-sm font-bold pub-text-primary">{sub.name}</h5>
                        <p className="text-[11px] pub-text-muted">{sub.teacher}</p>
                      </div>
                      <span className="text-sm font-extrabold pub-text-accent font-mono">{sub.grade}</span>
                    </div>

                    {/* Progress bar */}
                    <div className="h-2 w-full rounded-full pub-progress-track overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-1000" 
                        style={{ width: `${sub.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Col: Upcoming Assignments & AI Study Insights */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Upcoming Assignments Card */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider pub-text-muted flex items-center gap-2 mb-3">
                  <Clock className="h-4 w-4 pub-text-amber" />
                  Upcoming Assignments
                </h4>

                <div className="space-y-2.5">
                  {assignments.map((asg) => (
                    <div key={asg.title} className="pub-card rounded-2xl border p-3.5 flex items-center justify-between shadow-sm">
                      <div>
                        <h5 className="text-xs font-bold pub-text-primary">{asg.title}</h5>
                        <p className="text-[10px] pub-text-muted mt-0.5">Due: {asg.due}</p>
                      </div>
                      <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${asg.chipClass}`}>
                        {asg.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Assistant Insight Box */}
              <div className="pub-card rounded-2xl border border-cyan-500/30 p-4 relative overflow-hidden shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/20 pub-text-accent border border-cyan-500/30 shadow-sm">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold pub-text-accent">EduPredict AI Study Tip</h5>
                    <p className="text-xs pub-text-secondary mt-1 leading-relaxed">
                      You're scoring 96% in Calculus! Spending 20 mins reviewing Physics Thermodynamics will boost your overall GPA to 3.98.
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
