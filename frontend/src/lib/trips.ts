import { and, desc, eq, sql } from "drizzle-orm";
import { getDatabase } from "@/lib/db";
import { tripMembers, tripPlaces, trips } from "@/lib/db/schema";
import type { PlaceCategory, Trip } from "@/lib/types";

function asIsoDate(value: string | Date) {
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function formatDateLabel(startDate: string, endDate: string) {
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const monthName = (iso: string) => months[Number(iso.slice(5, 7)) - 1] ?? "";
  const day = (iso: string) => String(Number(iso.slice(8, 10)));
  if (startDate.slice(0, 7) === endDate.slice(0, 7)) {
    return `${monthName(startDate)} ${day(startDate)}—${day(endDate)}`;
  }
  return `${monthName(startDate)} ${day(startDate)}—${monthName(endDate)} ${day(endDate)}`;
}

function toTrip(row: {
  id: string;
  title: string;
  destination: string;
  startDate: string | Date;
  endDate: string | Date;
  placeCount?: number;
  memberCount?: number;
}): Trip {
  const startDate = asIsoDate(row.startDate);
  const endDate = asIsoDate(row.endDate);
  const memberCount = Math.max(1, Number(row.memberCount ?? 1));
  const placeCount = Math.max(0, Number(row.placeCount ?? 0));
  return {
    id: row.id,
    title: row.title,
    destination: row.destination,
    country: row.destination,
    dateLabel: formatDateLabel(startDate, endDate),
    startDate,
    endDate,
    places: Array.from({ length: placeCount }, (_, index) => ({
      id: `${row.id}-place-${index}`,
      fsqPlaceId: "",
      name: "Saved place",
      address: "",
      neighborhood: "",
      category: "Other" as PlaceCategory,
      note: "",
      coordinates: [0, 0] as [number, number],
      saved: true,
      addedBy: "",
    })),
    collaborators: Array.from({ length: memberCount }, (_, index) =>
      index === 0 ? { initials: "YO", name: "You" } : { initials: "CO", name: "Collaborator" },
    ),
  };
}

export async function listViewerTrips(userId: string): Promise<Trip[]> {
  const db = getDatabase();
  if (!db) return [];
  const rows = await db
    .select({
      id: trips.id,
      title: trips.title,
      destination: trips.destination,
      startDate: trips.startDate,
      endDate: trips.endDate,
      placeCount: sql<number>`(select count(*)::int from ${tripPlaces} where ${tripPlaces.tripId} = ${trips.id})`,
      memberCount: sql<number>`(select count(*)::int from ${tripMembers} where ${tripMembers.tripId} = ${trips.id})`,
    })
    .from(tripMembers)
    .innerJoin(trips, eq(tripMembers.tripId, trips.id))
    .where(eq(tripMembers.userId, userId))
    .orderBy(desc(trips.createdAt));
  return rows.map(toTrip);
}

export async function getViewerTrip(tripId: string, userId: string): Promise<Trip | null> {
  const db = getDatabase();
  if (!db) return null;
  const [row] = await db
    .select({
      id: trips.id,
      title: trips.title,
      destination: trips.destination,
      startDate: trips.startDate,
      endDate: trips.endDate,
    })
    .from(trips)
    .innerJoin(tripMembers, and(eq(tripMembers.tripId, trips.id), eq(tripMembers.userId, userId)))
    .where(eq(trips.id, tripId))
    .limit(1);
  if (!row) return null;
  const trip = toTrip(row);
  const savedPlaces = await db
    .select({
      id: tripPlaces.id,
      fsqPlaceId: tripPlaces.fsqPlaceId,
      category: tripPlaces.category,
      note: tripPlaces.note,
      sourceUrl: tripPlaces.sourceUrl,
      addedBy: tripPlaces.addedBy,
    })
    .from(tripPlaces)
    .where(eq(tripPlaces.tripId, tripId))
    .orderBy(tripPlaces.sortOrder);
  trip.places = savedPlaces.map((place) => ({
    id: place.id,
    fsqPlaceId: place.fsqPlaceId,
    name: place.note || "Saved place",
    address: "",
    neighborhood: "",
    category: place.category as PlaceCategory,
    note: place.note,
    sourceUrl: place.sourceUrl ?? undefined,
    coordinates: [0, 0] as [number, number],
    saved: true,
    addedBy: place.addedBy,
  }));
  return trip;
}
