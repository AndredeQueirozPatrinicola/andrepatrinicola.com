import { describe, expect, it } from "vitest";

import { aimPaddle, bounceOffRect, createState, serve, step } from "./engine";

const fixed = () => 0.5;

describe("playfield engine", () => {
  it("serves the ball straight up from the paddle centre", () => {
    const state = createState(800, 500, fixed);

    expect(state.ball.vx).toBeCloseTo(0);
    expect(state.ball.vy).toBeLessThan(0);
    expect(state.ball.x + state.ball.size / 2).toBeCloseTo(state.paddle.x + state.paddle.width / 2);
  });

  it("bounces off walls", () => {
    const state = createState(800, 500, fixed);
    state.ball.x = 2;
    state.ball.vx = -300;
    state.ball.vy = 0;

    step(state, 0.02, [], fixed);

    expect(state.ball.x).toBe(0);
    expect(state.ball.vx).toBeGreaterThan(0);
  });

  it("reflects off a block on the axis of least penetration and reports it", () => {
    const state = createState(800, 500, fixed);
    Object.assign(state.ball, { x: 100, y: 205, vx: 0, vy: -300 });

    const events = step(state, 0.02, [{ id: "title", x: 50, y: 100, width: 200, height: 100 }], fixed);

    expect(events).toContainEqual(expect.objectContaining({ type: "block", id: "title" }));
    expect(state.ball.vy).toBeGreaterThan(0);
    expect(state.ball.y).toBe(200);
  });

  it("sends the ball left or right depending on where it hits the paddle", () => {
    const state = createState(800, 500, fixed);
    state.mode = "player";
    aimPaddle(state, 400);
    step(state, 0, [], fixed);
    const { paddle, ball } = state;

    Object.assign(ball, { x: paddle.x + paddle.width - ball.size, y: paddle.y - ball.size + 2, vx: 0, vy: 300 });
    const events = step(state, 0.001, [], fixed);

    expect(events).toContainEqual({ type: "paddle", rally: 1 });
    expect(ball.vx).toBeGreaterThan(0);
    expect(ball.vy).toBeLessThan(0);
  });

  it("counts a miss and serves again", () => {
    const state = createState(800, 500, fixed);
    state.rally = 4;
    Object.assign(state.ball, { x: 10, y: 499, vx: 0, vy: 400 });

    const events = step(state, 0.05, [], fixed);

    expect(events).toContainEqual({ type: "miss", rally: 4 });
    expect(state.rally).toBe(0);
    expect(state.ball.vy).toBeLessThan(0);
  });

  it("leaves non-overlapping rectangles alone", () => {
    const ball = { x: 0, y: 0, vx: 10, vy: 10, size: 8 };
    expect(bounceOffRect(ball, { x: 20, y: 20, width: 10, height: 10 })).toBe(false);
    expect(ball).toEqual({ x: 0, y: 0, vx: 10, vy: 10, size: 8 });
  });

  it("the demo paddle tracks a falling ball", () => {
    const state = createState(800, 500, fixed);
    serve(state, fixed);
    Object.assign(state.ball, { x: 700, y: 100, vx: 0, vy: 200 });
    for (let i = 0; i < 120; i += 1) step(state, 1 / 120, [], fixed);

    expect(state.paddle.x + state.paddle.width / 2).toBeGreaterThan(600);
  });
});
