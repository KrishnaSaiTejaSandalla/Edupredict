import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import ReactDOM from 'react-dom';
import { ThemeContext } from '@/lib/theme-context';

// Create context to share Leaflet instance and map object
const MapContext = createContext<any>(null);

// Inject transparent marker style once on load
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = `
    .custom-leaflet-marker {
      background: none !important;
      border: none !important;
      box-shadow: none !important;
    }
  `;
  document.head.appendChild(style);
}

// Load Leaflet dynamically on Web
const isLeafletLoaded = () => typeof window !== 'undefined' && (window as any).L;

const loadLeaflet = (): Promise<any> => {
  if (isLeafletLoaded()) return Promise.resolve((window as any).L);

  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => resolve((window as any).L);
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

export const Marker = ({ coordinate, children }: any) => {
  const context = useContext(MapContext);
  const [container] = useState(() => {
    if (typeof document !== 'undefined') {
      const div = document.createElement('div');
      div.style.position = 'absolute';
      return div;
    }
    return null;
  });
  const markerRef = useRef<any>(null);

  useEffect(() => {
    if (!context || !container || !coordinate) return;
    const { map, L } = context;

    const icon = L.divIcon({
      html: container,
      className: 'custom-leaflet-marker',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    const marker = L.marker([coordinate.latitude, coordinate.longitude], { icon }).addTo(map);
    markerRef.current = marker;

    return () => {
      marker.remove();
    };
  }, [context]);

  useEffect(() => {
    if (markerRef.current && coordinate) {
      markerRef.current.setLatLng([coordinate.latitude, coordinate.longitude]);
    }
  }, [coordinate?.latitude, coordinate?.longitude]);

  if (!container) return null;
  return ReactDOM.createPortal(children, container);
};

export const Polyline = ({ coordinates, strokeColor, strokeWidth }: any) => {
  const context = useContext(MapContext);
  const polylineRef = useRef<any>(null);

  useEffect(() => {
    if (!context || !coordinates || coordinates.length === 0) return;
    const { map, L } = context;

    const latlngs = coordinates.map((c: any) => [c.latitude, c.longitude]);
    const polyline = L.polyline(latlngs, {
      color: strokeColor || '#3E6BFF',
      weight: strokeWidth || 5,
    }).addTo(map);
    polylineRef.current = polyline;

    return () => {
      polyline.remove();
    };
  }, [context]);

  useEffect(() => {
    if (polylineRef.current && coordinates) {
      const latlngs = coordinates.map((c: any) => [c.latitude, c.longitude]);
      polylineRef.current.setLatLngs(latlngs);
    }
  }, [coordinates]);

  return null;
};

// Tile URL constants
const LIGHT_TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const DARK_TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

export default function MapView({ children, style, initialRegion, userInterfaceStyle, isDark: explicitDark }: any) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapState, setMapState] = useState<any>(null);
  const tileLayerRef = useRef<any>(null);
  const themeCtx = useContext(ThemeContext);

  const isDark = explicitDark ?? (userInterfaceStyle ? userInterfaceStyle === 'dark' : (themeCtx?.isDark ?? false));

  useEffect(() => {
    let active = true;
    loadLeaflet()
      .then((L) => {
        if (!active || !mapRef.current) return;

        const lat = initialRegion?.latitude || 18.5204;
        const lng = initialRegion?.longitude || 73.8567;
        const zoom = 15;

        const map = L.map(mapRef.current, {
          zoomControl: false,
          attributionControl: false,
        }).setView([lat, lng], zoom);

        const tileUrl = isDark ? DARK_TILE_URL : LIGHT_TILE_URL;

        const tileLayer = L.tileLayer(tileUrl, {
          maxZoom: 19,
        }).addTo(map);
        tileLayerRef.current = tileLayer;

        setMapState({ map, L });
      })
      .catch((err) => {
        console.error('Failed to load Leaflet:', err);
      });

    return () => {
      active = false;
    };
  }, []);

  // Dynamically switch tile layer when theme changes
  useEffect(() => {
    if (mapState && tileLayerRef.current) {
      const newUrl = isDark ? DARK_TILE_URL : LIGHT_TILE_URL;
      tileLayerRef.current.setUrl(newUrl);
    }
  }, [isDark, mapState]);

  // Sync view to initialRegion/center updates
  useEffect(() => {
    if (mapState && initialRegion) {
      mapState.map.setView([initialRegion.latitude, initialRegion.longitude]);
    }
  }, [initialRegion?.latitude, initialRegion?.longitude, mapState]);

  return (
    <View style={[StyleSheet.absoluteFill, style]}>
      <div ref={mapRef} style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }} />
      {mapState && (
        <MapContext.Provider value={mapState}>
          {children}
        </MapContext.Provider>
      )}
    </View>
  );
}
