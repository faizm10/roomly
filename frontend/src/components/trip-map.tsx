"use client";

import { LocateFixed, Minus, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { CityLocation } from "@/lib/cities";
import type { Place } from "@/lib/types";

const FALLBACK_CENTER: [number, number] = [-9.1393, 38.7139];

type TripMapProps = {
  destination: string;
  places: Place[];
  selectedId: string;
  routeActive: boolean;
  mapToken?: string;
  onSelect: (id: string) => void;
};

async function lookupCityLocation(query: string, signal?: AbortSignal): Promise<CityLocation | null> {
  const response = await fetch(`/api/cities/geocode?q=${encodeURIComponent(query)}`, { signal });
  if (!response.ok) return null;
  const body = (await response.json()) as { coordinates?: [number, number] | null; bbox?: CityLocation["bbox"] };
  if (!body.coordinates) return null;
  return { coordinates: body.coordinates, bbox: body.bbox };
}

function showCity(map: import("mapbox-gl").Map, location: CityLocation, animate: boolean) {
  if (location.bbox) {
    map.fitBounds(
      [
        [location.bbox[0], location.bbox[1]],
        [location.bbox[2], location.bbox[3]],
      ],
      { padding: 56, maxZoom: 13, duration: animate ? 1400 : 0 },
    );
    return;
  }
  if (animate) {
    map.flyTo({ center: location.coordinates, zoom: 12, essential: true, duration: 1400 });
    return;
  }
  map.jumpTo({ center: location.coordinates, zoom: 12 });
}

export function TripMap({ destination, places, selectedId, routeActive, mapToken, onSelect }: TripMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("mapbox-gl").Map | null>(null);
  const mapboxRef = useRef<typeof import("mapbox-gl").default | null>(null);
  const markersRef = useRef<Map<string, import("mapbox-gl").Marker>>(new Map());
  const shownDestinationRef = useRef("");
  const initialDestinationRef = useRef(destination);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!mapToken || !containerRef.current) return;
    let active = true;
    const markerMap = markersRef.current;
    const openingDestination = initialDestinationRef.current;

    async function mountMap() {
      const mapboxPackage = await import("mapbox-gl");
      const location = await lookupCityLocation(openingDestination).catch(() => null);
      if (!active || !containerRef.current) return;
      const mapboxgl = mapboxPackage.default;
      mapboxRef.current = mapboxgl;
      mapboxgl.accessToken = mapToken;
      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/light-v11",
        center: location?.coordinates ?? FALLBACK_CENTER,
        zoom: 12,
        attributionControl: false,
      });
      mapRef.current = map;
      map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");
      map.on("load", () => {
        if (location) {
          showCity(map, location, false);
          shownDestinationRef.current = openingDestination;
        }
        setMapReady(true);
      });
    }

    mountMap();
    return () => {
      active = false;
      markerMap.forEach((marker) => marker.remove());
      markerMap.clear();
      mapRef.current?.remove();
      mapRef.current = null;
      mapboxRef.current = null;
      shownDestinationRef.current = "";
    };
  }, [mapToken]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || !destination.trim()) return;
    if (shownDestinationRef.current === destination) return;
    const controller = new AbortController();
    lookupCityLocation(destination, controller.signal)
      .then((location) => {
        if (!location || !mapRef.current) return;
        showCity(mapRef.current, location, true);
        shownDestinationRef.current = destination;
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [destination, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    const mapboxgl = mapboxRef.current;
    if (!mapReady || !map || !mapboxgl) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();
    for (const [index, place] of places.entries()) {
      const element = document.createElement("button");
      element.className = `mapbox-place-pin${place.id === selectedId ? " selected" : ""}`;
      element.type = "button";
      element.ariaLabel = `Select ${place.name}`;
      element.textContent = String(index + 1).padStart(2, "0");
      element.addEventListener("click", () => onSelect(place.id));
      const marker = new mapboxgl.Marker({ element, anchor: "bottom" }).setLngLat(place.coordinates).addTo(map);
      markersRef.current.set(place.id, marker);
    }

    const source = map.getSource("trip-route") as import("mapbox-gl").GeoJSONSource | undefined;
    const data = {
      type: "Feature" as const,
      properties: {},
      geometry: { type: "LineString" as const, coordinates: places.map((place) => place.coordinates) },
    };
    if (routeActive && places.length >= 2) {
      if (source) source.setData(data);
      else {
        map.addSource("trip-route", { type: "geojson", data });
        map.addLayer({ id: "trip-route-line", type: "line", source: "trip-route", paint: { "line-color": "#111111", "line-width": 4, "line-dasharray": [0.8, 1.6] } });
      }
    } else if (source) {
      if (map.getLayer("trip-route-line")) map.removeLayer("trip-route-line");
      map.removeSource("trip-route");
    }
  }, [mapReady, onSelect, places, routeActive, selectedId]);

  function zoom(delta: number) {
    mapRef.current?.zoomTo(mapRef.current.getZoom() + delta);
  }

  if (mapToken) {
    return (
      <div className="real-map-wrap">
        <div className="real-map" ref={containerRef} />
        <div className="map-controls"><button type="button" onClick={() => zoom(1)} aria-label="Zoom in"><Plus size={17} /></button><button type="button" onClick={() => zoom(-1)} aria-label="Zoom out"><Minus size={17} /></button></div>
      </div>
    );
  }

  const positions = [
    { left: "63%", top: "60%" },
    { left: "35%", top: "24%" },
    { left: "44%", top: "50%" },
    { left: "78%", top: "36%" },
    { left: "26%", top: "76%" },
    { left: "70%", top: "18%" },
  ];

  return (
    <div className="demo-map" aria-label="Interactive demo map of saved places">
      <div className="demo-map-grid" />
      <div className="demo-map-water"><span>RIO TEJO</span></div>
      <div className="demo-road road-a"><span>AV. DA LIBERDADE</span></div>
      <div className="demo-road road-b" />
      <div className="demo-road road-c" />
      <div className="demo-park park-a">JARDIM<br />DA ESTRELA</div>
      <div className="demo-park park-b">GRAÇA</div>
      {routeActive && (
        <svg className="workspace-route" viewBox="0 0 1000 700" preserveAspectRatio="none" aria-hidden="true">
          <path d="M630 420 C 510 340, 270 235, 350 168 S 460 335, 440 350 S 650 175, 780 252 S 445 620, 260 532" />
        </svg>
      )}
      {places.map((place, index) => (
        <button
          className={`workspace-pin${selectedId === place.id ? " selected" : ""}`}
          style={positions[index % positions.length]}
          key={place.id}
          onClick={() => onSelect(place.id)}
          aria-label={`Select ${place.name}`}
          type="button"
        >
          <span>{String(index + 1).padStart(2, "0")}</span>
          {selectedId === place.id && <small>{place.name}</small>}
        </button>
      ))}
      <div className="map-demo-label">Map preview · {destination || "Add a Mapbox key for live tiles"}</div>
      <div className="map-controls"><button type="button" aria-label="Zoom in"><Plus size={17} /></button><button type="button" aria-label="Zoom out"><Minus size={17} /></button><button type="button" aria-label="Find me"><LocateFixed size={17} /></button></div>
    </div>
  );
}
