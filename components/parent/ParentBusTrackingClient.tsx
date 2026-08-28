"use client";

import LiveLeafletMap from "@/components/shared/LiveLeafletMap";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BusFront, Phone, Clock, Compass, Navigation, User, CheckCircle2, ChevronRight } from "lucide-react";
import type { BusTrackingSnapshot } from "@/lib/bus-tracking.service";

type ParentTrackingSnapshot = {
  student: {
    id: number;
    name: string | null;
    pickupStopId?: number | null;
    dropStopId?: number | null;
  } | null;
  bus: BusTrackingSnapshot | null;
  allowedBusIds: number[];
};

type Child = {
  studentId: number;
  rollNumber: string | null;
  name: string;
  displayClass: string;
};

type Props = {
  initialSnapshot: ParentTrackingSnapshot;
  childrenList?: Child[];
};

function formatStatus(status: BusTrackingSnapshot["status"]) {
  switch (status) {
    case "waiting_at_school":
      return "Waiting at School";
    case "trip_started":
      return "Trip Started";
    case "arriving":
      return "Arriving";
    case "reached_stop":
      return "Reached Stop";
    case "trip_completed":
      return "Trip Completed";
    default:
      return "Offline";
  }
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

function estimateEta(bus: BusTrackingSnapshot | null) {
  if (!bus || bus.latitude === null || bus.longitude === null || bus.speed === null || bus.remainingStops === null) {
    return "Calculating...";
  }

  const kmh = bus.speed > 45 ? bus.speed : bus.speed * 3.6;
  if (kmh <= 3) return "Calculating...";
  const roughRemainingKm = Math.max(1, bus.remainingStops) * 1.4;
  const minutes = Math.max(1, Math.round((roughRemainingKm / kmh) * 60));
  return `${minutes} min`;
}

function getBoardingState(
  bus: BusTrackingSnapshot | null,
  student: ParentTrackingSnapshot["student"]
) {
  if (!bus || !student) return "No data";
  if (bus.status === "offline") return "Trip inactive";
  if (bus.status === "waiting_at_school") return "Waiting at school";

  const pickupStop = bus.stops.find((s) => s.id === student.pickupStopId);
  const dropStop = bus.stops.find((s) => s.id === student.dropStopId);

  if (!pickupStop) return "Bus on Route";

  const currentStopObj = bus.stops.find((s) => s.stopName === bus.currentStop);
  const currentSeq = currentStopObj ? currentStopObj.sequenceNumber : 0;

  if (bus.status === "trip_completed") return "Dropped off / Completed";

  if (currentSeq === 0) {
    return "Bus on route";
  }

  if (currentSeq < pickupStop.sequenceNumber) {
    return "On route to pickup";
  }

  if (currentSeq === pickupStop.sequenceNumber) {
    return "Arrived at pickup stop";
  }

  if (dropStop && currentSeq >= dropStop.sequenceNumber) {
    return "Arrived at school";
  }

  return "Boarded & en route";
}

export default function ParentBusTrackingClient({ initialSnapshot, childrenList = [] }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [bus, setBus] = useState<BusTrackingSnapshot | null>(initialSnapshot.bus);
  const [isConnected, setIsConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const allowedBusIds = useMemo(
    () => new Set(initialSnapshot.allowedBusIds),
    [initialSnapshot.allowedBusIds],
  );

  useEffect(() => {
    const eventSource = new EventSource("/api/parent/bus-tracking/stream");

    eventSource.addEventListener("connected", () => {
      setIsConnected(true);
    });

    eventSource.addEventListener("bus-location", (event: MessageEvent) => {
      const nextBus = JSON.parse(event.data) as BusTrackingSnapshot;
      if (allowedBusIds.has(nextBus.busId)) {
        setBus(nextBus);
      }
    });

    eventSource.onerror = () => {
      setIsConnected(false);
    };

    return () => eventSource.close();
  }, [allowedBusIds]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const studentId = initialSnapshot.student?.id;
      const url = studentId ? `/api/parent/bus-tracking?studentId=${studentId}` : "/api/parent/bus-tracking";
      const res = await fetch(url);
      if (res.ok) {
        const nextSnapshot = await res.json();
        setBus(nextSnapshot.bus);
        toast.success("Location refreshed!");
      } else {
        toast.error("Failed to load tracking data.");
      }
    } catch (err) {
      toast.error("Error occurred while refreshing.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSelectChild = (studentId: number) => {
    startTransition(() => {
      router.push(`/parent/bus-tracking?studentId=${studentId}`);
    });
  };

  const activeChild = childrenList.find(c => c.studentId === initialSnapshot.student?.id) || childrenList[0];
  const displayClass = activeChild?.displayClass || "Class Not Set";

  const etaVal = estimateEta(bus);
  const isEtaAvailable = etaVal !== "Calculating...";

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 animate-in fade-in duration-300 pb-24">
      {/* Header Row */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between border-b border-theme pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-500 dark:text-cyan-400">
            Transport
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
            Live Bus Tracking
          </h1>
          <p className="mt-2 text-sm text-secondary">
            Realtime location for the bus assigned to your child.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {childrenList.length > 1 && (
            <select
              value={initialSnapshot.student?.id || ""}
              onChange={(e) => handleSelectChild(Number(e.target.value))}
              disabled={isPending}
              className="h-10 rounded-xl border border-theme bg-surface px-3 text-xs font-bold text-primary focus:border-cyan-500 outline-none cursor-pointer"
            >
              {childrenList.map((c) => (
                <option key={c.studentId} value={c.studentId}>
                  Child: {c.name} ({c.displayClass})
                </option>
              ))}
            </select>
          )}

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-theme bg-surface text-muted-foreground hover:text-cyan-400 hover:border-cyan-400/30 transition disabled:opacity-50"
            title="Refresh Location"
          >
            <svg
              viewBox="0 0 24 24"
              className={`h-4 w-4 ${isRefreshing ? "animate-spin text-cyan-400" : ""}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </button>
        </div>
      </div>

      {!bus ? (
        <div className="rounded-3xl border border-theme bg-surface p-12 text-center shadow-lg">
          <BusFront className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <h2 className="mt-4 text-xl font-bold text-primary">No Bus Assigned</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-secondary">
            This account does not have an active student transport assignment yet. Once the school assigns your child to a bus, live tracking will appear here.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
          {/* LEFT COLUMN: Large Interactive Map & GPS Telemetry */}
          <div className="space-y-6">
            <section className="overflow-hidden rounded-3xl border border-theme bg-surface shadow-lg relative">
              {/* Online/Offline Map Badge */}
              <div className="absolute right-4 top-4 z-[1000] flex items-center gap-2 rounded-full border border-theme/40 bg-surface/85 px-3.5 py-1.5 text-[10px] font-black text-primary backdrop-blur-md">
                <span className={`h-2.5 w-2.5 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
                {isConnected ? "LIVE RADAR CONNECTED" : "RECONNECTING GPS"}
              </div>

              <LiveLeafletMap
                driverLat={bus.latitude}
                driverLng={bus.longitude}
                stops={bus.stops}
                currentStopName={bus.currentStop}
                height="450px"
              />
            </section>

            {/* GPS Telemetry Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-theme bg-surface p-4 shadow-sm flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-500">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block">LAST UPDATE</span>
                  <span className="text-xs font-black text-primary block mt-0.5">{formatUpdated(bus.lastUpdatedAt)}</span>
                </div>
              </div>

              <div className="rounded-2xl border border-theme bg-surface p-4 shadow-sm flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                  <Compass className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block">SPEED</span>
                  <span className="text-xs font-black text-primary block mt-0.5">{formatSpeed(bus.speed)}</span>
                </div>
              </div>

              <div className="rounded-2xl border border-theme bg-surface p-4 shadow-sm flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <Navigation className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block">DISTANCE REMAINING</span>
                  <span className="text-xs font-black text-primary block mt-0.5">
                    {bus.remainingStops !== null ? `${(bus.remainingStops * 1.4).toFixed(1)} km` : "Calculating..."}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-theme bg-surface p-4 shadow-sm flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500">
                  <BusFront className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block">BUS REGISTRATION</span>
                  <span className="text-xs font-black text-primary block mt-0.5">
                    {bus.nickname ? `${bus.nickname} (${bus.registrationNumber})` : bus.registrationNumber}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: ETA, Boarding Status, Route Timeline, Driver Card */}
          <div className="space-y-6">
            {/* Live Hero Status Banner */}
            <div className="rounded-3xl border border-theme bg-gradient-to-r from-cyan-500/10 to-indigo-500/10 p-6 shadow-md relative overflow-hidden">
              <div className="absolute right-[-20px] bottom-[-20px] opacity-10">
                <BusFront className="h-32 w-32" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-400">ESTIMATED ARRIVAL</p>
              <div className="mt-2 flex items-baseline gap-2">
                <h2 className="text-4xl font-black text-primary tracking-tight">
                  {isEtaAvailable ? etaVal : "Calculating..."}
                </h2>
                {isEtaAvailable && <span className="text-xs text-secondary font-medium">remaining</span>}
              </div>
              <p className="text-xs font-semibold text-secondary mt-3">
                Current stop: <span className="text-primary font-black">{bus.currentStop || "Depot"}</span>
              </p>
            </div>

            {/* Child Status Card */}
            {initialSnapshot.student && (
              <div className="rounded-3xl border border-theme bg-surface p-5 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4">CHILD BOARDING STATUS</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-base">👦</div>
                    <div>
                      <h4 className="text-xs font-black text-primary">{initialSnapshot.student.name}</h4>
                      <p className="text-[9px] text-secondary mt-0.5">{displayClass} • Roll #{activeChild?.rollNumber || "N/A"}</p>
                    </div>
                  </div>
                  <span className="inline-flex rounded-full bg-cyan-500/10 px-3.5 py-1 text-[10px] font-black text-cyan-500 border border-cyan-500/25">
                    {getBoardingState(bus, initialSnapshot.student)}
                  </span>
                </div>
              </div>
            )}

            {/* Stop Sequence Progress Bar */}
            <div className="rounded-3xl border border-theme bg-surface p-6 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-6">ROUTE PROGRESS</p>
              <div className="relative pl-6 space-y-6 border-l border-border/40 ml-2">
                {bus.stops.length === 0 ? (
                  <p className="text-xs text-secondary">No route stops configured.</p>
                ) : (
                  bus.stops.map((stop) => {
                    const currentStopObj = bus.stops.find((s) => s.stopName === bus.currentStop);
                    const currentSeq = currentStopObj ? currentStopObj.sequenceNumber : 0;

                    const isCurrent = stop.stopName === bus.currentStop;
                    const isCompleted = stop.sequenceNumber < currentSeq;

                    const isPickup = stop.id === initialSnapshot.student?.pickupStopId;
                    const isDrop = stop.id === initialSnapshot.student?.dropStopId;

                    return (
                      <div key={stop.id} className="relative flex items-center justify-between">
                        <span
                          className={`absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full border-2 bg-background flex items-center justify-center ${isCompleted
                            ? "border-emerald-500 bg-emerald-500 text-white"
                            : isCurrent
                              ? "border-cyan-400 bg-cyan-400/20 animate-pulse ring-4 ring-cyan-400/10"
                              : "border-muted-foreground/30 bg-muted/20"
                            }`}
                        >
                          {isCompleted && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                        </span>

                        <div>
                          <p className={`text-xs font-bold ${isCurrent ? "text-cyan-500 dark:text-cyan-400" : "text-primary"}`}>
                            {stop.stopName}
                          </p>
                          <p className="text-[9px] text-secondary mt-0.5">
                            Stop {stop.sequenceNumber} • {isCompleted ? 'Completed' : isCurrent ? 'Current Stop' : 'Upcoming'}
                          </p>
                        </div>

                        {(isPickup || isDrop) && (
                          <span
                            className={`text-[8px] font-black uppercase tracking-wider rounded-lg px-2.5 py-1 border ${isPickup
                              ? "bg-cyan-500/10 text-cyan-500 border-cyan-500/25"
                              : "bg-emerald-500/10 text-emerald-500 border-emerald-500/25"
                              }`}
                          >
                            {isPickup ? "Pickup Stop" : "Drop Stop"}
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Driver Contact & Info Card */}
            <div className="rounded-3xl border border-theme bg-surface p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-base">👨</div>
                  <div>
                    <h4 className="text-xs font-black text-primary">{bus.driverName || "Assigned Driver"}</h4>
                    <p className="text-[9px] text-secondary mt-0.5">{bus.driverPhone || "+91-9876543210"}</p>
                  </div>
                </div>
                <a
                  href={`tel:${bus.driverPhone || "+919876543210"}`}
                  className="px-4 py-2 rounded-xl border border-border bg-card hover:bg-hover text-[10px] font-black text-cyan-500 flex items-center gap-1.5 transition"
                >
                  <Phone className="h-3 w-3" />
                  Call Driver
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
