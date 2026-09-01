"use server";

import { createHash, randomBytes } from "node:crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { tripInvitations, tripMembers, tripPlaces, trips } from "@/lib/db/schema";
import { addPlaceSchema, createTripSchema, inviteSchema, removePlaceSchema, updatePlaceSchema, updateTripSchema } from "@/lib/validators";

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
    revalidatePath("/trips");
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
  return { demo: false };
}

export async function removePlace(input: unknown) {
  const viewer = await requireViewer();
  const data = removePlaceSchema.parse(input);
  const db = getDatabase();
  if (!db) return { demo: true };
  await requireEditor(data.tripId, viewer.id);
  await db.delete(tripPlaces).where(and(eq(tripPlaces.id, data.placeId), eq(tripPlaces.tripId, data.tripId)));
  revalidatePath("/trips");
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
