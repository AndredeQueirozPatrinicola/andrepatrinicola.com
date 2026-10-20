import { describe, expect, it } from "vitest";

import { format, formatYearMonth, hudNumber } from "./format";

describe("format helpers", () => {
  it("fills placeholders and keeps unknown ones", () => {
    expect(format("{n} games, {x}", { n: 3 })).toBe("3 games, {x}");
  });

  it("pads HUD numbers", () => {
    expect(hudNumber(4)).toBe("04");
    expect(hudNumber(12)).toBe("12");
  });

  it("formats year-month values per locale", () => {
    expect(formatYearMonth("2024-05", "en")).toBe("May 2024");
    expect(formatYearMonth("2023-06", "es")).toMatch(/jun.*2023/);
  });
});
