import { describe, expect, it } from "vitest";
import { categoryFromGoogleTypes, cityFromGooglePrediction, viewportToBbox } from "@/lib/google-maps";

describe("google city predictions", () => {
  it("builds a stored destination from Google's main and secondary text", () => {
    expect(
      cityFromGooglePrediction({
        placeId: "ChIJ",
        structuredFormat: {
          mainText: { text: "Lisbon" },
          secondaryText: { text: "Portugal" },
        },
      }),
    ).toEqual({
      id: "ChIJ",
      name: "Lisbon",
      label: "Lisbon, Portugal",
      region: undefined,
      country: "Portugal",
    });
  });
});

describe("google place categories", () => {
  it("treats cafes as drink even when they are also food", () => {
    expect(categoryFromGoogleTypes(["cafe", "food", "point_of_interest"], "cafe")).toBe("Drink");
  });

  it("maps tourist attractions to see", () => {
    expect(categoryFromGoogleTypes(["tourist_attraction", "point_of_interest"], "tourist_attraction")).toBe("See");
  });
});

describe("google viewports", () => {
  it("converts a geocoding viewport into a map bbox", () => {
    expect(
      viewportToBbox({
        southwest: { lat: 38.6, lng: -9.3 },
        northeast: { lat: 38.8, lng: -9.0 },
      }),
    ).toEqual([-9.3, 38.6, -9.0, 38.8]);
  });
});
