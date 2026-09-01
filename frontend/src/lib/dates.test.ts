import { describe, expect, it } from "vitest";
import { countryFromDestination, formatDateLabel } from "@/lib/dates";

describe("trip dates", () => {
  it("collapses days in the same month", () => {
    expect(formatDateLabel("2026-09-18", "2026-09-22")).toBe("SEP 18—22");
  });

  it("keeps both months when the trip crosses them", () => {
    expect(formatDateLabel("2026-09-28", "2026-10-02")).toBe("SEP 28—OCT 2");
  });
});

describe("destination country", () => {
  it("reads the country from a stored city label", () => {
    expect(countryFromDestination("Lisbon, Portugal")).toBe("Portugal");
  });
});
