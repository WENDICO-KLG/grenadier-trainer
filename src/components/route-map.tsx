"use client";

import "leaflet/dist/leaflet.css";
import type { Circle, CircleMarker, Map as LeafletMap, Polyline } from "leaflet";
import { LocateFixed } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { GpsPoint } from "@/lib/gps";

// Offizielle Landeskarte (grau) von swisstopo – Open Government Data, frei nutzbar mit Quellenangabe
const TILE_URL = "https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-grau/default/current/3857/{z}/{x}/{y}.jpeg";
const LIME = "#c8f04a";

/**
 * Karte mit der gelaufenen Strecke. Leaflet wird erst im Browser geladen.
 * Folgt automatisch der aktuellen Position, bis man die Karte selbst verschiebt.
 */
export function RouteMap({
  route,
  current,
  accuracy,
  className = "",
}: {
  route: GpsPoint[];
  current: GpsPoint | null;
  accuracy: number | null;
  className?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const line = useRef<Polyline | null>(null);
  const dot = useRef<CircleMarker | null>(null);
  const halo = useRef<Circle | null>(null);
  const [follow, setFollow] = useState(true);
  const followRef = useRef(true);
  const [ready, setReady] = useState(false);

  // Karte einmalig aufbauen
  useEffect(() => {
    let cancelled = false;
    let instance: LeafletMap | null = null;
    import("leaflet").then((L) => {
      if (cancelled || !container.current) return;
      instance = L.map(container.current, {
        zoomControl: false,
        attributionControl: true,
        center: [46.8, 8.2],
        zoom: 8,
      });
      L.tileLayer(TILE_URL, {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.swisstopo.admin.ch" target="_blank" rel="noopener">swisstopo</a>',
        className: "map-tiles-dark",
      }).addTo(instance);
      line.current = L.polyline([], { color: LIME, weight: 5, opacity: 0.95, lineCap: "round" }).addTo(instance);
      halo.current = L.circle([0, 0], { radius: 0, color: LIME, weight: 1, opacity: 0.4, fillOpacity: 0.1 }).addTo(instance);
      dot.current = L.circleMarker([0, 0], {
        radius: 8,
        color: "#0b0d0a",
        weight: 3,
        fillColor: LIME,
        fillOpacity: 1,
      }).addTo(instance);
      // Selbst verschieben → nicht mehr automatisch folgen
      instance.on("dragstart", () => {
        followRef.current = false;
        setFollow(false);
      });
      map.current = instance;
      setReady(true);
    });
    return () => {
      cancelled = true;
      instance?.remove();
      map.current = null;
    };
  }, []);

  // Strecke & Position aktualisieren
  useEffect(() => {
    const m = map.current;
    if (!ready || !m) return;
    line.current?.setLatLngs(route.map((p) => [p.lat, p.lng]));
    if (current) {
      dot.current?.setLatLng([current.lat, current.lng]);
      halo.current?.setLatLng([current.lat, current.lng]).setRadius(accuracy ?? 0);
      if (followRef.current) {
        m.setView([current.lat, current.lng], Math.max(m.getZoom(), 16), { animate: true });
      }
    }
  }, [ready, route, current, accuracy]);

  return (
    <div className={`relative overflow-hidden rounded-3xl bg-card ${className}`}>
      <div ref={container} className="absolute inset-0" />
      {!current && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted">
          GPS-Signal wird gesucht…
        </div>
      )}
      {!follow && current && (
        <button
          onClick={() => {
            followRef.current = true;
            setFollow(true);
            map.current?.setView([current.lat, current.lng], Math.max(map.current.getZoom(), 16));
          }}
          className="absolute bottom-3 right-3 z-[500] flex h-11 w-11 items-center justify-center rounded-full bg-bg/90 text-lime shadow-lg"
          aria-label="Auf Position zentrieren"
        >
          <LocateFixed size={20} />
        </button>
      )}
    </div>
  );
}
