"use server";

import { createHash, randomBytes } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { tripInvitations, tripMembers, tripPlaces, trips } from "@/lib/db/schema";
import { addPlaceSchema, createTripSchema, inviteSchema } from "@/lib/validators";

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
    await db.insert(tripMembers).values({ tripId: trip.id, userId: viewer.id, role: "owner" });
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
  await db.insert(tripPlaces).values({
    tripId: data.tripId,
    fsqPlaceId: data.fsqPlaceId,
    category: data.category,
    note: data.note,
    sourceUrl: data.sourceUrl || null,
    addedBy: viewer.id,
  });
  revalidatePath(`/trips/${data.tripId}`);
  return { demo: false };
}

export async function removePlace(input: { tripId: string; placeId: string }) {
  const viewer = await requireViewer();
  const db = getDatabase();
  if (!db) return { demo: true };
  await requireEditor(input.tripId, viewer.id);
  await db.delete(tripPlaces).where(and(eq(tripPlaces.id, input.placeId), eq(tripPlaces.tripId, input.tripId)));
  revalidatePath(`/trips/${input.tripId}`);
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
    .values({ tripId: invitation.tripId, userId: viewer.id, role: "editor" })
    .onConflictDoNothing();
  await db.update(tripInvitations).set({ acceptedAt: new Date() }).where(eq(tripInvitations.id, invitation.id));
  revalidatePath(`/trips/${invitation.tripId}`);
  return { tripId: invitation.tripId, demo: false };
}
