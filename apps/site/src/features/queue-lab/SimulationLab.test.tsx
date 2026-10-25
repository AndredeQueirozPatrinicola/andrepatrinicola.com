import { act, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderLocalized } from "../../test/render";
import { computeLayout, placeTokens, capacity } from "./diagram/layout";
import { fromSimulation } from "./diagram/model";
import { fill, queueLabMessages } from "./messages";
import { createSimulation, limits, runToEnd, advanceTo } from "./simulation/engine";
import { presetIds, presets } from "./simulation/presets";
import { SimulationLab } from "./SimulationLab";
import { locales } from "../../i18n/config";

function renderLab(locale: "pt" | "en" | "es" = "en") {
  return renderLocalized(<SimulationLab text={queueLabMessages(locale)} />, { locale });
}

const metric = (name: string) => {
  const term = screen.getByText(name, { selector: "dt" });
  return term.nextElementSibling!.textContent;
};

describe("SimulationLab", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("starts on the happy path, idle, with nothing sent", () => {
    renderLab();
    expect(screen.getByRole("radio", { name: /Happy Path/ })).toBeChecked();
    expect(screen.getByRole("status")).toHaveTextContent("Ready to start.");
    expect(metric("Sent")).toBe("0");
    expect(screen.getByText(/A message only leaves the queue/)).toBeInTheDocument();
  });

  it("steps from one instant to the next and updates the metrics and the log", () => {
    renderLab();
    const next = screen.getByRole("button", { name: "Next event" });
    // t = 0: M01 is sent and, with idle consumers, received at once.
    fireEvent.click(next);
    expect(metric("Sent")).toBe("1");
    expect(screen.getByText("M01 sent to the queue")).toBeInTheDocument();
    expect(screen.getByText("Consumer 1 received M01 (receive 1)")).toBeInTheDocument();
    expect(metric("Processing")).toBe("1");
    fireEvent.click(next);
    expect(metric("Sent")).toBe("2");
    expect(metric("Processing")).toBe("2");
    expect(screen.getByRole("status")).toHaveTextContent(/Paused at/);
  });

  it("runs, pauses and resumes with the animation clock", () => {
    vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame", "performance"] });
    renderLab();
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    expect(screen.getByRole("status")).toHaveTextContent("Running.");
    act(() => vi.advanceTimersByTime(1000));
    const sentWhileRunning = Number(metric("Sent"));
    expect(sentWhileRunning).toBeGreaterThan(1);

    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    const elapsed = metric("Simulated time");
    act(() => vi.advanceTimersByTime(1000));
    expect(metric("Simulated time")).toBe(elapsed);

    fireEvent.click(screen.getByRole("button", { name: "Resume" }));
    act(() => vi.advanceTimersByTime(20_000));
    expect(screen.getByRole("status")).toHaveTextContent(/Finished at .*: 8 processed, 0 in the DLQ/);
    expect(screen.getByRole("button", { name: "Start" })).toBeDisabled();
  });

  it("speed changes how fast simulated time passes", () => {
    vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame", "performance"] });
    renderLab();
    fireEvent.click(within(screen.getByRole("group", { name: "Speed" })).getByLabelText("4×"));
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    act(() => vi.advanceTimersByTime(1000));
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    // Frames are capped at 100 ms of real time; 1 s at 4× ≈ 4 simulated seconds.
    expect(metric("Simulated time")).toMatch(/^[34]\.\d s$/);
  });

  it("reset goes back to the start of the same configuration", () => {
    renderLab();
    fireEvent.click(screen.getByRole("button", { name: "Next event" }));
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(metric("Sent")).toBe("0");
    expect(screen.getByRole("status")).toHaveTextContent("Ready to start.");
  });

  it("a preset applies its configuration and explanation", () => {
    renderLab();
    fireEvent.click(screen.getByRole("radio", { name: /High Concurrency/ }));
    expect(screen.getByRole("slider", { name: /Consumers/ })).toHaveValue("6");
    expect(screen.getByRole("slider", { name: /Messages/ })).toHaveValue("30");
    expect(screen.getByText(/Drop to one consumer/)).toBeInTheDocument();
  });

  it("changing a setting leaves the preset and resets the run", () => {
    renderLab();
    fireEvent.click(screen.getByRole("button", { name: "Next event" }));
    fireEvent.change(screen.getByRole("slider", { name: /Consumers/ }), { target: { value: "4" } });
    expect(screen.getByRole("radio", { name: /Happy Path/ })).not.toBeChecked();
    expect(screen.getByText("Custom configuration")).toBeInTheDocument();
    expect(metric("Sent")).toBe("0");
    expect(screen.getAllByText(/^Consumer [1-4]$/)).toHaveLength(4);
  });

  it("the idempotency switch changes the outcome of the duplicate preset", () => {
    vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame", "performance"] });
    renderLab();
    fireEvent.click(screen.getByRole("radio", { name: /Duplicate Delivery/ }));
    expect(screen.getByRole("checkbox", { name: "Idempotent consumer" })).not.toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    act(() => vi.advanceTimersByTime(30_000));
    expect(Number(metric("Duplicate effects"))).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("checkbox", { name: "Idempotent consumer" }));
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    act(() => vi.advanceTimersByTime(30_000));
    expect(metric("Duplicate effects")).toBe("0");
    expect(Number(metric("Duplicates skipped"))).toBeGreaterThan(0);
  });

  it("describes the diagram for screen readers and lists every message", () => {
    renderLab();
    const diagram = screen.getByRole("img", { name: /Message flow/ });
    expect(diagram).toHaveAccessibleName(expect.stringContaining("0 sent"));
    expect(screen.getAllByRole("row")).toHaveLength(1 + presets["happy-path"].messageCount);
  });

  it("is translated", () => {
    renderLab("pt");
    expect(screen.getByRole("button", { name: "Iniciar" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Pronta para iniciar.");
  });

  it("never calls the network", () => {
    vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame", "performance"] });
    renderLab();
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    act(() => vi.advanceTimersByTime(20_000));
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("texts", () => {
  it("every locale has a title and an explanation for each preset", () => {
    for (const locale of locales) {
      const text = queueLabMessages(locale);
      for (const id of presetIds) {
        expect(text.presets.items[id].title).toBeTruthy();
        expect(text.presets.items[id].observe).toBeTruthy();
      }
    }
  });

  it("fill replaces known placeholders only", () => {
    expect(fill("{id} by {consumer} {other}", { id: "M01", consumer: "Consumer 2" })).toBe("M01 by Consumer 2 {other}");
  });
});

describe("diagram layout", () => {
  it("places every message of the largest run inside its box, in both orientations", () => {
    for (const orientation of ["wide", "narrow"] as const) {
      const layout = computeLayout(orientation, limits.consumers.max);
      for (const node of ["producer", "processed"] as const) {
        const box = layout.boxes[node];
        const { columns, rows } = capacity({ ...box, width: box.width - 24, height: box.height - 38 });
        expect(columns * rows).toBeGreaterThanOrEqual(limits.messageCount.max);
      }
      const start = fromSimulation(createSimulation({ ...presets["high-concurrency"], messageCount: limits.messageCount.max }));
      const { tokens, overflow } = placeTokens(layout, start);
      expect(overflow).toEqual([]);
      for (const token of tokens) {
        expect(token.x).toBeGreaterThanOrEqual(0);
        expect(token.x).toBeLessThanOrEqual(layout.width);
        expect(token.y).toBeLessThanOrEqual(layout.height);
      }
    }
  });

  it("puts each message where its state says", () => {
    const end = fromSimulation(runToEnd(createSimulation(presets["poison-message"])));
    expect(end.tokens.filter((token) => token.node === "dlq")).toEqual([expect.objectContaining({ tone: "poison", attempt: 3 })]);
    expect(end.tokens.filter((token) => token.node === "processed")).toHaveLength(5);

    const running = fromSimulation(advanceTo(createSimulation(presets["happy-path"]), 300));
    expect(running.tokens.filter((token) => token.node === "consumer").map((token) => token.consumer).sort()).toEqual([0, 1]);
  });

  it("shows a second token for a delivery on an expired receipt handle", () => {
    let state = createSimulation(presets["slow-consumer"]);
    let found = false;
    for (let time = 0; time < 30_000 && !found; time += 100) {
      state = advanceTo(state, time);
      found = fromSimulation(state).tokens.some((token) => token.tone === "stale");
    }
    expect(found).toBe(true);
  });
});
