"use client";

import { useState, useRef, MouseEvent } from "react";
import { 
  GraduationCap, 
  Brain, 
  TrendingUp, 
  Sparkles, 
  Zap,
  Activity
} from "lucide-react";

export default function Classroom3DVisual() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    // Subtle 3D tilt calculation
    setRotateX(-y * 0.03);
    setRotateY(x * 0.03);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full max-w-5xl mx-auto perspective-1000 my-8 px-2 sm:px-4"
    >
      {/* Ambient background glow behind classroom */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[80%] rounded-full bg-gradient-to-tr from-cyan-500/20 via-emerald-500/15 to-blue-600/20 blur-3xl pointer-events-none animate-pulse-glow" />

      {/* Main 3D Classroom Container Frame */}
      <div
        style={{
          transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
          transition: "transform 0.2s ease-out",
        }}
        className="preserve-3d relative rounded-3xl border pub-mockup p-4 sm:p-6 lg:p-8 backdrop-blur-xl shadow-2xl overflow-hidden transition-all duration-300"
      >
        {/* Subtle grid lines background overlay inside frame */}
        <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none" />

        {/* Top Header Bar of Classroom Console */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pb-4 mb-6 border-b pub-border-line">
          <div className="flex items-center gap-3">
            <div className="flex h-3 w-3 items-center justify-center">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </div>
            <span className="text-xs font-semibold tracking-wider pub-text-secondary uppercase flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 pub-text-accent" />
              Interactive Modern Classroom • Live Session
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-full border pub-chip-cyan font-mono shadow-sm">
              AI Active • Class 10-A
            </span>
            <span className="hidden sm:inline-block px-2.5 py-1 rounded-full border pub-chip-emerald font-mono shadow-sm">
              Attendance 98.2%
            </span>
          </div>
        </div>

        {/* Classroom Centerpiece Grid */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          
          {/* Left Column: Digital Classroom Board & Teacher Area */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Main Digital Smartboard */}
            <div className="relative rounded-2xl border pub-surface p-5 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-cyan-500/20 pub-text-accent border border-cyan-500/30">
                    <Activity className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold pub-text-primary tracking-wide">
                      SMARTBOARD: ADVANCED ALGEBRA & PHYSICS
                    </h3>
                    <p className="text-[11px] pub-text-muted">Teacher Station: Dr. Evelyn Vance</p>
                  </div>
                </div>
                <span className="text-[10px] uppercase font-bold tracking-widest pub-chip-emerald px-2.5 py-1 rounded-full border shadow-sm">
                  REAL-TIME SYNC
                </span>
              </div>

              {/* Board Analytics & AI Prediction Curve */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="rounded-xl border pub-border-line pub-card p-3 text-center shadow-sm">
                  <span className="text-[10px] pub-text-muted block uppercase font-medium">Class Mastered</span>
                  <span className="text-lg sm:text-xl font-extrabold pub-text-accent font-mono">94.8%</span>
                </div>
                <div className="rounded-xl border pub-border-line pub-card p-3 text-center shadow-sm">
                  <span className="text-[10px] pub-text-muted block uppercase font-medium">Avg Score</span>
                  <span className="text-lg sm:text-xl font-extrabold pub-text-emerald font-mono">A+ (92)</span>
                </div>
                <div className="rounded-xl border pub-border-line pub-card p-3 text-center shadow-sm">
                  <span className="text-[10px] pub-text-muted block uppercase font-medium">AI Confidence</span>
                  <span className="text-lg sm:text-xl font-extrabold pub-text-blue font-mono">98.4%</span>
                </div>
              </div>

              {/* Animated Graph Curve representation */}
              <div className="relative h-28 w-full rounded-xl pub-chart border p-3 overflow-hidden flex flex-col justify-end shadow-inner">
                <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/10 to-transparent pointer-events-none" />
                {/* SVG Graph Curve */}
                <svg className="w-full h-20" viewBox="0 0 300 80" fill="none">
                  <defs>
                    <linearGradient id="gradCurve" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#06b6d4" />
                      <stop offset="50%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#3b82f6" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M 0,60 Q 50,20 100,45 T 200,15 T 300,30"
                    fill="none"
                    stroke="url(#gradCurve)"
                    strokeWidth="3.5"
                    className="drop-shadow-[0_0_6px_rgba(6,182,212,0.4)]"
                  />
                  {/* Pulse dots on graph */}
                  <circle cx="100" cy="45" r="4" fill="#06b6d4" />
                  <circle cx="200" cy="15" r="5" fill="#10b981" className="animate-ping" />
                  <circle cx="200" cy="15" r="4" fill="#10b981" />
                </svg>
                <div className="flex justify-between items-center text-[10px] pub-text-muted font-mono pt-1">
                  <span>TERM 1</span>
                  <span>MID TERM</span>
                  <span>PREDICTED FINAL 🎓</span>
                </div>
              </div>
            </div>

            {/* Student Desks & Learning Stations Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { name: "Station 01", status: "Active • Quiz 100%", colorClass: "pub-text-emerald" },
                { name: "Station 02", status: "Active • Lab Notes", colorClass: "pub-text-accent" },
                { name: "Station 03", status: "Submitting Test", colorClass: "pub-text-blue" },
                { name: "Station 04", status: "AI Tutor Engaged", colorClass: "pub-text-emerald" }
              ].map((desk) => (
                <div 
                  key={desk.name}
                  className="rounded-xl border pub-card p-2.5 shadow-sm hover:border-cyan-500/40 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-cyan-500" />
                    <span className="text-[11px] font-semibold pub-text-primary">{desk.name}</span>
                  </div>
                  <p className={`text-[10px] ${desk.colorClass} mt-1 font-medium`}>{desk.status}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Floating Educational 3D Interactive Cards */}
          <div className="lg:col-span-5 flex flex-col gap-4 relative">

            {/* Floating Object 1: 🎓 Graduation & Achievement Card */}
            <div className="animate-float-slow rounded-2xl border border-emerald-500/30 pub-card p-4 backdrop-blur-xl shadow-lg hover:border-emerald-400/60 transition-all">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 pub-text-emerald border border-emerald-500/30 shadow-sm">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold pub-text-primary">Student Milestone Reached</span>
                    <span className="text-[9px] font-bold pub-chip-emerald px-2 py-0.5 rounded-full border">
                      TOP 1%
                    </span>
                  </div>
                  <p className="text-[11px] pub-text-secondary mt-1">
                    Liam Miller projected to pass with distinction (GPA 3.98)
                  </p>
                </div>
              </div>
            </div>

            {/* Floating Object 2: 📚 Digital Books & AI Tutor Node */}
            <div className="animate-float-reverse rounded-2xl border border-cyan-500/30 pub-card p-4 backdrop-blur-xl shadow-lg hover:border-cyan-400/60 transition-all">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/20 pub-text-accent border border-cyan-500/30 shadow-sm">
                  <Brain className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold pub-text-primary">AI Adaptive Learning Engine</span>
                    <Zap className="h-3.5 w-3.5 pub-text-accent animate-pulse" />
                  </div>
                  <p className="text-[11px] pub-text-secondary mt-1">
                    Smart recommendation: Extra calculus drill auto-assigned.
                  </p>
                </div>
              </div>
            </div>

            {/* Floating Object 3: 📊 Progress Chart & Classroom Attendance Badge */}
            <div className="animate-float-delayed rounded-2xl border border-blue-500/30 pub-card p-4 backdrop-blur-xl shadow-lg hover:border-blue-400/60 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/20 pub-text-blue border border-blue-500/30 shadow-sm">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold pub-text-primary">School-Wide Pass Rate</h4>
                    <p className="text-[10px] pub-text-muted">Semester 2 Target Exceeded</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-lg font-extrabold pub-text-blue font-mono">+14.2%</span>
                  <span className="block text-[9px] pub-text-emerald font-semibold">vs last year</span>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Floating Ambient Educational Icons (Subtle background elements) */}
        <div className="absolute -top-6 -right-6 pointer-events-none opacity-10 text-8xl font-black select-none">
          📚
        </div>
        <div className="absolute -bottom-8 -left-6 pointer-events-none opacity-10 text-8xl font-black select-none">
          🎓
        </div>
      </div>
    </div>
  );
}

