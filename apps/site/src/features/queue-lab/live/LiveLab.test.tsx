import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "../../admin/api";
import type * as AdminApi from "../../admin/api";
import { fromRun } from "./fromRun";
import { LiveLab, POLL_MS } from "./LiveLab";
import type { QueueLabOverview, QueueRun } from "./types";

const api = {
  labs: {
    queue: vi.fn<() => Promise<QueueLabOverview>>(),
    startRun: vi.fn(),
    run: vi.fn<(runId: string) => Promise<QueueRun>>(),
  },
};

vi.mock("../../admin/api", async (original) => ({
  ...(await original<typeof AdminApi>()),
  useStudioApi: () => api,
}));

const overview = (overrides: Partial<QueueLabOverview> = {}): QueueLabOverview => ({
  enabled: true,
  consumerState: "Enabled",
  limits: { maxMessages: 10, runsPerDay: 20, maxReceives: 3, scenarios: ["happy-path", "transient-failure", "poison-message", "duplicate-delivery", "mixed"] },
  usage: { runsToday: 0 },
  activeRunId: null,
  deadLetterQueue: { visible: 0, inFlight: 0 },
  recentRuns: [],
  ...overrides,
});

const RUN_ID = "11111111-2222-4333-8444-555555555555";

function run(status: QueueRun["status"], messages: QueueRun["messages"] = []): QueueRun {
  return {
    runId: RUN_ID,
    status,
    scenario: "poison-message",
    requestedMessages: messages.length,
    acceptedMessages: messages.length,
    duplicatesSent: 0,
    maxReceives: 3,
    createdAt: "2026-10-25T12:00:00.000Z",
    deadline: "2026-10-25T12:10:00.000Z",
    finishedAt: status === "running" ? null : "2026-10-25T12:01:00.000Z",
    counts: { queued: 0, processing: 0, retrying: 0, awaitingDlq: 0, dlq: 0, processed: 0, sendFailed: 0, failedAttempts: 0, deliveries: 0, duplicatesSkipped: 0 },
    messages,
    events: [],
  };
}

const message = (messageId: string, status: QueueRun["messages"][number]["status"], extra: Partial<QueueRun["messages"][number]> = {}) => ({
  messageId,
  scenario: "success" as const,
  status,
  receives: 1,
  deliveries: 1,
  effects: 0,
  updatedAt: "2026-10-25T12:00:00.000Z",
  ...extra,
});

function renderLab() {
  return render(
    <MemoryRouter>
      <LiveLab />
    </MemoryRouter>,
  );
}

async function flush() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: false, media: query, addEventListener: () => undefined, removeEventListener: () => undefined }));
  api.labs.queue.mockReset().mockResolvedValue(overview());
  api.labs.startRun.mockReset();
  api.labs.run.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("fromRun", () => {
  it("puts each real message where its recorded state says", () => {
    const model = fromRun(
      run("running", [
        message("m01", "processing"),
        message("m02", "processing"),
        message("m03", "processing"),
        message("m04", "retrying", { receives: 2 }),
        message("m05", "dlq", { scenario: "poison", receives: 3 }),
        message("m06", "send-failed", { receives: 0 }),
      ]),
    );
    expect(model.consumers).toBe(2);
    expect(model.tokens.map((token) => [token.label, token.node, token.consumer, token.tone])).toEqual([
      ["01", "consumer", 0, "default"],
      ["02", "consumer", 1, "default"],
      ["03", "consumer", 0, "default"],
      ["04", "hidden", undefined, "retry"],
      ["05", "dlq", undefined, "poison"],
      ["06", "producer", undefined, "stale"],
    ]);
  });
});

describe("LiveLab", () => {
  it("polls a started run every 2 s and stops when it ends", async () => {
    api.labs.startRun.mockResolvedValue({ runId: RUN_ID, status: "queued", acceptedMessages: 2, duplicatesSent: 0 });
    api.labs.run
      .mockResolvedValueOnce(run("running", [message("m01", "processing"), message("m02", "queued")]))
      .mockResolvedValueOnce(run("running", [message("m01", "processed"), message("m02", "processing")]))
      .mockResolvedValue(run("completed", [message("m01", "processed"), message("m02", "processed")]));
    renderLab();
    await flush();

    fireEvent.change(screen.getByLabelText("Mensagens (1 a 10)"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Executar na AWS" }));
    await flush();
    expect(api.labs.startRun).toHaveBeenCalledWith({ messageCount: 2, failureScenario: "poison-message" });
    expect(api.labs.run).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Em andamento")).toBeInTheDocument();

    await act(async () => vi.advanceTimersByTimeAsync(POLL_MS));
    expect(api.labs.run).toHaveBeenCalledTimes(2);
    await act(async () => vi.advanceTimersByTimeAsync(POLL_MS));
    expect(api.labs.run).toHaveBeenCalledTimes(3);
    expect(screen.getByText("Concluída")).toBeInTheDocument();

    await act(async () => vi.advanceTimersByTimeAsync(POLL_MS * 5));
    expect(api.labs.run).toHaveBeenCalledTimes(3);
    // The overview is reloaded at the start and at the end (usage, DLQ depth).
    expect(api.labs.queue.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it("does not poll while the tab is hidden, and catches up when it is shown", async () => {
    api.labs.queue.mockResolvedValue(overview({ activeRunId: RUN_ID }));
    api.labs.run.mockResolvedValue(run("running", [message("m01", "queued")]));
    let visibility: DocumentVisibilityState = "visible";
    vi.spyOn(document, "visibilityState", "get").mockImplementation(() => visibility);
    renderLab();
    await flush();
    expect(api.labs.run).toHaveBeenCalledTimes(1);

    visibility = "hidden";
    await act(async () => vi.advanceTimersByTimeAsync(POLL_MS * 10));
    expect(api.labs.run).toHaveBeenCalledTimes(1);

    visibility = "visible";
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(api.labs.run).toHaveBeenCalledTimes(2);
  });

  it("stops polling a run that does not exist", async () => {
    api.labs.queue.mockResolvedValue(overview({ activeRunId: RUN_ID }));
    api.labs.run.mockRejectedValue(new ApiError(404, "not_found"));
    renderLab();
    await flush();
    await act(async () => vi.advanceTimersByTimeAsync(POLL_MS * 10));
    expect(api.labs.run).toHaveBeenCalledTimes(1);
  });

  it("never polls without a run", async () => {
    renderLab();
    await act(async () => vi.advanceTimersByTimeAsync(POLL_MS * 10));
    expect(api.labs.run).not.toHaveBeenCalled();
  });

  it("disables the button and explains when the lab or the consumer is off", async () => {
    api.labs.queue.mockResolvedValue(overview({ consumerState: "Disabled" }));
    renderLab();
    await flush();
    expect(screen.getByRole("button", { name: "Executar na AWS" })).toBeDisabled();
    expect(screen.getByText(/queue_lab_enabled = true/)).toBeInTheDocument();
  });

  it("disables the button once the daily limit is used", async () => {
    api.labs.queue.mockResolvedValue(overview({ usage: { runsToday: 20 } }));
    renderLab();
    await flush();
    expect(screen.getByRole("button", { name: "Executar na AWS" })).toBeDisabled();
  });

  it.each([
    [new ApiError(429, "daily_limit", { limit: 20 }), /Limite diário de 20 execuções/],
    [new ApiError(503, "disabled", { reason: "consumer_disabled", consumerState: "Disabled" }), /consumer está desligado/],
    [new ApiError(503, "disabled", { reason: "lab_disabled" }), /AWS Live Mode está desligado/],
  ])("explains a refused run (%s)", async (error, message) => {
    api.labs.startRun.mockRejectedValue(error);
    renderLab();
    await flush();
    fireEvent.click(screen.getByRole("button", { name: "Executar na AWS" }));
    await flush();
    expect(screen.getByRole("alert")).toHaveTextContent(message);
  });

  it("shows the open run when the API says one is in progress", async () => {
    api.labs.startRun.mockRejectedValue(new ApiError(409, "run_in_progress", { activeRunId: RUN_ID }));
    api.labs.run.mockResolvedValue(run("completed", [message("m01", "processed")]));
    renderLab();
    await flush();
    fireEvent.click(screen.getByRole("button", { name: "Executar na AWS" }));
    await flush();
    expect(api.labs.run).toHaveBeenCalledWith(RUN_ID, expect.any(AbortSignal));
    expect(screen.getByText("Concluída")).toBeInTheDocument();
  });
});
