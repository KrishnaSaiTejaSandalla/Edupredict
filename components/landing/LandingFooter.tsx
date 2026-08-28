"use client";

import Link from "next/link";
import Image from "next/image";
import { Mail } from "lucide-react";
import logo from "@/branding/logo.png";

export default function LandingFooter() {
  return (
    <footer className="border-t pub-border-line public-page py-16 relative overflow-hidden transition-colors duration-300">
      {/* Background Radial Ambient */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-radial from-cyan-500/10 via-emerald-500/5 to-transparent blur-3xl pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        <div className="public-contact-card rounded-3xl p-8 sm:p-10 mb-16 text-center">
          <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight pub-text-primary">Contact EduPredict</h3>
          <p className="mt-3 text-sm sm:text-base pub-text-secondary">Have a question or want to learn more? Get in touch.</p>
          <a
            href="mailto:krishnasaitejasandalla@gmail.com"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-400 px-6 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:scale-[1.02]"
          >
            <Mail className="h-4 w-4" />
            krishnasaitejasandalla@gmail.com
          </a>
        </div>

        {/* Main Footer Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-12 border-b pub-border-line">
          
          {/* Col 1: Brand Info */}
          <div className="md:col-span-2 space-y-4">
            <Link href="#hero" className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 p-2 border border-cyan-500/30">
                <Image
                  src={logo}
                  alt="EduPredict Logo"
                  width={30}
                  height={30}
                  className="h-full w-full object-contain"
                />
              </div>
              <span className="text-xl font-bold tracking-tight pub-text-primary">
                Edu<span className="text-cyan-500 dark:text-cyan-400">Predict</span>
              </span>
            </Link>

            <p className="text-xs pub-text-muted max-w-md leading-relaxed">
              EduPredict is a smart school platform that helps students learn, teachers teach, and schools understand progress.
            </p>
          </div>

          {/* Col 2: Navigation Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider pub-text-primary">Platform Portals</h4>
            <ul className="space-y-2 text-xs pub-text-muted">
              <li><Link href="/login" className="hover:pub-text-accent transition-colors">Student Portal</Link></li>
              <li><Link href="/login" className="hover:pub-text-accent transition-colors">Teacher Portal</Link></li>
              <li><Link href="/login" className="hover:pub-text-accent transition-colors">Parent Portal</Link></li>
              <li><Link href="/login" className="hover:pub-text-accent transition-colors">School Admin Portal</Link></li>
            </ul>
          </div>

          {/* Col 3: Sections */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider pub-text-primary">Explore</h4>
            <ul className="space-y-2 text-xs pub-text-muted">
              <li><a href="#features" className="hover:pub-text-accent transition-colors">Built for School</a></li>
              <li><a href="#students" className="hover:pub-text-accent transition-colors">Student Experience</a></li>
              <li><a href="#teachers" className="hover:pub-text-accent transition-colors">Teacher Tools</a></li>
              <li><a href="#schools" className="hover:pub-text-accent transition-colors">School Intelligence</a></li>
              <li><a href="#about" className="hover:pub-text-accent transition-colors">About Us</a></li>
            </ul>
          </div>

        </div>

        {/* Bottom Copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs pub-text-muted gap-4">
          <p>&copy; {new Date().getFullYear()} EduPredict. Smart Education System. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/privacy-policy" className="hover:pub-text-accent">Privacy Policy</Link>
            <Link href="/terms-of-service" className="hover:pub-text-accent">Terms of Service</Link>
            <Link href="/system-status" className="hover:pub-text-accent">System Status</Link>
          </div>
        </div>

      </div>
    </footer>
  );
}

