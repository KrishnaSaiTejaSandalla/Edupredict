"use client";

import { useEffect, useState } from "react";
import { RefreshCw, WifiOff } from "lucide-react";

/**
 * Displays only when the browser reports that its network connection is offline.
 * This deliberately does not react to failed requests, since an API error is not
 * proof that the device has lost its internet connection.
 */
export default function OfflineExperience() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const updateConnection = () => setIsOffline(!window.navigator.onLine);

    updateConnection();
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);

    return () => {
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <section
      className="fixed inset-0 z-[100] flex min-h-dvh items-center justify-center overflow-hidden bg-[#060b18] px-5 py-8 text-white"
      role="alert"
      aria-live="assertive"
      aria-label="You are offline"
    >
      <video
        className="absolute inset-0 h-full w-full object-cover opacity-75 brightness-110"
        autoPlay
        loop
        muted
        playsInline
        aria-hidden="true"
      >
        <source src="/videos/404-background.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,8,20,0.30),rgba(3,8,20,0.14)_40%,rgba(3,8,20,0.52))]" />

      <section className="relative w-full max-w-5xl px-6 py-10 text-center sm:px-12 sm:py-14">
        <div>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-200/30 bg-amber-300/15 text-amber-200 shadow-lg shadow-amber-950/40">
            <WifiOff className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
          </div>
          <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.42em] text-cyan-100 sm:text-xs">EduPredict</p>

          <h1 className="mt-5 text-5xl font-black leading-none tracking-[-0.07em] text-white/90 drop-shadow-2xl sm:text-7xl md:text-9xl">
            OFFLINE
          </h1>

          <div className="mx-auto mt-7 h-px w-32 bg-gradient-to-r from-transparent via-white/75 to-transparent" />
          <blockquote className="mx-auto mt-7 max-w-xl text-base font-medium leading-7 text-white/95 drop-shadow sm:text-xl sm:leading-8">
            “The connection may be lost for now, but your learning journey is waiting right where you left it.”
          </blockquote>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-100/80">
            Reconnect to Wi-Fi or mobile data, then try again.
          </p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-300 px-6 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-950/30 transition hover:bg-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-100 focus:ring-offset-2 focus:ring-offset-slate-950"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Try again
          </button>
          <p className="mt-5 text-xs text-slate-100/70">This screen will close automatically when you&apos;re back online.</p>
        </div>
      </section>
    </section>
  );
}
