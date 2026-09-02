import { describe, expect, it } from "vitest";
import {
  accountNameSchema,
  addDayNoteSchema,
  addPlaceSchema,
  addTripCitySchema,
  createEmailInviteSchema,
  createShareInviteSchema,
  createTripSchema,
  directionsSchema,
  inviteTokenSchema,
  revokeInviteSchema,
  signInSchema,
  signUpSchema,
  updatePlacePlanningSchema,
  updateTripSchema,
} from "@/lib/validators";

describe("trip validation", () => {
  it("rejects a trip whose return is before departure", () => {
    const result = createTripSchema.safeParse({ title: "A trip", destination: "Lisbon", startDate: "2026-09-18", endDate: "2026-09-12" });
    expect(result.success).toBe(false);
  });

  it("requires a trip id to update logistics", () => {
    const result = updateTripSchema.safeParse({
      title: "A trip",
      destination: "Lisbon, Portugal",
      startDate: "2026-09-18",
      endDate: "2026-09-22",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a saved place snapshot with coordinates", () => {
    const result = addPlaceSchema.safeParse({
      tripId: "210e9464-8cad-406b-96a0-b1463ce0eace",
      fsqPlaceId: "fsq-1",
      name: "Prado",
      address: "R. das Pedras Negras 2",
      neighborhood: "Baixa",
      longitude: -9.1349,
      latitude: 38.7107,
      category: "Eat",
      note: "Lunch",
      sourceUrl: "https://example.com/post",
    });
    expect(result.success).toBe(true);
  });

  it("accepts an optional planned day when saving a place", () => {
    const result = addPlaceSchema.safeParse({
      tripId: "210e9464-8cad-406b-96a0-b1463ce0eace",
      cityId: "83cb9471-a356-4a42-a13f-23c6fb93bb0d",
      fsqPlaceId: "fsq-2",
      name: "Shinjuku Gyoen National Garden",
      address: "11 Naitomachi, Shinjuku City",
      neighborhood: "Shinjuku",
      longitude: 139.7101,
      latitude: 35.6852,
      category: "See",
      plannedDate: "2026-09-24",
      daySortOrder: 2,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a place save without a name or coordinates", () => {
    const result = addPlaceSchema.safeParse({ tripId: "210e9464-8cad-406b-96a0-b1463ce0eace", fsqPlaceId: "fsq-1", category: "Eat" });
    expect(result.success).toBe(false);
  });

  it("accepts a city stop with an optional date range", () => {
    const result = addTripCitySchema.safeParse({
      tripId: "210e9464-8cad-406b-96a0-b1463ce0eace",
      name: "Porto",
      country: "Portugal",
      startDate: "2026-09-20",
      endDate: "2026-09-22",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a city stop whose end is before its start", () => {
    const result = addTripCitySchema.safeParse({
      tripId: "210e9464-8cad-406b-96a0-b1463ce0eace",
      name: "Porto",
      startDate: "2026-09-22",
      endDate: "2026-09-20",
    });
    expect(result.success).toBe(false);
  });

  it("accepts assigning a place to a planned day and city", () => {
    const result = updatePlacePlanningSchema.safeParse({
      tripId: "210e9464-8cad-406b-96a0-b1463ce0eace",
      placeId: "83cb9471-a356-4a42-a13f-23c6fb93bb0c",
      cityId: "83cb9471-a356-4a42-a13f-23c6fb93bb0d",
      plannedDate: "2026-09-20",
      daySortOrder: 1,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a day note with a planned date", () => {
    const result = addDayNoteSchema.safeParse({
      tripId: "210e9464-8cad-406b-96a0-b1463ce0eace",
      plannedDate: "2026-09-20",
      note: "Book the early train.",
    });
    expect(result.success).toBe(true);
  });

  it("accepts an email-bound trip invite", () => {
    const result = createEmailInviteSchema.safeParse({
      tripId: "210e9464-8cad-406b-96a0-b1463ce0eace",
      email: "FRIEND@EXAMPLE.COM",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("friend@example.com");
  });

  it("accepts a share invite request", () => {
    expect(createShareInviteSchema.safeParse({ tripId: "210e9464-8cad-406b-96a0-b1463ce0eace" }).success).toBe(true);
  });

  it("accepts a revoke invite request", () => {
    expect(
      revokeInviteSchema.safeParse({
        tripId: "210e9464-8cad-406b-96a0-b1463ce0eace",
        invitationId: "83cb9471-a356-4a42-a13f-23c6fb93bb0c",
      }).success,
    ).toBe(true);
  });

  it("rejects short invite tokens", () => {
    expect(inviteTokenSchema.safeParse("short").success).toBe(false);
  });

  it("caps directions requests at twelve stops", () => {
    const coordinates = Array.from({ length: 13 }, () => [-9.1, 38.7] as [number, number]);
    expect(directionsSchema.safeParse({ coordinates, mode: "walking" }).success).toBe(false);
  });
});

describe("auth validation", () => {
  it("rejects a sign-in without an email", () => {
    expect(signInSchema.safeParse({ email: "", password: "secret" }).success).toBe(false);
  });

  it("rejects a sign-up when the passwords do not match", () => {
    const result = signUpSchema.safeParse({
      name: "Faiz",
      email: "faiz@example.com",
      password: "longenough",
      confirmPassword: "different",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a complete sign-up", () => {
    const result = signUpSchema.safeParse({
      name: "Faiz",
      email: "faiz@example.com",
      password: "longenough",
      confirmPassword: "longenough",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an account name that is too short", () => {
    expect(accountNameSchema.safeParse({ name: "A" }).success).toBe(false);
  });
});
