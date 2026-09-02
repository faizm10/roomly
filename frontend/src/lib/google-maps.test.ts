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
      kind: "city",
    });
  });

  it("keeps a country as its own destination", () => {
    expect(
      cityFromGooglePrediction(
        {
          placeId: "ChIJcountry",
          types: ["country", "political"],
          structuredFormat: {
            mainText: { text: "South Korea" },
          },
        },
        "country",
      ),
    ).toEqual({
      id: "ChIJcountry",
      name: "South Korea",
      label: "South Korea",
      region: undefined,
      country: "South Korea",
      kind: "country",
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

  it("rejects administrative bounds that are too broad for a city map", () => {
    expect(
      viewportToBbox({
        southwest: { lat: 20.4231216, lng: 136.0696826 },
        northeast: { lat: 35.8984074, lng: 153.9867945 },
      }),
    ).toBeUndefined();
  });
});
