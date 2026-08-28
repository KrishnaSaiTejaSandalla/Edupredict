"use client";

import { useEffect, useMemo, useState } from "react";
import type { BusTrackingSnapshot } from "@/lib/bus-tracking.service";
import LiveLeafletMap from "@/components/shared/LiveLeafletMap";
import { Clock, Compass, Navigation, User, ChevronRight, BusFront } from "lucide-react";

type Props = {
  initialBuses: BusTrackingSnapshot[];
};

const MARKER_COLORS = ["#06b6d4", "#22c55e", "#f59e0b", "#a855f7", "#ef4444", "#14b8a6"];

function formatStatus(status: BusTrackingSnapshot["status"]) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatSpeed(speed: number | null) {
  if (speed === null) return "0 km/h";
  const kmh = speed > 45 ? speed : speed * 3.6;
  return `${Math.max(0, Math.round(kmh))} km/h`;
}

function formatUpdated(value: string | null) {
  if (!value) return "Just now";
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

export default function AdminLiveBusMap({ initialBuses }: Props) {
  const [buses, setBuses] = useState(initialBuses);
  const [selectedBusId, setSelectedBusId] = useState<number | null>(initialBuses[0]?.busId ?? null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const eventSource = new EventSource("/api/admin/bus-tracking/stream");

    eventSource.addEventListener("connected", () => setConnected(true));
    eventSource.addEventListener("bus-location", (event: MessageEvent) => {
      const next = JSON.parse(event.data) as BusTrackingSnapshot;
      setBuses((current) => {
        const exists = current.some((bus) => bus.busId === next.busId);
        return exists
          ? current.map((bus) => (bus.busId === next.busId ? next : bus))
          : [next, ...current];
      });
      setSelectedBusId((current) => current ?? next.busId);
    });
    eventSource.onerror = () => setConnected(false);

    return () => eventSource.close();
  }, []);

  const selectedBus = useMemo(
    () => buses.find((bus) => bus.busId === selectedBusId) ?? buses[0] ?? null,
    [buses, selectedBusId],
  );

  return (
    <section className="space-y-4">
      {/* Title Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-500 dark:text-cyan-400">
            Live Fleet
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-primary">
            Real-Time Bus Tracking
          </h2>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-theme bg-surface px-4 py-2 text-xs font-bold text-primary">
          <span className={`h-2.5 w-2.5 rounded-full ${connected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
          {connected ? "Realtime Connected" : "Reconnecting GPS"}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        {/* LEFT COLUMN: Map Card with selection toggles overlay */}
        <div className="overflow-hidden rounded-3xl border border-theme bg-surface shadow-md relative">
          <LiveLeafletMap
            buses={buses}
            selectedBusId={selectedBusId}
            onSelectBus={(busId) => setSelectedBusId(busId)}
            height="450px"
          />

          {/* Quick Toggle Overlays */}
          {buses.length > 0 && (
            <div className="absolute left-4 top-4 z-[1000] flex flex-wrap gap-2 max-w-[80%]">
              {buses.slice(0, 8).map((bus, index) => (
                <button
                  key={bus.busId}
                  type="button"
                  onClick={() => setSelectedBusId(bus.busId)}
                  className={`rounded-full border px-3.5 py-1.5 text-[10px] font-black backdrop-blur-md transition flex items-center gap-1.5 ${
                    selectedBus?.busId === bus.busId
                      ? "border-cyan-500 bg-cyan-500/90 text-white"
                      : "border-white/10 bg-slate-950/70 text-slate-300 hover:bg-slate-900/80"
                  }`}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: MARKER_COLORS[index % MARKER_COLORS.length] }}
                  />
                  {bus.registrationNumber}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Active Bus Telemetry Detail Pane */}
        <div className="rounded-3xl border border-theme bg-surface p-6 shadow-sm flex flex-col justify-between">
          {selectedBus ? (
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4 border-b border-theme pb-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">SELECTED VEHICLE</p>
                  <h3 className="mt-1 text-2xl font-black text-primary tracking-tight">{selectedBus.registrationNumber}</h3>
                  <p className="text-xs font-semibold text-secondary mt-1">{selectedBus.routeName || "No route assigned"}</p>
                </div>
                <span className={`rounded-full border px-3.5 py-1 text-[10px] font-black uppercase ${
                  selectedBus.status === 'trip_completed'
                    ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-500"
                    : "border-cyan-500/25 bg-cyan-500/10 text-cyan-500"
                }`}>
                  {selectedBus.status === 'trip_completed' ? 'Trip Completed' : formatStatus(selectedBus.status)}
                </span>
              </div>

              {/* Grid of Micro KPI Details */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <DetailCard icon={<User className="h-4 w-4" />} label="Driver" value={selectedBus.driverName || "Not assigned"} />
                <DetailCard icon={<Compass className="h-4 w-4" />} label="Speed" value={selectedBus.status === 'trip_completed' ? "0 km/h" : formatSpeed(selectedBus.speed)} />
                <DetailCard icon={<Clock className="h-4 w-4" />} label="Last Updated" value={formatUpdated(selectedBus.lastUpdatedAt)} />
                <DetailCard icon={<BusFront className="h-4 w-4" />} label="Expected Students" value={String(selectedBus.stops.reduce((sum, stop) => sum + stop.studentCount, 0))} />
              </div>

              <div className="space-y-3 pt-2">
                <div className="rounded-2xl border border-theme bg-card/40 p-4 flex justify-between items-center text-xs">
                  <div>
                    <span className="text-[9px] font-bold text-muted-foreground uppercase">Current stop</span>
                    <p className="font-bold text-primary mt-0.5">{selectedBus.status === 'trip_completed' ? '—' : (selectedBus.currentStop || "Depot")}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  <div className="text-right">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase">Next stop</span>
                    <p className="font-bold text-primary mt-0.5">{selectedBus.status === 'trip_completed' ? '—' : (selectedBus.nextStop || "Finish")}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-theme bg-card/40 p-4 flex justify-between items-center text-xs">
                  <div>
                    <span className="text-[9px] font-bold text-muted-foreground uppercase">Remaining Stops</span>
                    <p className="font-bold text-primary mt-0.5">{selectedBus.status === 'trip_completed' ? '0' : (selectedBus.remainingStops === null ? "N/A" : String(selectedBus.remainingStops))}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-muted-foreground uppercase block text-right">Route Type</span>
                    <p className="font-black text-cyan-500 mt-0.5 text-right uppercase">Regular Route</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-theme p-12 text-center my-auto flex flex-col items-center justify-center">
              <BusFront className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <h3 className="text-sm font-bold text-primary">No Active Buses</h3>
              <p className="mt-2 text-xs text-secondary max-w-[240px] mx-auto">
                Active buses will appear here once drivers start trips and upload GPS.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function DetailCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-theme bg-card/40 p-3.5 flex items-center gap-3">
      <div className="h-8 w-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-500 shrink-0">
        {icon}
      </div>
      <div>
        <span className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground block">{label}</span>
        <span className="text-xs font-black text-primary block mt-0.5 truncate">{value}</span>
      </div>
    </div>
  );
}
