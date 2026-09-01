import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { countryFromDestination, formatDateLabel } from "@/lib/dates";
import { getDatabase } from "@/lib/db";
import { tripMembers, tripPlaces, trips } from "@/lib/db/schema";
import type { Collaborator, PlaceCategory, Trip, TripViewer } from "@/lib/types";

function asIsoDate(value: string | Date) {
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function toCollaborator(
  member: { userId: string; displayName: string; image: string | null; role: "owner" | "editor" },
  viewer?: TripViewer,
): Collaborator {
  const isViewer = member.userId === viewer?.id;
  return {
    id: member.userId,
    name: (isViewer ? viewer?.name : member.displayName) || member.displayName || "Traveller",
    image: (isViewer ? viewer?.image : member.image) ?? member.image,
  };
}

function sortPlanners<T extends { role: "owner" | "editor"; joinedAt?: Date | string }>(members: T[]) {
  return [...members].sort((left, right) => {
    if (left.role === right.role) return 0;
    return left.role === "owner" ? -1 : 1;
  });
}

function toTrip(row: {
  id: string;
  title: string;
  destination: string;
  startDate: string | Date;
  endDate: string | Date;
  placeCount?: number;
  collaborators?: Collaborator[];
}): Trip {
  const startDate = asIsoDate(row.startDate);
  const endDate = asIsoDate(row.endDate);
  const placeCount = Math.max(0, Number(row.placeCount ?? 0));
  return {
    id: row.id,
    title: row.title,
    destination: row.destination,
    country: countryFromDestination(row.destination),
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
    collaborators: row.collaborators ?? [],
  };
}

export function toTripViewer(viewer: { id: string; name?: string | null; image?: string | null }): TripViewer {
  return { id: viewer.id, name: viewer.name?.trim() || "Traveller", image: viewer.image };
}

export async function syncMemberProfile(viewer: TripViewer) {
  const db = getDatabase();
  if (!db) return;
  await db
    .update(tripMembers)
    .set({
      displayName: viewer.name.trim() || "Traveller",
      image: viewer.image || null,
    })
    .where(eq(tripMembers.userId, viewer.id));
}

export async function listViewerTrips(viewer: TripViewer): Promise<Trip[]> {
  const db = getDatabase();
  if (!db) return [];
  await syncMemberProfile(viewer);
  const rows = await db
    .select({
      id: trips.id,
      title: trips.title,
      destination: trips.destination,
      startDate: trips.startDate,
      endDate: trips.endDate,
      placeCount: sql<number>`(select count(*)::int from ${tripPlaces} where ${tripPlaces.tripId} = ${trips.id})`,
    })
    .from(tripMembers)
    .innerJoin(trips, eq(tripMembers.tripId, trips.id))
    .where(eq(tripMembers.userId, viewer.id))
    .orderBy(desc(trips.createdAt));
  if (!rows.length) return [];
  const members = await db
    .select({
      tripId: tripMembers.tripId,
      userId: tripMembers.userId,
      role: tripMembers.role,
      displayName: tripMembers.displayName,
      image: tripMembers.image,
    })
    .from(tripMembers)
    .where(inArray(tripMembers.tripId, rows.map((row) => row.id)));
  const membersByTrip = new Map<string, typeof members>();
  for (const member of members) {
    const list = membersByTrip.get(member.tripId) ?? [];
    list.push(member);
    membersByTrip.set(member.tripId, list);
  }
  return rows.map((row) =>
    toTrip({
      ...row,
      collaborators: sortPlanners(membersByTrip.get(row.id) ?? []).map((member) => toCollaborator(member, viewer)),
    }),
  );
}

export async function getViewerTrip(tripId: string, viewer: TripViewer): Promise<Trip | null> {
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
    .innerJoin(tripMembers, and(eq(tripMembers.tripId, trips.id), eq(tripMembers.userId, viewer.id)))
    .where(eq(trips.id, tripId))
    .limit(1);
  if (!row) return null;
  await syncMemberProfile(viewer);
  const members = await db
    .select({
      userId: tripMembers.userId,
      role: tripMembers.role,
      displayName: tripMembers.displayName,
      image: tripMembers.image,
    })
    .from(tripMembers)
    .where(eq(tripMembers.tripId, tripId));
  const trip = toTrip({
    ...row,
    collaborators: sortPlanners(members).map((member) => toCollaborator(member, viewer)),
  });
  const savedPlaces = await db
    .select({
      id: tripPlaces.id,
      fsqPlaceId: tripPlaces.fsqPlaceId,
      name: tripPlaces.name,
      address: tripPlaces.address,
      neighborhood: tripPlaces.neighborhood,
      longitude: tripPlaces.longitude,
      latitude: tripPlaces.latitude,
      category: tripPlaces.category,
      note: tripPlaces.note,
      sourceUrl: tripPlaces.sourceUrl,
      saved: tripPlaces.saved,
      addedBy: tripPlaces.addedBy,
    })
    .from(tripPlaces)
    .where(eq(tripPlaces.tripId, tripId))
    .orderBy(tripPlaces.sortOrder);
  const namesByUser = new Map(
    trip.collaborators.flatMap((person) => (person.id ? [[person.id, person.name] as const] : [])),
  );
  trip.places = savedPlaces.map((place) => ({
    id: place.id,
    fsqPlaceId: place.fsqPlaceId,
    name: place.name || "Saved place",
    address: place.address ?? "",
    neighborhood: place.neighborhood ?? "",
    category: place.category as PlaceCategory,
    note: place.note,
    sourceUrl: place.sourceUrl ?? undefined,
    coordinates: [Number(place.longitude), Number(place.latitude)] as [number, number],
    saved: place.saved,
    addedBy: namesByUser.get(place.addedBy) || place.addedBy,
  }));
  return trip;
}
