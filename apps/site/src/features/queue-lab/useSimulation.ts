import { useCallback, useEffect, useRef, useState } from "react";

import { advanceBy, createSimulation, step, type SimulationConfig, type SimulationState } from "./simulation/engine";

export type RunStatus = "idle" | "running" | "paused" | "finished";

export const speeds = [0.5, 1, 2, 4] as const;
export type Speed = (typeof speeds)[number];

/** Real time between two frames is capped, so a background tab does not jump ahead when it returns. */
const MAX_FRAME_MS = 100;

/**
 * Drives the pure simulation with requestAnimationFrame: each frame advances
 * simulated time by the real time elapsed × speed. Pausing just stops the
 * frames; the state is kept as it was.
 */
export function useSimulation(config: SimulationConfig) {
  const [state, setState] = useState<SimulationState>(() => createSimulation(config));
  const [status, setStatus] = useState<Exclude<RunStatus, "finished">>("idle");
  const [speed, setSpeed] = useState<Speed>(1);
  // Read by the animation loop without restarting it.
  const speedRef = useRef<Speed>(speed);

  const finished = state.finishedAt !== null;
  const running = status === "running" && !finished;

  useEffect(() => {
    if (!running) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const elapsed = Math.min(MAX_FRAME_MS, now - last);
      last = now;
      setState((current) => advanceBy(current, elapsed * speedRef.current));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running]);

  const reset = useCallback((next: SimulationConfig) => {
    setState(createSimulation(next));
    setStatus("idle");
  }, []);

  return {
    state,
    status: (finished ? "finished" : status) as RunStatus,
    speed,
    setSpeed: (value: Speed) => {
      speedRef.current = value;
      setSpeed(value);
    },
    start: () => setStatus("running"),
    pause: () => setStatus("paused"),
    step: () => {
      setStatus("paused");
      setState((current) => step(current));
    },
    reset,
  };
}
