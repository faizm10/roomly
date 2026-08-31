import { demoSearchResults } from "@/lib/demo-data";
import type { PlaceCategory, PlaceSearchResult } from "@/lib/types";

export const dynamic = "force-dynamic";

function normalizeCategory(value?: string): PlaceCategory {
  const label = value?.toLowerCase() ?? "";
  if (label.includes("coffee") || label.includes("bar")) return "Drink";
  if (label.includes("restaurant") || label.includes("bakery") || label.includes("food")) return "Eat";
  if (label.includes("shop") || label.includes("store") || label.includes("market")) return "Shop";
  if (label.includes("hotel") || label.includes("hostel")) return "Stay";
  if (label.includes("museum") || label.includes("park") || label.includes("landmark")) return "See";
  return "Other";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim() ?? "";
  const near = url.searchParams.get("near")?.trim() || "Lisbon, Portugal";
  const apiKey = process.env.FOURSQUARE_API_KEY;

  if (!apiKey) {
    const filtered = demoSearchResults.filter((place) =>
      `${place.name} ${place.neighborhood}`.toLowerCase().includes(query.toLowerCase()),
    );
    return Response.json({ results: filtered.slice(0, 7), demo: true }, { headers: { "Cache-Control": "no-store" } });
  }

  const endpoint = new URL("https://places-api.foursquare.com/places/search");
  endpoint.searchParams.set("query", query);
  endpoint.searchParams.set("near", near);
  endpoint.searchParams.set("limit", "7");
  endpoint.searchParams.set("fields", "fsq_place_id,name,location,latitude,longitude,categories");
  const response = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
      "X-Places-Api-Version": "2025-06-17",
    },
    cache: "no-store",
  });
  if (!response.ok) return Response.json({ error: "Place search is temporarily unavailable." }, { status: 502 });
  const body = (await response.json()) as {
    results?: Array<{
      fsq_place_id: string;
      name: string;
      location?: { formatted_address?: string; locality?: string; region?: string };
      longitude?: number;
      latitude?: number;
      categories?: Array<{ name: string }>;
    }>;
  };
  const results: PlaceSearchResult[] = (body.results ?? []).flatMap((place) => {
    if (typeof place.longitude !== "number" || typeof place.latitude !== "number") return [];
    return [{
      fsqPlaceId: place.fsq_place_id,
      name: place.name,
      address: place.location?.formatted_address ?? "Address unavailable",
      neighborhood: place.location?.locality ?? place.location?.region ?? near,
      coordinates: [place.longitude, place.latitude],
      category: normalizeCategory(place.categories?.[0]?.name),
    }];
  });
  return Response.json({ results, demo: false }, { headers: { "Cache-Control": "no-store" } });
}
