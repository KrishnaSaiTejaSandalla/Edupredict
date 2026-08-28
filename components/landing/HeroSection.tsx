"use client";

import Link from "next/link";
import { ArrowRight, Sparkles, GraduationCap, ShieldCheck, Zap } from "lucide-react";
import Classroom3DVisual from "./Classroom3DVisual";

export default function HeroSection() {
  return (
    <section
      id="hero"
      className="relative min-h-screen pt-28 pb-16 overflow-hidden flex flex-col justify-between public-page transition-colors duration-300"
    >
      {/* Background Gradients & Grid */}
      <div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full bg-radial from-cyan-500/15 via-blue-600/10 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-[400px] h-[400px] rounded-full bg-radial from-emerald-500/10 to-transparent blur-3xl pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center my-auto">
        
        {/* Top Tagline Pill */}
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-xs font-semibold pub-text-accent shadow-sm mb-8 backdrop-blur-md">
          <Sparkles className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
          <span>SMART SCHOOL PLATFORM FOR MODERN EDUCATION</span>
        </div>

        {/* Primary Headline */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight pub-text-primary uppercase leading-[1.1]">
          SMARTER LEARNING.<br />
          <span className="bg-gradient-to-r from-cyan-400 via-emerald-400 to-cyan-300 bg-clip-text text-transparent drop-shadow-sm">
            BETTER FUTURES.
          </span>
        </h1>

        {/* Supporting Text */}
        <p className="mx-auto mt-6 max-w-3xl text-base sm:text-lg md:text-xl pub-text-secondary font-normal leading-relaxed">
          EduPredict brings students, teachers, and schools together with intelligent tools for learning, progress, communication, and academic success.
        </p>

        {/* Action CTAs */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          {/* Primary CTA */}
          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-cyan-400 to-emerald-400 px-8 py-4 text-sm font-bold text-slate-950 shadow-xl shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
          >
            <span>LAUNCH EDUPREDICT</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Visual Highlights Badges */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs pub-text-muted">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-cyan-500" />
            <span>Built for K-12 & Higher Education</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-emerald-500" />
            <span>Real-Time Performance Predictions</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-blue-500" />
            <span>Role-Based Multi-Portal Security</span>
          </div>
        </div>

        {/* 3D Modern Classroom Visual Centerpiece */}
        <Classroom3DVisual />

      </div>
    </section>
  );
}

