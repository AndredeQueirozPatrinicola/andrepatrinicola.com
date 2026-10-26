import { describe, expect, it } from "vitest";

import { createHistory, HISTORY_LIMIT, historyReducer, type History, type HistoryAction } from "./history";

const run = (actions: HistoryAction<number>[], start = createHistory(0)): History<number> => actions.reduce(historyReducer, start);
const set = (value: number) => () => value;

describe("historyReducer", () => {
  it("undoes and redoes commits", () => {
    let state = run([
      { type: "commit", update: set(1) },
      { type: "commit", update: set(2) },
    ]);
    state = historyReducer(state, { type: "undo" });
    expect(state.present).toBe(1);
    state = historyReducer(state, { type: "undo" });
    expect(state.present).toBe(0);
    state = historyReducer(state, { type: "redo" });
    expect(state.present).toBe(1);
    expect(state.future).toEqual([2]);
  });

  it("drops the redo stack on a new edit", () => {
    const state = run([{ type: "commit", update: set(1) }, { type: "undo" }, { type: "commit", update: set(5) }]);
    expect(state.future).toEqual([]);
    expect(historyReducer(state, { type: "redo" })).toBe(state);
  });

  it("records a whole drag as one step", () => {
    const state = run([
      { type: "transient", update: set(1) },
      { type: "transient", update: set(2) },
      { type: "transient", update: set(3) },
      { type: "checkpoint" },
    ]);
    expect(state.past).toEqual([0]);
    expect(historyReducer(state, { type: "undo" }).present).toBe(0);
  });

  it("records a drag followed by a commit (reparenting on drop) as one step", () => {
    const state = run([
      { type: "transient", update: set(1) },
      { type: "commit", update: set(10) },
    ]);
    expect(state.past).toEqual([0]);
    expect(state.present).toBe(10);
  });

  it("merges consecutive commits with the same key (typing a label)", () => {
    const state = run([
      { type: "commit", update: set(1), key: "label:a" },
      { type: "commit", update: set(2), key: "label:a" },
      { type: "commit", update: set(3), key: "label:a" },
      { type: "commit", update: set(4), key: "label:b" },
    ]);
    expect(state.past).toEqual([0, 3]);
  });

  it("does not record selection or measurements", () => {
    const state = run([{ type: "silent", update: set(7) }]);
    expect(state.present).toBe(7);
    expect(state.past).toEqual([]);
    expect(state.revision).toBe(0);
  });

  it("counts content revisions for autosave", () => {
    const state = run([{ type: "commit", update: set(1) }, { type: "transient", update: set(2) }, { type: "undo" }]);
    expect(state.revision).toBe(3);
  });

  it("ignores commits that change nothing", () => {
    const start = createHistory(0);
    expect(historyReducer(start, { type: "commit", update: (value) => value })).toBe(start);
  });

  it("keeps a bounded history", () => {
    const actions = Array.from({ length: HISTORY_LIMIT + 20 }, (_, index): HistoryAction<number> => ({ type: "commit", update: set(index + 1) }));
    const state = run(actions);
    expect(state.past).toHaveLength(HISTORY_LIMIT);
    expect(state.past[0]).toBe(20);
  });

  it("resets", () => {
    const state = historyReducer(run([{ type: "commit", update: set(1) }]), { type: "reset", present: 9 });
    expect(state).toEqual(createHistory(9));
  });
});
