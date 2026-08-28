import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Home, MapPinOff } from "lucide-react";
import logo from "@/branding/logo.png";

export default function NotFound() {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#060b18] px-5 py-8 text-white">
      <video
        className="absolute inset-0 h-full w-full object-cover opacity-75 brightness-110"
        autoPlay
        loop
        muted
        playsInline
        aria-hidden="true"
      >
        <source src="/videos/404-background-2.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,8,20,0.30),rgba(3,8,20,0.14)_40%,rgba(3,8,20,0.52))]" />

      <section className="relative w-full max-w-5xl px-6 py-10 text-center sm:px-12 sm:py-14">
        <div className="flex items-center justify-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-400/10 p-2">
            <Image src={logo} alt="EduPredict" width={32} height={32} priority className="h-full w-full object-contain" />
          </div>
          <span className="text-xl font-bold tracking-tight">Edu<span className="text-cyan-300">Predict</span></span>
        </div>

        <div className="mx-auto mt-10 flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-200/30 bg-cyan-300/15 text-cyan-100 shadow-lg shadow-cyan-950/40">
          <MapPinOff className="h-7 w-7" strokeWidth={1.7} aria-hidden="true" />
        </div>
        <p className="mt-5 text-6xl font-black leading-none tracking-[-0.07em] text-white/90 drop-shadow-2xl sm:text-8xl md:text-9xl">404</p>
        <div className="mx-auto mt-7 h-px w-32 bg-gradient-to-r from-transparent via-white/75 to-transparent" />
        <blockquote className="mx-auto mt-7 max-w-xl text-base font-medium leading-7 text-white/95 drop-shadow sm:text-xl sm:leading-8">
          “The path may be broken, but the journey isn&apos;t. Let&apos;s get you back on track.”
        </blockquote>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-100/80">
          The page you&apos;re looking for may have moved or no longer exists.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-300 px-6 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-950/30 transition hover:bg-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-100 focus:ring-offset-2 focus:ring-offset-slate-950"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            Back to home
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/35 bg-slate-950/30 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-slate-950/30 transition hover:bg-slate-950/45 focus:outline-none focus:ring-2 focus:ring-white/60 focus:ring-offset-2 focus:ring-offset-slate-950"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Go to sign in
          </Link>
        </div>
      </section>
    </main>
  );
}
