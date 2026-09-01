"use client";

import {
  BedDouble,
  Bike,
  Bookmark,
  Check,
  Coffee,
  ExternalLink,
  Footprints,
  Landmark,
  List,
  Map as MapIcon,
  MapPin,
  MoreHorizontal,
  Navigation,
  Plus,
  Route,
  Share2,
  ShoppingBag,
  Trash2,
  Utensils,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { addPlace as persistPlace, removePlace as persistRemovePlace, updatePlace as persistUpdatePlace } from "@/app/trips/actions";
import { AddPlaceDialog } from "@/components/add-place-dialog";
import { PlacePhoto } from "@/components/place-photo";
import { ProfileAvatar } from "@/components/profile-avatar";
import { TripLogisticsDialog, type TripDetails } from "@/components/trip-logistics-dialog";
import { TripMap } from "@/components/trip-map";
import { buildAppleMapsUrl, buildGoogleMapsPlaceUrl, buildGoogleMapsUrl } from "@/lib/navigation";
import { PLACE_CATEGORIES, categoryClass, isPersistedTripId, type Collaborator, type Place, type PlaceCategory, type TravelMode, type Trip, type TripViewer } from "@/lib/types";

type RouteStats = { durationSeconds: number; distanceMeters: number };
type MobileView = "list" | "map";
type SaveState = "idle" | "saving" | "saved" | "error";

function plannersFor(collaborators: Collaborator[], viewer?: TripViewer): Collaborator[] {
  const self = viewer ? { id: viewer.id, name: viewer.name, image: viewer.image } : null;
  const others = collaborators.filter((person) => person.id && person.id !== self?.id);
  if (self) return [self, ...others];
  return collaborators;
}

const categoryIcons = {
  Eat: Utensils,
  Drink: Coffee,
  See: Landmark,
  Shop: ShoppingBag,
  Stay: BedDouble,
  Other: MapPin,
} satisfies Record<PlaceCategory, typeof MapPin>;

export function TripWorkspace({
  trip,
  mapToken,
  viewer,
}: {
  trip: Trip;
  mapToken?: string;
  viewer?: TripViewer;
}) {
  const router = useRouter();
  const [places, setPlaces] = useState(trip.places);
  const [details, setDetails] = useState<TripDetails>({
    title: trip.title,
    destination: trip.destination,
    country: trip.country,
    dateLabel: trip.dateLabel,
    startDate: trip.startDate,
    endDate: trip.endDate,
  });
  const [selectedId, setSelectedId] = useState(trip.places[0]?.id ?? "");
  const [filter, setFilter] = useState<PlaceCategory | "All">("All");
  const [mobileView, setMobileView] = useState<MobileView>("list");
  const [addOpen, setAddOpen] = useState(false);
  const [logisticsOpen, setLogisticsOpen] = useState(false);
  const [routeMode, setRouteMode] = useState<TravelMode | null>(null);
  const [routeStats, setRouteStats] = useState<RouteStats | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const navDialogRef = useRef<HTMLElement>(null);
  const persistChain = useRef(Promise.resolve());
  const persistedIds = useRef(new Map<string, string>());
  const persistable = isPersistedTripId(trip.id);

  function enqueuePersist(work: () => Promise<void>) {
    setSaveState("saving");
    persistChain.current = persistChain.current
      .then(work)
      .then(() => setSaveState("saved"))
      .catch(() => setSaveState("error"));
  }

  const planners = useMemo(() => plannersFor(trip.collaborators, viewer), [trip.collaborators, viewer]);
  const visiblePlaces = useMemo(
    () => (filter === "All" ? places : places.filter((place) => place.category === filter)),
    [filter, places],
  );
  const selected = places.find((place) => place.id === selectedId);

  const selectPlace = useCallback((id: string) => {
    setSelectedId(id);
    if (window.matchMedia("(min-width: 1100px)").matches) {
      requestAnimationFrame(() => document.getElementById(`place-${id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
    }
  }, []);

  useEffect(() => {
    if (!routeMode || places.length < 2) {
      return;
    }
    const controller = new AbortController();
    fetch("/api/routes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ coordinates: places.map((place) => place.coordinates), mode: routeMode }),
      signal: controller.signal,
    })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Route unavailable")))
      .then((body: RouteStats) => setRouteStats(body))
      .catch(() => setRouteStats(null));
    return () => controller.abort();
  }, [places, routeMode]);

  useEffect(() => {
    if (saveState !== "saving") return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [saveState]);

  useEffect(() => {
    if (!navOpen) return;
    navDialogRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setNavOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [navOpen]);

  function addPlace(place: Place) {
    const next = { ...place, addedBy: viewer?.name || place.addedBy, saved: true };
    setPlaces((current) => [...current, next]);
    setSelectedId(next.id);
    setFilter("All");
    setMobileView("list");
    if (!persistable) return;
    enqueuePersist(async () => {
      try {
        const saved = await persistPlace({
          tripId: trip.id,
          fsqPlaceId: next.fsqPlaceId,
          name: next.name,
          address: next.address,
          neighborhood: next.neighborhood,
          longitude: next.coordinates[0],
          latitude: next.coordinates[1],
          category: next.category,
          note: next.note,
          sourceUrl: next.sourceUrl ?? "",
          saved: true,
        });
        if (!("id" in saved) || !saved.id) return;
        persistedIds.current.set(next.id, saved.id);
        setPlaces((current) => current.map((item) => (item.id === next.id ? { ...item, id: saved.id } : item)));
        setSelectedId((current) => (current === next.id ? saved.id : current));
      } catch (error) {
        setPlaces((current) => current.filter((item) => item.id !== next.id));
        throw error;
      }
    });
  }

  function toggleSaved(id: string) {
    const place = places.find((item) => item.id === id);
    const nextSaved = !place?.saved;
    setPlaces((current) => current.map((item) => (item.id === id ? { ...item, saved: !item.saved } : item)));
    if (!persistable || !place) return;
    enqueuePersist(async () => {
      try {
        const placeId = persistedIds.current.get(id) ?? id;
        if (placeId.startsWith("local-")) return;
        await persistUpdatePlace({ tripId: trip.id, placeId, saved: nextSaved });
      } catch (error) {
        setPlaces((current) => current.map((item) => (item.id === id ? { ...item, saved: place.saved } : item)));
        throw error;
      }
    });
  }

  function removePlace(id: string) {
    const removed = places.find((place) => place.id === id);
    setPlaces((current) => {
      const next = current.filter((place) => place.id !== id);
      if (selectedId === id) setSelectedId(next[0]?.id ?? "");
      return next;
    });
    if (!persistable) return;
    enqueuePersist(async () => {
      try {
        const placeId = persistedIds.current.get(id) ?? id;
        if (placeId.startsWith("local-")) return;
        await persistRemovePlace({ tripId: trip.id, placeId });
      } catch (error) {
        if (removed) setPlaces((current) => (current.some((place) => place.id === removed.id) ? current : [...current, removed]));
        throw error;
      }
    });
  }

  async function share() {
    const inviteUrl = `${window.location.origin}/invite/demo-lisbon-board`;
    await navigator.clipboard?.writeText(inviteUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  const activeRouteStats = routeMode && places.length >= 2 ? routeStats : null;
  const minutes = activeRouteStats ? Math.max(1, Math.round(activeRouteStats.durationSeconds / 60)) : null;
  const kilometers = activeRouteStats ? (activeRouteStats.distanceMeters / 1000).toFixed(1) : null;

  return (
    <div className={`trip-workspace mobile-${mobileView}`}>
      <div className="mobile-view-switch" role="tablist" aria-label="Trip view">
        <button role="tab" aria-selected={mobileView === "list"} className={mobileView === "list" ? "active" : ""} onClick={() => setMobileView("list")} type="button"><List size={15} /> List</button>
        <button role="tab" aria-selected={mobileView === "map"} className={mobileView === "map" ? "active" : ""} onClick={() => setMobileView("map")} type="button"><MapIcon size={15} /> Map</button>
      </div>

      <aside className="places-panel">
        <div className="places-panel-header">
          <div className="trip-title-row">
            <div><p className="eyebrow">{details.destination} · {details.dateLabel}</p><h1>{details.title}</h1></div>
            <div className="trip-header-actions">
              <button className="icon-button trip-options" aria-label="Add a place" onClick={() => setAddOpen(true)} type="button"><Plus size={19} /></button>
              <button className="icon-button trip-options" aria-label="Change where, when, and what" onClick={() => setLogisticsOpen(true)} type="button"><MoreHorizontal size={19} /></button>
            </div>
          </div>
          <div className="collab-row">
            <div className="mini-avatars">
              {planners.map((person) => (
                <ProfileAvatar image={person.image} key={person.id ?? person.name} name={person.name} size="xs" />
              ))}
            </div>
            <span>{planners.length} planning</span>
            {saveState !== "idle" ? (
              <span className={`save-status${saveState === "error" ? " error" : ""}`} aria-live="polite">
                {saveState === "saving" ? "Saving" : saveState === "saved" ? "Saved" : "Couldn’t save"}
              </span>
            ) : null}
            <button onClick={share} type="button">{copied ? <Check size={14} /> : <Share2 size={14} />}{copied ? "Link copied" : "Invite"}</button>
          </div>
          <div className="filter-scroll" aria-label="Filter places">
            <button className={`filter-pill filter-all${filter === "All" ? " active" : ""}`} onClick={() => setFilter("All")} type="button">All</button>
            {PLACE_CATEGORIES.map((item) => {
              const Icon = categoryIcons[item];
              return <button className={`filter-pill ${categoryClass(item)}${filter === item ? " active" : ""}`} onClick={() => setFilter(item)} key={item} type="button"><Icon size={13} /> {item}</button>;
            })}
          </div>
        </div>

        <div className="place-list">
          {visiblePlaces.map((place) => {
            const originalIndex = places.findIndex((item) => item.id === place.id);
            const number = String(originalIndex + 1).padStart(2, "0");
            return (
              <article
                className={`saved-place${selectedId === place.id ? " selected" : ""}`}
                id={`place-${place.id}`}
                onClick={() => selectPlace(place.id)}
                onKeyDown={(event) => {
                  if (event.currentTarget !== event.target) return;
                  if (event.key === "Enter" || event.key === " ") selectPlace(place.id);
                }}
                tabIndex={0}
                aria-label={`Show ${place.name} on the map`}
                key={place.id}
              >
                <div className="itinerary-rail"><span>{number}</span><i /></div>
                <PlacePhoto fsqPlaceId={place.fsqPlaceId} name={place.name} label={place.category} />
                <div className="saved-place-copy">
                  <p className="place-kicker">
                    <span className={`category-tag ${categoryClass(place.category)}`}>{place.category}</span>
                    {place.neighborhood ? <span className="place-hood">{place.neighborhood}</span> : null}
                  </p>
                  <h2>{place.name}</h2>
                  <small className="place-address">
                    {place.address}
                    <a
                      href={buildGoogleMapsPlaceUrl(place)}
                      aria-label={`Open ${place.name} in Google Maps`}
                      onClick={(event) => event.stopPropagation()}
                      rel="noreferrer"
                      target="_blank"
                    >
                      🗺️
                    </a>
                  </small>
                  <p className="place-note">{place.note || "No note yet. Add the detail that made this place worth saving."}</p>
                  <div className="place-actions">
                    <span className="contributor">Added by {place.addedBy}</span>
                    {place.sourceUrl ? <a href={place.sourceUrl} onClick={(event) => event.stopPropagation()} target="_blank" rel="noreferrer">Original source <ExternalLink size={13} /></a> : null}
                  </div>
                </div>
                <div className="place-row-controls">
                  <button className="save-button" onClick={(event) => { event.stopPropagation(); toggleSaved(place.id); }} aria-label={place.saved ? `Unsave ${place.name}` : `Save ${place.name}`} type="button"><Bookmark size={18} fill={place.saved ? "currentColor" : "none"} /></button>
                  <button className="delete-place" onClick={(event) => { event.stopPropagation(); removePlace(place.id); }} aria-label={`Remove ${place.name}`} type="button"><Trash2 size={15} /></button>
                </div>
              </article>
            );
          })}
          {!visiblePlaces.length ? <div className="empty-filter"><p>No {filter.toLowerCase()} places yet.</p><button onClick={() => setAddOpen(true)} type="button">Add the first one <Plus size={15} /></button></div> : null}
          <button className="add-place-row" onClick={() => setAddOpen(true)} type="button"><span><Plus size={18} /></span><div><strong>Add another place</strong><small>Search {details.destination}</small></div></button>
        </div>
      </aside>

      <section className="map-panel">
        <TripMap destination={details.destination} places={places} selectedId={selectedId} onSelect={selectPlace} routeActive={Boolean(routeMode)} mapToken={mapToken} />
        <div className="map-topbar">
          <button className={`route-button${routeMode ? " active" : ""}`} onClick={() => setRouteMode((current) => current ?? "walking")} type="button"><Route size={16} /> {routeMode ? "Route active" : "Plan a route"}</button>
        </div>
        {selected ? <button className="mobile-place-peek" onClick={() => setMobileView("list")} type="button"><span>{String(places.findIndex((place) => place.id === selected.id) + 1).padStart(2, "0")}</span><strong>{selected.name}</strong><small>{selected.neighborhood} · View details</small></button> : null}
        {routeMode ? (
          <div className="route-dock">
            <header><div><p className="eyebrow">Route preview</p><strong>{places.length} stops · {kilometers ?? "…"} km</strong></div><button className="icon-button" onClick={() => setRouteMode(null)} aria-label="Close route preview" type="button"><X size={18} /></button></header>
            <div className="mode-picker">
              {(["walking", "cycling", "driving"] as TravelMode[]).map((mode) => (
                <button className={routeMode === mode ? "active" : ""} onClick={() => setRouteMode(mode)} key={mode} type="button">
                  {mode === "walking" ? <Footprints size={15} /> : mode === "cycling" ? <Bike size={15} /> : <Navigation size={15} />}<span>{mode}</span>
                </button>
              ))}
            </div>
            <div className="route-summary"><div><strong>{minutes ?? "—"}</strong><small>min</small></div><p>A planning preview. Your navigation app handles live directions.</p><button className="button button-ink" onClick={() => setNavOpen(true)} type="button"><Navigation size={16} /> Start</button></div>
          </div>
        ) : null}
      </section>

      <button className="mobile-add-button" onClick={() => setAddOpen(true)} aria-label="Add a place" type="button"><Plus size={22} /></button>
      {addOpen ? <AddPlaceDialog destination={details.destination} onAdd={addPlace} onClose={() => setAddOpen(false)} /> : null}
      {logisticsOpen ? (
        <TripLogisticsDialog
          onClose={() => setLogisticsOpen(false)}
          onSave={(next) => {
            setDetails(next);
            router.refresh();
          }}
          trip={{ ...details, id: trip.id }}
        />
      ) : null}
      {navOpen ? (
        <div className="dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setNavOpen(false)}>
          <section className="nav-dialog" ref={navDialogRef} role="dialog" aria-modal="true" aria-labelledby="nav-title" tabIndex={-1}>
            <button className="icon-button nav-close" onClick={() => setNavOpen(false)} aria-label="Close" type="button"><X size={19} /></button>
            <span className="nav-compass"><Navigation size={27} /></span>
            <p className="eyebrow">Hand off the route</p><h2 id="nav-title">Ready to go?</h2><p>Open the route in the navigation app you use on the road.</p>
            <a className="button button-ink button-full" href={buildGoogleMapsUrl(places, routeMode ?? "walking")} target="_blank" rel="noreferrer">Open Google Maps <ExternalLink size={16} /></a>
            <a className="button button-ghost button-full" href={buildAppleMapsUrl(places, routeMode ?? "walking")} target="_blank" rel="noreferrer">Open Apple Maps <ExternalLink size={16} /></a>
          </section>
        </div>
      ) : null}
    </div>
  );
}
