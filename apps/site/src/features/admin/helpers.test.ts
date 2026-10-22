import { describe, expect, it } from "vitest";

import { linkedInComposeUrl, localInputToIso } from "../../routes/admin/publication";
import { normalizeTag } from "./articles/SettingsPanel";
import { validateFile } from "./media";

describe("admin helpers", () => {
  it("validates files before uploading", () => {
    expect(validateFile(new File(["x"], "a.png", { type: "image/png" }))).toBeNull();
    expect(validateFile(new File(["<svg/>"], "a.svg", { type: "image/svg+xml" }))).toMatch(/JPEG, PNG/);
    expect(validateFile(new File([new Uint8Array(11 * 1024 * 1024)], "big.jpg", { type: "image/jpeg" }))).toMatch(/10 MB/);
    expect(validateFile(new File([], "empty.png", { type: "image/png" }))).toMatch(/vazio/);
  });

  it("normalizes tags like the API", () => {
    expect(normalizeTag(" Event Driven ")).toBe("event-driven");
    expect(normalizeTag("Infra/Ação")).toBe("infra-acao");
  });

  it("converts the schedule input to UTC", () => {
    const iso = localInputToIso("2026-11-01T09:30");
    expect(iso).toBe(new Date("2026-11-01T09:30").toISOString());
    expect(localInputToIso("not a date")).toBeNull();
  });

  it("pre-fills LinkedIn's composer with the post text", () => {
    expect(linkedInComposeUrl("Olá & #aws")).toBe("https://www.linkedin.com/feed/?shareActive=true&text=Ol%C3%A1%20%26%20%23aws");
  });
});
