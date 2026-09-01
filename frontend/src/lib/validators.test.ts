import { describe, expect, it } from "vitest";
import { addPlaceSchema, createTripSchema, directionsSchema, signInSchema, signUpSchema } from "@/lib/validators";

describe("trip validation", () => {
  it("rejects a trip whose return is before departure", () => {
    const result = createTripSchema.safeParse({ title: "A trip", destination: "Lisbon", startDate: "2026-09-18", endDate: "2026-09-12" });
    expect(result.success).toBe(false);
  });

  it("accepts user-authored place fields without a provider snapshot", () => {
    const result = addPlaceSchema.safeParse({ tripId: "trip-1", fsqPlaceId: "fsq-1", category: "Eat", note: "Lunch", sourceUrl: "https://example.com/post" });
    expect(result.success).toBe(true);
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
});
