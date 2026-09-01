import { describe, expect, it } from "vitest";
import { accountNameSchema, addPlaceSchema, createTripSchema, directionsSchema, signInSchema, signUpSchema, updateTripSchema } from "@/lib/validators";

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

  it("rejects a place save without a name or coordinates", () => {
    const result = addPlaceSchema.safeParse({ tripId: "210e9464-8cad-406b-96a0-b1463ce0eace", fsqPlaceId: "fsq-1", category: "Eat" });
    expect(result.success).toBe(false);
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
