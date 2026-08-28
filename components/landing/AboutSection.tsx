"use client";

import Link from "next/link";
import { 
  Sparkles, 
  ShieldCheck, 
  ArrowRight, 
  Cpu, 
  Lock, 
  Smartphone
} from "lucide-react";

export default function AboutSection() {
  const features = [
    {
      icon: Cpu,
      title: "AI-Powered Predictions",
      desc: "Advanced machine learning algorithms to assist educators with proactive student progress tracking."
    },
    {
      icon: ShieldCheck,
      title: "Multi-Role Architecture",
      desc: "Isolated, secure portals tailored specifically for Students, Teachers, Parents, and School Administrators."
    },
    {
      icon: Smartphone,
      title: "Real-Time Tracking & Transport",
      desc: "Instant attendance notifications and live smart bus location updates for complete parent peace of mind."
    },
    {
      icon: Lock,
      title: "Enterprise Grade Security",
      desc: "Encrypted data pipelines, role-based access control, and strict compliance with educational privacy standards."
    }
  ];

  return (
    <section id="about" className="relative py-24 public-page transition-colors duration-300">
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* About Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Text & CTA */}
          <div className="lg:col-span-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1 text-xs font-bold pub-text-accent mb-4 shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              <span>ABOUT EDUPREDICT</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight pub-text-primary uppercase leading-tight">
              REDEFINING HOW <br />
              <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                SCHOOLS LEARN & GROW.
              </span>
            </h2>

            <p className="mt-6 text-base sm:text-lg pub-text-secondary leading-relaxed font-normal">
              EduPredict was created to bridge the gaps between classroom learning, teacher workloads, administrative oversight, and parent involvement.
            </p>

            <p className="mt-4 text-sm pub-text-muted leading-relaxed">
              By combining intuitive user interfaces with intelligent analytics, EduPredict empowers every member of the academic ecosystem to focus on what matters most: helping students succeed.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-400 px-6 py-3.5 text-xs font-bold text-slate-950 shadow-lg shadow-cyan-500/20 hover:scale-105 transition-all"
              >
                <span>LAUNCH EDUPREDICT</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Right Column: Key Feature Cards Grid */}
          <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="rounded-2xl border pub-card p-5 backdrop-blur-xl hover:border-cyan-500/40 shadow-sm transition-all group"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 pub-text-accent border border-cyan-500/20 group-hover:scale-110 transition-transform">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-sm font-bold pub-text-primary tracking-wide">
                    {f.title}
                  </h3>
                  <p className="mt-2 text-xs pub-text-muted leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              );
            })}
          </div>

        </div>

      </div>
    </section>
  );
}

