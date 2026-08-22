"use client";

import { useEffect, useRef, useState } from "react";
import type { BusTrackingSnapshot } from "@/lib/bus-tracking.service";

type LiveStop = {
  id: number;
  stopName: string;
  latitude: number | null;
  longitude: number | null;
  sequenceNumber: number;
  studentCount?: number;
};

type Props = {
  driverLat?: number | null;
  driverLng?: number | null;
  stops?: LiveStop[];
  currentStopName?: string | null;
  height?: string;
  zoom?: number;
  buses?: BusTrackingSnapshot[];
  selectedBusId?: number | null;
  onSelectBus?: (busId: number) => void;
};

export default function LiveLeafletMap({
  driverLat = null,
  driverLng = null,
  stops = [],
  currentStopName = null,
  height = "420px",
  zoom = 14,
  buses = [],
  selectedBusId = null,
  onSelectBus,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<{ [key: string]: any }>({});
  const polylineRef = useRef<any>(null);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Detect system/parent dark mode
  useEffect(() => {
    if (typeof window !== "undefined") {
      const checkDark = () => {
        setIsDarkMode(document.documentElement.classList.contains("dark"));
      };
      checkDark();
      const observer = new MutationObserver(checkDark);
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
      return () => observer.disconnect();
    }
  }, []);

  // Dynamically load Leaflet
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    // Add custom premium styles to head
    if (!document.getElementById("leaflet-custom-styles")) {
      const style = document.createElement("style");
      style.id = "leaflet-custom-styles";
      style.innerHTML = `
        /* Sleek leaflet styling */
        .leaflet-container {
          font-family: inherit;
          background: #090d16 !important;
        }
        .leaflet-bar {
          border: 1px solid rgba(255,255,255,0.08) !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2) !important;
          border-radius: 12px !important;
          overflow: hidden;
        }
        .leaflet-bar a {
          background-color: rgba(15, 23, 42, 0.9) !important;
          color: #94a3b8 !important;
          border-bottom: 1px solid rgba(255,255,255,0.06) !important;
          transition: all 0.2s ease;
        }
        .leaflet-bar a:hover {
          background-color: rgba(30, 41, 59, 0.9) !important;
          color: #38bdf8 !important;
        }
        .leaflet-control-attribution {
          background: rgba(15, 23, 42, 0.6) !important;
          color: #64748b !important;
          font-size: 9px !important;
        }
        
        /* Animated Bus Marker */
        .animated-bus-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        .bus-pulse-ring {
          position: absolute;
          width: 46px;
          height: 46px;
          border-radius: 50%;
          background: rgba(6, 182, 212, 0.25);
          animation: map-ripple 2s infinite ease-out;
        }
        .bus-core {
          width: 28px;
          height: 28px;
          background: linear-gradient(135deg, #06b6d4, #0891b2);
          border: 2px solid #ffffff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 10px rgba(6, 182, 212, 0.4);
          z-index: 2;
          color: white;
          transition: transform 0.3s ease;
        }
        .bus-core:hover {
          transform: scale(1.1);
        }
        
        /* Stop Markers */
        .stop-marker-completed {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #10b981;
          border: 2.5px solid #ffffff;
          box-shadow: 0 2px 6px rgba(16, 185, 129, 0.4);
          transition: all 0.3s ease;
        }
        .stop-marker-current {
          width: 20px;
          height: 20px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .stop-current-pulse {
          position: absolute;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: rgba(59, 130, 246, 0.3);
          animation: map-ripple 1.5s infinite ease-out;
        }
        .stop-current-core {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #3b82f6;
          border: 2.5px solid #ffffff;
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.6);
          z-index: 2;
        }
        .stop-marker-upcoming {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #64748b;
          border: 2px solid #ffffff;
          box-shadow: 0 1px 4px rgba(0,0,0,0.15);
        }
        
        @keyframes map-ripple {
          0% { transform: scale(0.6); opacity: 1; }
          100% { transform: scale(2.2); opacity: 0; }
        }

        /* Dark mode overrides */
        .dark-theme .leaflet-bar a {
          background-color: #0f172a !important;
        }
        .light-theme .leaflet-container {
          background: #f8fafc !important;
        }
        .light-theme .leaflet-bar a {
          background-color: #ffffff !important;
          color: #475569 !important;
        }
        .light-theme .leaflet-control-attribution {
          background: rgba(255, 255, 255, 0.75) !important;
          color: #94a3b8 !important;
        }
      `;
      document.head.appendChild(style);
    }

    if (typeof window !== "undefined") {
      try {
        const L = require("leaflet");
        (window as any).L = L;
        setLeafletLoaded(true);
      } catch (err) {
        console.error("Failed to load leaflet module:", err);
      }
    }
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!leafletLoaded || !containerRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    // Destroy existing instance if any
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Determine initial center
    let centerLat = 18.5204; // Default Pune coordinates
    let centerLng = 73.8567;

    if (driverLat && driverLng) {
      centerLat = driverLat;
      centerLng = driverLng;
    } else if (buses.length > 0) {
      const active = buses.find(b => b.busId === selectedBusId) || buses[0];
      if (active && active.latitude !== null && active.longitude !== null) {
        centerLat = active.latitude;
        centerLng = active.longitude;
      }
    } else if (stops.length > 0) {
      const firstStop = stops[0];
      if (firstStop.latitude && firstStop.longitude) {
        centerLat = firstStop.latitude;
        centerLng = firstStop.longitude;
      }
    }

    const map = L.map(containerRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
    }).setView([centerLat, centerLng], zoom);

    mapInstanceRef.current = map;
    markersRef.current = {};

    setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 150);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [leafletLoaded]);

  // Resize Observer for map container to trigger invalidateSize automatically
  useEffect(() => {
    if (!leafletLoaded || !containerRef.current) return;
    const map = mapInstanceRef.current;
    if (!map) return;

    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => {
      resizeObserver.disconnect();
    };
  }, [leafletLoaded]);

  // Update Tiles & Theme Class
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const L = (window as any).L;
    if (!L) return;

    // Remove existing tile layers
    map.eachLayer((layer: any) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    // Premium styling CartoDB basemaps
    const tileUrl = isDarkMode
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

    L.tileLayer(tileUrl, {
      attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 20,
    }).addTo(map);

    // Apply class to container
    const mapContainer = containerRef.current;
    if (mapContainer) {
      mapContainer.className = `w-full h-full ${isDarkMode ? "dark-theme" : "light-theme"}`;
    }
  }, [isDarkMode, leafletLoaded]);

  // Keep track of centering state
  const hasCenteredRef = useRef(false);

  // Reset centering ref when selection changes so we re-center/fit bounds for the new target
  useEffect(() => {
    hasCenteredRef.current = false;
  }, [selectedBusId, stops.length]);

  // Render & Update Markers and Polylines
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !leafletLoaded) return;

    const L = (window as any).L;
    if (!L) return;

    const boundsPoints: any[] = [];

    // --- CASE A: SINGLE ACTIVE BUS (Parent Track View or Single Driver View) ---
    if (buses.length === 0) {
      // Draw/update Stops
      stops.forEach((stop) => {
        if (stop.latitude === null || stop.longitude === null) return;
        const pos: [number, number] = [stop.latitude, stop.longitude];
        boundsPoints.push(pos);

        const isCurrent = stop.stopName === currentStopName;
        let isCompleted = false;
        if (currentStopName) {
          const currentStopObj = stops.find(s => s.stopName === currentStopName);
          if (currentStopObj) {
            isCompleted = stop.sequenceNumber < currentStopObj.sequenceNumber;
          }
        }

        const className = isCurrent
          ? "stop-marker-current"
          : isCompleted
          ? "stop-marker-completed"
          : "stop-marker-upcoming";

        const html = isCurrent
          ? `<div class="stop-current-pulse"></div><div class="stop-current-core"></div>`
          : `<div class="${className}"></div>`;

        const stopIcon = L.divIcon({
          html: html,
          className: "custom-stop-div-icon",
          iconSize: isCurrent ? [28, 28] : [14, 14],
          iconAnchor: isCurrent ? [14, 14] : [7, 7],
        });

        const markerKey = `stop-${stop.id}`;
        let marker = markersRef.current[markerKey];
        if (marker) {
          marker.setLatLng(pos);
          marker.setIcon(stopIcon);
        } else {
          marker = L.marker(pos, { icon: stopIcon })
            .addTo(map)
            .bindPopup(`<b>${stop.stopName}</b><br/>Stop #${stop.sequenceNumber}`);
          markersRef.current[markerKey] = marker;
        }
      });

      // Cleanup stops that are no longer present
      const stopIds = new Set(stops.map(s => `stop-${s.id}`));
      Object.keys(markersRef.current).forEach((key) => {
        if (key.startsWith("stop-") && !stopIds.has(key)) {
          map.removeLayer(markersRef.current[key]);
          delete markersRef.current[key];
        }
      });

      // Polylines (Route Segment)
      const validStops = stops
        .filter(s => s.latitude !== null && s.longitude !== null)
        .sort((a, b) => a.sequenceNumber - b.sequenceNumber);

      if (validStops.length > 1) {
        const pathCoordinates = validStops.map(s => [s.latitude!, s.longitude!] as [number, number]);
        if (!polylineRef.current) {
          polylineRef.current = L.polyline(pathCoordinates, {
            color: isDarkMode ? "#06b6d4" : "#0284c7",
            weight: 4,
            opacity: 0.6,
            dashArray: "6, 8",
          }).addTo(map);
        } else {
          polylineRef.current.setLatLngs(pathCoordinates);
          polylineRef.current.setStyle({
            color: isDarkMode ? "#06b6d4" : "#0284c7"
          });
        }
      } else {
        if (polylineRef.current) {
          map.removeLayer(polylineRef.current);
          polylineRef.current = null;
        }
      }

      // Draw or update Driver
      if (driverLat !== null && driverLng !== null) {
        const driverPos: [number, number] = [driverLat, driverLng];
        boundsPoints.push(driverPos);

        const busHtml = `
          <div class="bus-pulse-ring"></div>
          <div class="bus-core">
            <svg viewBox="0 0 24 24" style="width: 16px; height: 16px;" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M4 16v-5a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v5" />
              <path d="M6 16h12" />
              <path d="M7 16v2" />
              <path d="M17 16v2" />
            </svg>
          </div>
        `;

        const busIcon = L.divIcon({
          html: busHtml,
          className: "animated-bus-icon",
          iconSize: [46, 46],
          iconAnchor: [23, 23],
        });

        const markerKey = "driver-bus";
        let driverMarker = markersRef.current[markerKey];
        if (driverMarker) {
          driverMarker.setLatLng(driverPos);
          if (hasCenteredRef.current) {
            map.panTo(driverPos);
          }
        } else {
          driverMarker = L.marker(driverPos, { icon: busIcon })
            .addTo(map)
            .bindPopup("<b>Live School Bus</b>");
          markersRef.current[markerKey] = driverMarker;
        }
      } else {
        if (markersRef.current["driver-bus"]) {
          map.removeLayer(markersRef.current["driver-bus"]);
          delete markersRef.current["driver-bus"];
        }
      }

      // Cleanup any admin bus markers if we switched mode
      Object.keys(markersRef.current).forEach((key) => {
        if (key.startsWith("bus-")) {
          map.removeLayer(markersRef.current[key]);
          delete markersRef.current[key];
        }
      });
    } 
    // --- CASE B: MULTIPLE BUSES (Admin Dashboard View) ---
    else {
      // Cleanup case A layers
      Object.keys(markersRef.current).forEach((key) => {
        if (key.startsWith("stop-") || key === "driver-bus") {
          map.removeLayer(markersRef.current[key]);
          delete markersRef.current[key];
        }
      });
      if (polylineRef.current) {
        map.removeLayer(polylineRef.current);
        polylineRef.current = null;
      }

      const activeBusKeys = new Set<string>();

      buses.forEach((bus, index) => {
        if (bus.latitude === null || bus.longitude === null) return;
        const pos: [number, number] = [bus.latitude, bus.longitude];
        boundsPoints.push(pos);

        const isSelected = bus.busId === selectedBusId;
        const markerKey = `bus-${bus.busId}`;
        activeBusKeys.add(markerKey);

        const statusColors = {
          waiting_at_school: "#3b82f6",
          trip_started: "#10b981",
          arriving: "#f59e0b",
          reached_stop: "#8b5cf6",
          trip_completed: "#64748b",
          offline: "#ef4444",
        };
        const color = statusColors[bus.status as keyof typeof statusColors] || "#06b6d4";

        const busHtml = `
          ${isSelected ? `<div class="bus-pulse-ring" style="background: rgba(${isSelected ? '6, 182, 212, 0.3' : '100, 116, 139, 0.2'})"></div>` : ""}
          <div class="bus-core" style="background: ${color}; transform: scale(${isSelected ? 1.15 : 0.95}); box-shadow: 0 4px 10px ${color}50; border-color: ${isSelected ? '#fff' : 'rgba(255,255,255,0.7)'}">
            <svg viewBox="0 0 24 24" style="width: 14px; height: 14px;" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M4 16v-5a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v5" />
              <path d="M6 16h12" />
              <path d="M7 16v2" />
              <path d="M17 16v2" />
            </svg>
          </div>
        `;

        const busIcon = L.divIcon({
          html: busHtml,
          className: "animated-bus-icon",
          iconSize: [46, 46],
          iconAnchor: [23, 23],
        });

        const popupContent = `
          <div style="font-size:11px; padding:2px;">
            <b style="font-size:13px; color:${isDarkMode ? '#fff' : '#0f172a'}">${bus.registrationNumber}</b><br/>
            <span style="color:#64748b; font-weight:bold;">Driver: ${bus.driverName || 'N/A'}</span><br/>
            <span style="color:${color}; font-weight:bold; text-transform:uppercase; font-size:9px;">${bus.status.replace('_', ' ')}</span>
          </div>
        `;

        let marker = markersRef.current[markerKey];
        if (marker) {
          marker.setLatLng(pos);
          marker.setIcon(busIcon);
          marker.setPopupContent(popupContent);
          if (isSelected && hasCenteredRef.current) {
            map.panTo(pos);
          }
        } else {
          marker = L.marker(pos, { icon: busIcon })
            .addTo(map)
            .bindPopup(popupContent);
          
          marker.on("click", () => {
            if (onSelectBus) {
              onSelectBus(bus.busId);
            }
          });
          markersRef.current[markerKey] = marker;
          if (isSelected && hasCenteredRef.current) {
            map.panTo(pos);
          }
        }
      });

      // Cleanup stale bus markers
      Object.keys(markersRef.current).forEach((key) => {
        if (key.startsWith("bus-") && !activeBusKeys.has(key)) {
          map.removeLayer(markersRef.current[key]);
          delete markersRef.current[key];
        }
      });
    }

    // Only set map bounds/view ONCE on initial rendering or on target transition,
    // rather than on every tick of coordinate updates!
    if (boundsPoints.length > 0 && !hasCenteredRef.current) {
      hasCenteredRef.current = true;
      map.fitBounds(boundsPoints, {
        padding: [40, 40],
        maxZoom: 16,
      });
    }
  }, [driverLat, driverLng, stops, currentStopName, buses, selectedBusId, leafletLoaded, isDarkMode]);

  return (
    <div className="relative w-full h-full min-h-[300px] overflow-hidden rounded-3xl" style={{ height }}>
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
