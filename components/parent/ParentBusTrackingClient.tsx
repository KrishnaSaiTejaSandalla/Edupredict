"use client";

import { useState, useEffect } from "react";

type BusDetails = {
  registrationNumber: string;
  routeName: string | null;
  driverName: string | null;
  driverPhone: string | null;
  capacity: number | null;
};

type Props = {
  bus: BusDetails | null;
};

const STOPS_LIST = [
  "School Campus",
  "High Street Intersection",
  "Green Valley Community",
  "Down Town Transit Hub",
  "Sunset Boulevard Gate 2",
];

export default function ParentBusTrackingClient({ bus }: Props) {
  const [currentStopIndex, setCurrentStopIndex] = useState(1);
  const [etaMinutes, setEtaMinutes] = useState(12);

  // Simulate bus movement along stops
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStopIndex((prev) => {
        const next = (prev + 1) % STOPS_LIST.length;
        // set random ETA based on distance to next stop
        setEtaMinutes(Math.floor(Math.random() * 8) + 3);
        return next;
      });
    }, 15000); // move every 15 seconds for demonstration

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-500 dark:text-cyan-400">
          Transport
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
          Live Bus Tracking
        </h1>
        <p className="mt-2 text-sm text-secondary">
          Monitor route progress, vehicle status, and driver contact info during daily commutes.
        </p>
      </div>

      {!bus ? (
        <div className="rounded-2xl border border-theme bg-surface p-12 text-center text-sm font-medium text-muted">
          No active bus routes are currently assigned to your child's profile. Please contact transportation helpdesk.
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Details Panel (1/3 col) */}
          <div className="rounded-3xl border border-theme bg-surface p-6 shadow-md space-y-6 flex flex-col justify-between">
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-primary pb-3 border-b border-subtle">
                Transit details
              </h3>

              {/* Registration and Route */}
              <div className="grid grid-cols-2 gap-4 text-xs font-medium text-secondary">
                <div>
                  <p className="text-[10px] text-muted font-bold uppercase tracking-wider">Registration Number</p>
                  <p className="mt-1 font-bold text-primary text-sm">{bus.registrationNumber}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted font-bold uppercase tracking-wider">Route Assignment</p>
                  <p className="mt-1 font-bold text-secondary text-sm">{bus.routeName || "Standard Route"}</p>
                </div>
              </div>

              {/* Driver & Phone */}
              <div className="grid grid-cols-2 gap-4 text-xs font-medium text-secondary border-t border-subtle pt-4">
                <div>
                  <p className="text-[10px] text-muted font-bold uppercase tracking-wider">Assigned Driver</p>
                  <p className="mt-1 font-bold text-primary text-sm">{bus.driverName || "Driver Assigned"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted font-bold uppercase tracking-wider">Driver Contact</p>
                  {bus.driverPhone ? (
                    <a
                      href={`tel:${bus.driverPhone}`}
                      className="mt-1 font-bold text-cyan-400 hover:text-cyan-300 text-sm block hover:underline"
                    >
                      {bus.driverPhone} 📞
                    </a>
                  ) : (
                    <p className="mt-1 font-semibold text-muted text-sm">—</p>
                  )}
                </div>
              </div>

              {/* Bus Capacity */}
              <div className="border-t border-subtle pt-4 text-xs">
                <p className="text-[10px] text-muted font-bold uppercase tracking-wider">Seat Capacity</p>
                <p className="mt-1 font-semibold text-primary text-sm">
                  {bus.capacity || "40"} seats total
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-cyan-500/10 border border-cyan-500/20 p-4 text-xs">
              <p className="font-bold text-cyan-400">Toll-Free Helpline</p>
              <p className="text-secondary mt-1">
                For urgent route queries, call operational desk at +1 (800) 555-0199.
              </p>
            </div>
          </div>

          {/* Map/Timeline Panel (2/3 col) */}
          <div className="lg:col-span-2 rounded-3xl border border-theme bg-surface p-6 sm:p-8 shadow-md space-y-8 flex flex-col justify-between">
            {/* Live Status Subtitle */}
            <div className="flex justify-between items-center pb-3 border-b border-subtle">
              <h3 className="text-sm font-bold text-primary">Route Progress Timeline</h3>
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ACTIVE COMMUTE
              </span>
            </div>

            {/* Dynamic Journey Timeline & Visualization */}
            <div className="relative pl-6 border-l-2 border-theme my-4 flex-1 space-y-8">
              {STOPS_LIST.map((stop, idx) => {
                const isPassed = idx < currentStopIndex;
                const isCurrent = idx === currentStopIndex;
                const isFuture = idx > currentStopIndex;

                let dotColor = "bg-hover border-theme text-muted";
                let fontCls = "text-secondary font-medium";

                if (isPassed) {
                  dotColor = "bg-cyan-500 text-white border-cyan-500 shadow-md shadow-cyan-500/20";
                  fontCls = "text-muted font-normal line-through decoration-muted/55";
                } else if (isCurrent) {
                  dotColor = "bg-cyan-400 border-cyan-400 text-slate-950 ring-4 ring-cyan-500/20 shadow-lg shadow-cyan-500/30";
                  fontCls = "text-primary font-black text-sm";
                }

                return (
                  <div key={stop} className="relative group">
                    {/* Timeline Node Icon */}
                    <span
                      className={`absolute -left-[35px] top-0 flex h-6.5 w-6.5 items-center justify-center rounded-full border text-[10px] font-black transition duration-200 ${dotColor}`}
                    >
                      {isPassed ? "✓" : idx + 1}
                    </span>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <p className={fontCls}>{stop}</p>
                        {isCurrent && (
                          <p className="text-[10px] text-cyan-400 font-bold mt-0.5 animate-pulse">
                            ● Approaching Next / Current Stop
                          </p>
                        )}
                      </div>

                      {isCurrent && (
                        <span className="rounded-xl bg-cyan-500/10 border border-cyan-500/20 px-3 py-1.5 text-xs font-bold text-cyan-400 self-start sm:self-auto">
                          ETA: {etaMinutes} mins
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Custom SVG Route Visualization Map */}
            <div className="border-t border-subtle pt-6">
              <h4 className="text-[10px] uppercase font-bold text-muted tracking-wider mb-4">
                Route Track Map
              </h4>
              <div className="h-16 w-full rounded-2xl bg-base border border-theme relative flex items-center justify-between px-8 overflow-hidden">
                {/* Horizontal Route Line */}
                <div className="absolute left-8 right-8 h-1 bg-hover z-0" />
                <div
                  className="absolute left-8 h-1 bg-cyan-500 z-0 transition-all duration-1000"
                  style={{
                    width: `${(currentStopIndex / (STOPS_LIST.length - 1)) * 80}%`,
                  }}
                />

                {/* Dots along map */}
                {STOPS_LIST.map((_, idx) => {
                  const passed = idx <= currentStopIndex;
                  const current = idx === currentStopIndex;
                  return (
                    <div
                      key={idx}
                      className={`h-3 w-3 rounded-full border-2 z-10 transition duration-300 ${
                        current
                          ? "bg-cyan-400 border-cyan-400 ring-4 ring-cyan-500/25"
                          : passed
                          ? "bg-cyan-500 border-cyan-500"
                          : "bg-surface border-theme"
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
