import type { Place, TravelMode } from "@/lib/types";

export function buildGoogleMapsPlaceUrl(place: Place) {
  const [lng, lat] = place.coordinates;
  const params = new URLSearchParams({ api: "1", query: `${lat},${lng}` });
  return `https://www.google.com/maps/search/?${params.toString()}`;
}

export function buildGoogleMapsUrl(places: Place[], mode: TravelMode) {
  const [origin, ...rest] = places;
  const destination = rest.at(-1) ?? origin;
  const waypoints = rest.slice(0, -1);
  const params = new URLSearchParams({
    api: "1",
    origin: `${origin.coordinates[1]},${origin.coordinates[0]}`,
    destination: `${destination.coordinates[1]},${destination.coordinates[0]}`,
    travelmode: mode === "cycling" ? "bicycling" : mode,
  });
  if (waypoints.length) {
    params.set(
      "waypoints",
      waypoints.map((place) => `${place.coordinates[1]},${place.coordinates[0]}`).join("|"),
    );
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function buildAppleMapsUrl(places: Place[], mode: TravelMode) {
  const destination = places.at(-1) ?? places[0];
  const params = new URLSearchParams({
    daddr: `${destination.coordinates[1]},${destination.coordinates[0]}`,
    dirflg: mode === "walking" ? "w" : mode === "driving" ? "d" : "w",
  });
  return `https://maps.apple.com/?${params.toString()}`;
}
