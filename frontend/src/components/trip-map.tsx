"use client";

import { LocateFixed, MapPin, Minus, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { CityLocation } from "@/lib/cities";
import { buildGoogleMapsPlaceUrl } from "@/lib/navigation";
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

function previewSubtitle(place: Place) {
  return place.neighborhood || place.address || "Saved place";
}

function createPreviewCard(place: Place) {
  const card = document.createElement("div");
  card.className = "map-preview-card";

  const copy = document.createElement("span");
  copy.className = "map-preview-copy";

  const title = document.createElement("strong");
  title.textContent = place.name;

  const addressRow = document.createElement("span");
  addressRow.className = "map-preview-address";

  const subtitle = document.createElement("small");
  subtitle.textContent = previewSubtitle(place);

  const mapsLink = document.createElement("a");
  mapsLink.href = buildGoogleMapsPlaceUrl(place);
  mapsLink.target = "_blank";
  mapsLink.rel = "noreferrer";
  mapsLink.ariaLabel = `Open ${place.name} in Google Maps`;
  mapsLink.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M20 10c0 4.8-5.4 10.3-7.4 12.2a.9.9 0 0 1-1.2 0C9.4 20.3 4 14.8 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.6"/></svg>';

  addressRow.append(subtitle, mapsLink);
  copy.append(title, addressRow);
  card.append(copy);
  return card;
}

function MapPlacePreview({ place }: { place: Place }) {
  return (
    <span className="map-preview-card">
      <span className="map-preview-copy">
        <strong>{place.name}</strong>
        <span className="map-preview-address">
          <small>{previewSubtitle(place)}</small>
          <a
            href={buildGoogleMapsPlaceUrl(place)}
            aria-label={`Open ${place.name} in Google Maps`}
            onClick={(event) => event.stopPropagation()}
            rel="noreferrer"
            target="_blank"
          >
            <MapPin size={14} />
          </a>
        </span>
      </span>
    </span>
  );
}

export function TripMap({ destination, places, selectedId, routeActive, mapToken, onSelect }: TripMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("mapbox-gl").Map | null>(null);
  const mapboxRef = useRef<typeof import("mapbox-gl").default | null>(null);
  const markersRef = useRef<Map<string, import("mapbox-gl").Marker>>(new Map());
  const popupsRef = useRef<Map<string, import("mapbox-gl").Popup>>(new Map());
  const shownDestinationRef = useRef("");
  const initialDestinationRef = useRef(destination);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!mapToken || !containerRef.current) return;
    let active = true;
    const markerMap = markersRef.current;
    const popupMap = popupsRef.current;
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
      popupMap.forEach((popup) => popup.remove());
      popupMap.clear();
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

    popupsRef.current.forEach((popup) => popup.remove());
    popupsRef.current.clear();
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();
    for (const [index, place] of places.entries()) {
      const wrapper = document.createElement("div");
      wrapper.className = "mapbox-marker-with-preview";
      const element = document.createElement("button");
      element.className = `mapbox-place-pin${place.id === selectedId ? " selected" : ""}`;
      element.type = "button";
      element.ariaLabel = `Select ${place.name}, ${place.category}, ${previewSubtitle(place)}`;
      element.textContent = String(index + 1).padStart(2, "0");
      element.addEventListener("click", () => onSelect(place.id));
      wrapper.append(element);
      const previewCard = createPreviewCard(place);
      const popup = new mapboxgl.Popup({
        className: "place-map-popup",
        closeButton: false,
        closeOnClick: false,
        focusAfterOpen: false,
        maxWidth: "260px",
        offset: 18,
      }).setDOMContent(previewCard);
      let closeTimer: number | null = null;
      const clearCloseTimer = () => {
        if (!closeTimer) return;
        window.clearTimeout(closeTimer);
        closeTimer = null;
      };
      const showPreview = () => {
        clearCloseTimer();
        wrapper.classList.add("preview-open");
        popup.setLngLat(place.coordinates).addTo(map);
      };
      const hidePreview = () => {
        clearCloseTimer();
        closeTimer = window.setTimeout(() => {
          wrapper.classList.remove("preview-open");
          popup.remove();
        }, 120);
      };
      element.addEventListener("mouseenter", showPreview);
      element.addEventListener("focus", showPreview);
      element.addEventListener("mouseleave", hidePreview);
      element.addEventListener("blur", hidePreview);
      previewCard.addEventListener("mouseenter", clearCloseTimer);
      previewCard.addEventListener("mouseleave", hidePreview);
      const marker = new mapboxgl.Marker({ element: wrapper, anchor: "bottom" }).setLngLat(place.coordinates).addTo(map);
      markersRef.current.set(place.id, marker);
      popupsRef.current.set(place.id, popup);
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
      {places.map((place, index) => {
        const number = String(index + 1).padStart(2, "0");
        return (
          <div
            className={`workspace-pin${selectedId === place.id ? " selected" : ""}`}
            style={positions[index % positions.length]}
            key={place.id}
          >
            <button
              className="workspace-pin-button"
              onClick={() => onSelect(place.id)}
              aria-label={`Select ${place.name}, ${place.category}, ${previewSubtitle(place)}`}
              type="button"
            >
              {number}
            </button>
            <MapPlacePreview place={place} />
          </div>
        );
      })}
      <div className="map-demo-label">Map preview · {destination || "Add a Mapbox key for live tiles"}</div>
      <div className="map-controls"><button type="button" aria-label="Zoom in"><Plus size={17} /></button><button type="button" aria-label="Zoom out"><Minus size={17} /></button><button type="button" aria-label="Find me"><LocateFixed size={17} /></button></div>
    </div>
  );
}
