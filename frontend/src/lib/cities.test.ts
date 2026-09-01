import { describe, expect, it } from "vitest";
import { filterDemoCities, formatCityLabel } from "@/lib/cities";

describe("city labels", () => {
  it("stores a city with its country", () => {
    expect(formatCityLabel({ name: "Lisbon", country: "Portugal" })).toBe("Lisbon, Portugal");
  });

  it("falls back to the region when there is no country", () => {
    expect(formatCityLabel({ name: "Kyoto", region: "Kyoto Prefecture" })).toBe("Kyoto, Kyoto Prefecture");
  });

  it("filters demo cities as the traveller types", () => {
    expect(filterDemoCities("kyo").map((city) => city.label)).toEqual(["Kyoto, Japan"]);
  });
});
