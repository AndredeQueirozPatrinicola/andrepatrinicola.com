/**
 * Undo/redo for the editor document.
 *
 * - `commit` records one editorial step (add, delete, connect, edit...).
 *   Consecutive commits with the same `key` merge into one step, so typing
 *   a label is a single undo, not one per keystroke.
 * - `transient` changes the document without recording a step yet (a drag or
 *   a resize in progress); the state before it is kept as `base` and the next
 *   commit or `checkpoint` records the whole gesture as one step.
 * - `silent` is for what is not an edit at all: selection and measurements.
 */
export const HISTORY_LIMIT = 100;

export type History<T> = {
  past: T[];
  present: T;
  future: T[];
  /** Present before the transient changes not yet recorded. */
  base: T | null;
  lastKey: string | null;
  /** Increases on every content change (not on silent ones): drives autosave. */
  revision: number;
};

type Updater<T> = (current: T) => T;

export type HistoryAction<T> =
  | { type: "silent"; update: Updater<T> }
  | { type: "transient"; update: Updater<T> }
  | { type: "commit"; update: Updater<T>; key?: string }
  | { type: "checkpoint" }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "reset"; present: T };

export function createHistory<T>(present: T): History<T> {
  return { past: [], present, future: [], base: null, lastKey: null, revision: 0 };
}

const capped = <T>(entries: T[]) => (entries.length > HISTORY_LIMIT ? entries.slice(entries.length - HISTORY_LIMIT) : entries);

export function historyReducer<T>(state: History<T>, action: HistoryAction<T>): History<T> {
  switch (action.type) {
    case "silent": {
      const present = action.update(state.present);
      return present === state.present ? state : { ...state, present };
    }
    case "transient": {
      const present = action.update(state.present);
      if (present === state.present) return state;
      return { ...state, present, base: state.base ?? state.present, revision: state.revision + 1 };
    }
    case "commit": {
      const present = action.update(state.present);
      if (present === state.present && state.base === null) return state;
      const mergeable = action.key !== undefined && action.key === state.lastKey && state.base === null;
      return {
        past: mergeable ? state.past : capped([...state.past, state.base ?? state.present]),
        present,
        future: [],
        base: null,
        lastKey: action.key ?? null,
        revision: state.revision + 1,
      };
    }
    case "checkpoint": {
      if (state.base === null) return state;
      return { ...state, past: capped([...state.past, state.base]), future: [], base: null, lastKey: null };
    }
    case "undo": {
      if (state.base !== null) {
        // Undoing in the middle of a gesture drops the gesture.
        return { ...state, present: state.base, base: null, lastKey: null, revision: state.revision + 1 };
      }
      const previous = state.past.at(-1);
      if (previous === undefined) return state;
      return {
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future],
        base: null,
        lastKey: null,
        revision: state.revision + 1,
      };
    }
    case "redo": {
      const [next, ...future] = state.future;
      if (next === undefined || state.base !== null) return state;
      return {
        past: capped([...state.past, state.present]),
        present: next,
        future,
        base: null,
        lastKey: null,
        revision: state.revision + 1,
      };
    }
    case "reset":
      return createHistory(action.present);
  }
}
