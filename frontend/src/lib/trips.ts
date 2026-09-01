import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { countryFromDestination, formatDateLabel } from "@/lib/dates";
import { getDatabase } from "@/lib/db";
import { tripCities, tripDayNotes, tripMembers, tripPlaces, trips } from "@/lib/db/schema";
import type { CityStop, Collaborator, DayNote, PlaceCategory, Trip, TripViewer } from "@/lib/types";

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

function destinationParts(destination: string) {
  const parts = destination.split(",").map((part) => part.trim()).filter(Boolean);
  return {
    name: parts[0] || destination,
    country: parts.length > 1 ? parts.at(-1) ?? "" : countryFromDestination(destination),
  };
}

function isPlanningSchemaMissing(error: unknown) {
  const message = error instanceof Error ? `${error.message} ${error.cause ?? ""}` : String(error);
  return /trip_cities|trip_day_notes|city_id|planned_date|day_sort_order|relation .* does not exist|column .* does not exist/i.test(message);
}

function toCityStop(row: {
  id: string;
  name: string;
  country: string;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  sortOrder: number;
}): CityStop {
  return {
    id: row.id,
    name: row.name,
    country: row.country,
    startDate: row.startDate ? asIsoDate(row.startDate) : null,
    endDate: row.endDate ? asIsoDate(row.endDate) : null,
    sortOrder: row.sortOrder,
  };
}

function fallbackCity(row: { id: string; destination: string; startDate: string | Date; endDate: string | Date }): CityStop {
  const destination = destinationParts(row.destination);
  return {
    id: `${row.id}-primary-city`,
    name: destination.name,
    country: destination.country,
    startDate: asIsoDate(row.startDate),
    endDate: asIsoDate(row.endDate),
    sortOrder: 0,
  };
}

function formatCitySummary(cities: CityStop[], fallback: string) {
  if (!cities.length) return fallback;
  if (cities.length === 1) return cities[0].name;
  return `${cities[0].name} + ${cities.length - 1} ${cities.length === 2 ? "city" : "cities"}`;
}

function toTrip(row: {
  id: string;
  title: string;
  destination: string;
  startDate: string | Date;
  endDate: string | Date;
  placeCount?: number;
  cities?: CityStop[];
  dayNotes?: DayNote[];
  collaborators?: Collaborator[];
}): Trip {
  const startDate = asIsoDate(row.startDate);
  const endDate = asIsoDate(row.endDate);
  const placeCount = Math.max(0, Number(row.placeCount ?? 0));
  const cities = row.cities?.length ? row.cities : [fallbackCity(row)];
  return {
    id: row.id,
    title: row.title,
    destination: formatCitySummary(cities, row.destination),
    country: cities[0]?.country || countryFromDestination(row.destination),
    dateLabel: formatDateLabel(startDate, endDate),
    startDate,
    endDate,
    cities,
    dayNotes: row.dayNotes ?? [],
    places: Array.from({ length: placeCount }, (_, index) => ({
      id: `${row.id}-place-${index}`,
      fsqPlaceId: "",
      cityId: null,
      name: "Saved place",
      address: "",
      neighborhood: "",
      category: "Other" as PlaceCategory,
      note: "",
      coordinates: [0, 0] as [number, number],
      saved: true,
      plannedDate: null,
      daySortOrder: 0,
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
  const tripIds = rows.map((row) => row.id);
  const members = await db
    .select({
      tripId: tripMembers.tripId,
      userId: tripMembers.userId,
      role: tripMembers.role,
      displayName: tripMembers.displayName,
      image: tripMembers.image,
    })
    .from(tripMembers)
    .where(inArray(tripMembers.tripId, tripIds));
  let cities: {
    id: string;
    tripId: string;
    name: string;
    country: string;
    startDate: string | Date | null;
    endDate: string | Date | null;
    sortOrder: number;
  }[] = [];
  try {
    cities = await db
      .select({
        id: tripCities.id,
        tripId: tripCities.tripId,
        name: tripCities.name,
        country: tripCities.country,
        startDate: tripCities.startDate,
        endDate: tripCities.endDate,
        sortOrder: tripCities.sortOrder,
      })
      .from(tripCities)
      .where(inArray(tripCities.tripId, tripIds))
      .orderBy(tripCities.sortOrder);
  } catch (error) {
    if (!isPlanningSchemaMissing(error)) throw error;
  }
  const membersByTrip = new Map<string, typeof members>();
  for (const member of members) {
    const list = membersByTrip.get(member.tripId) ?? [];
    list.push(member);
    membersByTrip.set(member.tripId, list);
  }
  const citiesByTrip = new Map<string, CityStop[]>();
  for (const city of cities) {
    const list = citiesByTrip.get(city.tripId) ?? [];
    list.push(toCityStop(city));
    citiesByTrip.set(city.tripId, list);
  }
  return rows.map((row) =>
    toTrip({
      ...row,
      cities: citiesByTrip.get(row.id),
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
  let planningSchemaAvailable = true;
  let cityRows: {
    id: string;
    name: string;
    country: string;
    startDate: string | Date | null;
    endDate: string | Date | null;
    sortOrder: number;
  }[] = [];
  try {
    cityRows = await db
      .select({
        id: tripCities.id,
        name: tripCities.name,
        country: tripCities.country,
        startDate: tripCities.startDate,
        endDate: tripCities.endDate,
        sortOrder: tripCities.sortOrder,
      })
      .from(tripCities)
      .where(eq(tripCities.tripId, tripId))
      .orderBy(tripCities.sortOrder);
  } catch (error) {
    if (!isPlanningSchemaMissing(error)) throw error;
    planningSchemaAvailable = false;
  }
  trip.cities = cityRows.map(toCityStop);
  if (!trip.cities.length) trip.cities = [fallbackCity(row)];
  trip.destination = formatCitySummary(trip.cities, row.destination);
  trip.country = trip.cities[0]?.country || countryFromDestination(row.destination);
  let savedPlaces: {
    id: string;
    fsqPlaceId: string;
    cityId: string | null;
    name: string;
    address: string;
    neighborhood: string;
    longitude: number;
    latitude: number;
    category: string;
    note: string;
    sourceUrl: string | null;
    saved: boolean;
    plannedDate: string | Date | null;
    daySortOrder: number;
    addedBy: string;
  }[];
  try {
    savedPlaces = await db
      .select({
        id: tripPlaces.id,
        fsqPlaceId: tripPlaces.fsqPlaceId,
        cityId: tripPlaces.cityId,
        name: tripPlaces.name,
        address: tripPlaces.address,
        neighborhood: tripPlaces.neighborhood,
        longitude: tripPlaces.longitude,
        latitude: tripPlaces.latitude,
        category: tripPlaces.category,
        note: tripPlaces.note,
        sourceUrl: tripPlaces.sourceUrl,
        saved: tripPlaces.saved,
        plannedDate: tripPlaces.plannedDate,
        daySortOrder: tripPlaces.daySortOrder,
        addedBy: tripPlaces.addedBy,
      })
      .from(tripPlaces)
      .where(eq(tripPlaces.tripId, tripId))
      .orderBy(tripPlaces.sortOrder);
  } catch (error) {
    if (!isPlanningSchemaMissing(error)) throw error;
    planningSchemaAvailable = false;
    savedPlaces = (await db
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
      .orderBy(tripPlaces.sortOrder)).map((place) => ({
        ...place,
        cityId: null,
        plannedDate: null,
        daySortOrder: 0,
      }));
  }
  const namesByUser = new Map(
    trip.collaborators.flatMap((person) => (person.id ? [[person.id, person.name] as const] : [])),
  );
  if (planningSchemaAvailable) {
    const dayNotes = await db
      .select({
        id: tripDayNotes.id,
        cityId: tripDayNotes.cityId,
        plannedDate: tripDayNotes.plannedDate,
        note: tripDayNotes.note,
        sortOrder: tripDayNotes.sortOrder,
        addedBy: tripDayNotes.addedBy,
      })
      .from(tripDayNotes)
      .where(eq(tripDayNotes.tripId, tripId))
      .orderBy(tripDayNotes.plannedDate, tripDayNotes.sortOrder);
    trip.dayNotes = dayNotes.map((note) => ({
      id: note.id,
      cityId: note.cityId,
      plannedDate: asIsoDate(note.plannedDate),
      note: note.note,
      sortOrder: note.sortOrder,
      addedBy: namesByUser.get(note.addedBy) || note.addedBy,
    }));
  }
  trip.places = savedPlaces.map((place) => ({
    id: place.id,
    fsqPlaceId: place.fsqPlaceId,
    cityId: place.cityId,
    name: place.name || "Saved place",
    address: place.address ?? "",
    neighborhood: place.neighborhood ?? "",
    category: place.category as PlaceCategory,
    note: place.note,
    sourceUrl: place.sourceUrl ?? undefined,
    coordinates: [Number(place.longitude), Number(place.latitude)] as [number, number],
    saved: place.saved,
    plannedDate: place.plannedDate ? asIsoDate(place.plannedDate) : null,
    daySortOrder: place.daySortOrder,
    addedBy: namesByUser.get(place.addedBy) || place.addedBy,
  }));
  return trip;
}
