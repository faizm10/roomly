"use server";

import { createHash, randomBytes } from "node:crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { countryFromDestination } from "@/lib/dates";
import { tripCities, tripDayNotes, tripInvitations, tripMembers, tripPlaces, trips } from "@/lib/db/schema";
import {
  addDayNoteSchema,
  addPlaceSchema,
  addTripCitySchema,
  createTripSchema,
  inviteSchema,
  removeDayNoteSchema,
  removePlaceSchema,
  removeTripCitySchema,
  updateDayNoteSchema,
  updatePlacePlanningSchema,
  updatePlaceSchema,
  updateTripCitySchema,
  updateTripSchema,
} from "@/lib/validators";

async function requireViewer() {
  const viewer = await getViewer();
  if (!viewer) throw new Error("You must sign in first.");
  return viewer;
}

async function requireEditor(tripId: string, userId: string) {
  const db = getDatabase();
  if (!db) return;
  const [membership] = await db
    .select({ role: tripMembers.role })
    .from(tripMembers)
    .where(and(eq(tripMembers.tripId, tripId), eq(tripMembers.userId, userId)))
    .limit(1);
  if (!membership) throw new Error("You do not have access to this trip.");
}

async function requireOwner(tripId: string, userId: string) {
  const db = getDatabase();
  if (!db) return;
  const [trip] = await db
    .select({ id: trips.id })
    .from(trips)
    .where(and(eq(trips.id, tripId), eq(trips.ownerId, userId)))
    .limit(1);
  if (!trip) throw new Error("Only the trip owner can do that.");
}

function revalidateTrip(tripId: string) {
  revalidatePath("/trips");
  revalidatePath(`/trips/${tripId}`);
}

function optionalValue(value?: string) {
  return value?.trim() || null;
}

export async function createTrip(input: unknown) {
  const viewer = await requireViewer();
  const data = createTripSchema.parse(input);
  const db = getDatabase();
  if (!db) return { id: "lisbon-weekender", demo: true };
  const [trip] = await db
    .insert(trips)
    .values({ ...data, ownerId: viewer.id })
    .returning({ id: trips.id });
  try {
    await db.insert(tripMembers).values({
      tripId: trip.id,
      userId: viewer.id,
      role: "owner",
      displayName: viewer.name?.trim() || "Traveller",
      image: viewer.image || null,
    });
    await db.insert(tripCities).values({
      tripId: trip.id,
      name: data.destination.split(",")[0]?.trim() || data.destination,
      country: countryFromDestination(data.destination),
      startDate: data.startDate,
      endDate: data.endDate,
      sortOrder: 0,
    });
  } catch (error) {
    await db.delete(trips).where(eq(trips.id, trip.id));
    throw error;
  }
  revalidatePath("/trips");
  return { id: trip.id, demo: false };
}

export async function addPlace(input: unknown) {
  const viewer = await requireViewer();
  const data = addPlaceSchema.parse(input);
  const db = getDatabase();
  if (!db) return { demo: true };
  await requireEditor(data.tripId, viewer.id);
  const [order] = await db
    .select({ next: sql<number>`coalesce(max(${tripPlaces.sortOrder}), -1) + 1` })
    .from(tripPlaces)
    .where(eq(tripPlaces.tripId, data.tripId));
  try {
    const [saved] = await db
      .insert(tripPlaces)
      .values({
        tripId: data.tripId,
        cityId: optionalValue(data.cityId),
        fsqPlaceId: data.fsqPlaceId,
        name: data.name,
        address: data.address,
        neighborhood: data.neighborhood,
        longitude: data.longitude,
        latitude: data.latitude,
        category: data.category,
        note: data.note,
        sourceUrl: data.sourceUrl || null,
        saved: data.saved,
        sortOrder: Number(order?.next ?? 0),
        addedBy: viewer.id,
      })
      .returning({ id: tripPlaces.id });
    revalidateTrip(data.tripId);
    return { demo: false, id: saved.id };
  } catch (error) {
    const message = error instanceof Error ? `${error.message} ${error.cause ?? ""}` : String(error);
    if (message.includes("trip_places_provider_unique") || message.includes("duplicate key")) {
      throw new Error("That place is already on this trip.");
    }
    throw error;
  }
}

export async function updatePlace(input: unknown) {
  const viewer = await requireViewer();
  const data = updatePlaceSchema.parse(input);
  const db = getDatabase();
  if (!db) return { demo: true };
  await requireEditor(data.tripId, viewer.id);
  const [updated] = await db
    .update(tripPlaces)
    .set({ saved: data.saved })
    .where(and(eq(tripPlaces.id, data.placeId), eq(tripPlaces.tripId, data.tripId)))
    .returning({ id: tripPlaces.id });
  if (!updated) throw new Error("This place could not be updated.");
  revalidateTrip(data.tripId);
  return { demo: false };
}

export async function updatePlacePlanning(input: unknown) {
  const viewer = await requireViewer();
  const data = updatePlacePlanningSchema.parse(input);
  const db = getDatabase();
  if (!db) return { demo: true };
  await requireEditor(data.tripId, viewer.id);
  const plannedDate = optionalValue(data.plannedDate);
  const [updated] = await db
    .update(tripPlaces)
    .set({
      cityId: plannedDate ? optionalValue(data.cityId) : null,
      plannedDate,
      daySortOrder: data.daySortOrder ?? 0,
    })
    .where(and(eq(tripPlaces.id, data.placeId), eq(tripPlaces.tripId, data.tripId)))
    .returning({ id: tripPlaces.id });
  if (!updated) throw new Error("This place could not be updated.");
  revalidateTrip(data.tripId);
  return { demo: false };
}

export async function removePlace(input: unknown) {
  const viewer = await requireViewer();
  const data = removePlaceSchema.parse(input);
  const db = getDatabase();
  if (!db) return { demo: true };
  await requireEditor(data.tripId, viewer.id);
  await db.delete(tripPlaces).where(and(eq(tripPlaces.id, data.placeId), eq(tripPlaces.tripId, data.tripId)));
  revalidateTrip(data.tripId);
  return { demo: false };
}

export async function addTripCity(input: unknown) {
  const viewer = await requireViewer();
  const data = addTripCitySchema.parse(input);
  const db = getDatabase();
  if (!db) return { demo: true };
  await requireEditor(data.tripId, viewer.id);
  const [order] = await db
    .select({ next: sql<number>`coalesce(max(${tripCities.sortOrder}), -1) + 1` })
    .from(tripCities)
    .where(eq(tripCities.tripId, data.tripId));
  const [city] = await db
    .insert(tripCities)
    .values({
      tripId: data.tripId,
      name: data.name,
      country: data.country,
      startDate: optionalValue(data.startDate),
      endDate: optionalValue(data.endDate),
      sortOrder: Number(order?.next ?? 0),
    })
    .returning({ id: tripCities.id });
  revalidateTrip(data.tripId);
  return { demo: false, id: city.id };
}

export async function updateTripCity(input: unknown) {
  const viewer = await requireViewer();
  const data = updateTripCitySchema.parse(input);
  const db = getDatabase();
  if (!db) return { demo: true };
  await requireEditor(data.tripId, viewer.id);
  const [updated] = await db
    .update(tripCities)
    .set({
      name: data.name,
      country: data.country,
      startDate: optionalValue(data.startDate),
      endDate: optionalValue(data.endDate),
      updatedAt: new Date(),
    })
    .where(and(eq(tripCities.id, data.cityId), eq(tripCities.tripId, data.tripId)))
    .returning({ id: tripCities.id });
  if (!updated) throw new Error("This city could not be updated.");
  revalidateTrip(data.tripId);
  return { demo: false };
}

export async function removeTripCity(input: unknown) {
  const viewer = await requireViewer();
  const data = removeTripCitySchema.parse(input);
  const db = getDatabase();
  if (!db) return { demo: true };
  await requireEditor(data.tripId, viewer.id);
  await db
    .update(tripPlaces)
    .set({ cityId: null, plannedDate: null, daySortOrder: 0 })
    .where(and(eq(tripPlaces.tripId, data.tripId), eq(tripPlaces.cityId, data.cityId)));
  await db
    .update(tripDayNotes)
    .set({ cityId: null, updatedAt: new Date() })
    .where(and(eq(tripDayNotes.tripId, data.tripId), eq(tripDayNotes.cityId, data.cityId)));
  await db.delete(tripCities).where(and(eq(tripCities.id, data.cityId), eq(tripCities.tripId, data.tripId)));
  revalidateTrip(data.tripId);
  return { demo: false };
}

export async function addDayNote(input: unknown) {
  const viewer = await requireViewer();
  const data = addDayNoteSchema.parse(input);
  const db = getDatabase();
  if (!db) return { demo: true };
  await requireEditor(data.tripId, viewer.id);
  const [order] = await db
    .select({ next: sql<number>`coalesce(max(${tripDayNotes.sortOrder}), -1) + 1` })
    .from(tripDayNotes)
    .where(and(eq(tripDayNotes.tripId, data.tripId), eq(tripDayNotes.plannedDate, data.plannedDate)));
  const [note] = await db
    .insert(tripDayNotes)
    .values({
      tripId: data.tripId,
      cityId: optionalValue(data.cityId),
      plannedDate: data.plannedDate,
      note: data.note,
      sortOrder: Number(order?.next ?? 0),
      addedBy: viewer.id,
    })
    .returning({ id: tripDayNotes.id });
  revalidateTrip(data.tripId);
  return { demo: false, id: note.id };
}

export async function updateDayNote(input: unknown) {
  const viewer = await requireViewer();
  const data = updateDayNoteSchema.parse(input);
  const db = getDatabase();
  if (!db) return { demo: true };
  await requireEditor(data.tripId, viewer.id);
  const [updated] = await db
    .update(tripDayNotes)
    .set({
      cityId: optionalValue(data.cityId),
      plannedDate: data.plannedDate,
      note: data.note,
      updatedAt: new Date(),
    })
    .where(and(eq(tripDayNotes.id, data.noteId), eq(tripDayNotes.tripId, data.tripId)))
    .returning({ id: tripDayNotes.id });
  if (!updated) throw new Error("This note could not be updated.");
  revalidateTrip(data.tripId);
  return { demo: false };
}

export async function removeDayNote(input: unknown) {
  const viewer = await requireViewer();
  const data = removeDayNoteSchema.parse(input);
  const db = getDatabase();
  if (!db) return { demo: true };
  await requireEditor(data.tripId, viewer.id);
  await db.delete(tripDayNotes).where(and(eq(tripDayNotes.id, data.noteId), eq(tripDayNotes.tripId, data.tripId)));
  revalidateTrip(data.tripId);
  return { demo: false };
}

export async function inviteCollaborator(input: unknown) {
  const viewer = await requireViewer();
  const data = inviteSchema.parse(input);
  const db = getDatabase();
  if (!db) return { inviteUrl: "/invite/demo-lisbon-board", demo: true };
  await requireOwner(data.tripId, viewer.id);
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await db.insert(tripInvitations).values({
    tripId: data.tripId,
    email: data.email,
    tokenHash,
    invitedBy: viewer.id,
    expiresAt,
  });
  return { inviteUrl: `/invite/${token}`, demo: false };
}

export async function acceptInvitation(rawToken: string) {
  const viewer = await requireViewer();
  const db = getDatabase();
  if (!db) return { tripId: "lisbon-weekender", demo: true };
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const [invitation] = await db
    .select()
    .from(tripInvitations)
    .where(and(eq(tripInvitations.tokenHash, tokenHash), isNull(tripInvitations.acceptedAt)))
    .limit(1);
  if (!invitation || invitation.expiresAt.getTime() < Date.now()) throw new Error("This invitation has expired.");
  if (!viewer.email || viewer.email.toLowerCase() !== invitation.email.toLowerCase()) {
    throw new Error("Sign in with the email address that received this invitation.");
  }
  await db
    .insert(tripMembers)
    .values({
      tripId: invitation.tripId,
      userId: viewer.id,
      role: "editor",
      displayName: viewer.name?.trim() || "Traveller",
      image: viewer.image || null,
    })
    .onConflictDoNothing();
  await db.update(tripInvitations).set({ acceptedAt: new Date() }).where(eq(tripInvitations.id, invitation.id));
  revalidatePath(`/trips/${invitation.tripId}`);
  return { tripId: invitation.tripId, demo: false };
}

export async function updateTrip(input: unknown) {
  const viewer = await requireViewer();
  const data = updateTripSchema.parse(input);
  const db = getDatabase();
  if (!db) return { demo: true };
  await requireEditor(data.tripId, viewer.id);
  const { tripId, ...details } = data;
  const [updated] = await db
    .update(trips)
    .set({ ...details, updatedAt: new Date() })
    .where(eq(trips.id, tripId))
    .returning({ id: trips.id });
  if (!updated) throw new Error("This trip could not be updated.");
  revalidatePath("/trips");
  revalidatePath(`/trips/${tripId}`);
  return { demo: false };
}
