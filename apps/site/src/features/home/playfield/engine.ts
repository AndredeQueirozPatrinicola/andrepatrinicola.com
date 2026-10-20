/**
 * Simulation for the home page "attract mode": a square ball bouncing off the
 * walls, off rectangles taken from the page content, and off a paddle that is
 * driven either by a simple AI (as in the Classic Pong opponent) or by the
 * visitor. Pure and deterministic given its inputs, so it can be unit tested.
 */

export type Rect = { x: number; y: number; width: number; height: number };

export type Block = Rect & { id: string };

export type Vec = { x: number; y: number };

export type Mode = "demo" | "player";

export type PlayfieldState = {
  width: number;
  height: number;
  ball: Vec & { vx: number; vy: number; size: number };
  paddle: Rect & { targetX: number };
  mode: Mode;
  rally: number;
  /** Horizontal error the AI aims with, re-rolled on every paddle hit. */
  aiOffset: number;
};

export type StepEvent =
  | { type: "block"; id: string; at: Vec }
  | { type: "paddle"; rally: number }
  | { type: "miss"; rally: number };

export const BALL_SIZE = 8;
export const PADDLE_HEIGHT = 8;
const PADDLE_MARGIN = 24;
const MAX_BOUNCE_ANGLE = Math.PI / 3;
const AI_SPEED = 520;

export function ballSpeed(width: number): number {
  return Math.min(560, Math.max(320, width * 0.4));
}

export function createState(width: number, height: number, random = Math.random): PlayfieldState {
  const paddleWidth = Math.round(Math.min(120, Math.max(72, width * 0.08)));
  const paddleX = (width - paddleWidth) / 2;
  const state: PlayfieldState = {
    width,
    height,
    ball: { x: 0, y: 0, vx: 0, vy: 0, size: BALL_SIZE },
    paddle: {
      x: paddleX,
      y: height - PADDLE_MARGIN - PADDLE_HEIGHT,
      width: paddleWidth,
      height: PADDLE_HEIGHT,
      targetX: paddleX,
    },
    mode: "demo",
    rally: 0,
    aiOffset: 0,
  };
  serve(state, random);
  return state;
}

/** Puts the ball on the paddle and launches it upwards at a random angle. */
export function serve(state: PlayfieldState, random = Math.random): void {
  const { ball, paddle } = state;
  const angle = (random() - 0.5) * MAX_BOUNCE_ANGLE;
  const speed = ballSpeed(state.width);
  ball.x = paddle.x + paddle.width / 2 - ball.size / 2;
  ball.y = paddle.y - ball.size - 1;
  ball.vx = Math.sin(angle) * speed;
  ball.vy = -Math.cos(angle) * speed;
  state.rally = 0;
}

/** Keeps the paddle on its line and inside the field after a resize. */
export function resize(state: PlayfieldState, width: number, height: number): void {
  state.width = width;
  state.height = height;
  state.paddle.y = height - PADDLE_MARGIN - PADDLE_HEIGHT;
  state.paddle.x = clamp(state.paddle.x, 0, width - state.paddle.width);
  state.paddle.targetX = clamp(state.paddle.targetX, 0, width - state.paddle.width);
  state.ball.x = clamp(state.ball.x, 0, width - state.ball.size);
  state.ball.y = clamp(state.ball.y, 0, height - state.ball.size);
}

/** Visitor input: the paddle centre follows this x coordinate. */
export function aimPaddle(state: PlayfieldState, centerX: number): void {
  state.paddle.targetX = clamp(centerX - state.paddle.width / 2, 0, state.width - state.paddle.width);
}

export function step(
  state: PlayfieldState,
  dt: number,
  blocks: readonly Block[],
  random = Math.random,
): StepEvent[] {
  const events: StepEvent[] = [];
  movePaddle(state, dt);

  const { ball } = state;
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  // Walls: left, right and top bounce; the bottom is a miss.
  if (ball.x < 0) {
    ball.x = 0;
    ball.vx = Math.abs(ball.vx);
  } else if (ball.x + ball.size > state.width) {
    ball.x = state.width - ball.size;
    ball.vx = -Math.abs(ball.vx);
  }
  if (ball.y < 0) {
    ball.y = 0;
    ball.vy = Math.abs(ball.vy);
  }

  for (const block of blocks) {
    if (bounceOffRect(ball, block)) {
      events.push({
        type: "block",
        id: block.id,
        at: { x: ball.x + ball.size / 2, y: ball.y + ball.size / 2 },
      });
      break;
    }
  }

  if (ball.vy > 0 && overlaps(ball, state.paddle)) {
    const hit = (ball.x + ball.size / 2 - state.paddle.x) / state.paddle.width;
    const angle = (clamp(hit, 0, 1) - 0.5) * 2 * MAX_BOUNCE_ANGLE;
    const speed = Math.hypot(ball.vx, ball.vy);
    ball.vx = Math.sin(angle) * speed;
    ball.vy = -Math.cos(angle) * speed;
    ball.y = state.paddle.y - ball.size;
    state.rally += 1;
    state.aiOffset = (random() - 0.5) * state.paddle.width * 0.8;
    events.push({ type: "paddle", rally: state.rally });
  }

  if (ball.y > state.height) {
    events.push({ type: "miss", rally: state.rally });
    serve(state, random);
  }

  return events;
}

function movePaddle(state: PlayfieldState, dt: number): void {
  const { paddle, ball } = state;

  if (state.mode === "demo") {
    // Like the Pong AI: chase the ball, but only while it is coming down.
    if (ball.vy > 0) {
      paddle.targetX = clamp(
        ball.x + ball.size / 2 - paddle.width / 2 + state.aiOffset,
        0,
        state.width - paddle.width,
      );
    }
    const delta = paddle.targetX - paddle.x;
    const maxMove = AI_SPEED * dt;
    paddle.x += Math.abs(delta) <= maxMove ? delta : Math.sign(delta) * maxMove;
    return;
  }

  paddle.x = paddle.targetX;
}

/**
 * Axis-aligned collision between the (square) ball and a rectangle. Pushes
 * the ball out along the axis of least penetration and reflects that velocity
 * component. Returns whether a collision happened.
 */
export function bounceOffRect(ball: PlayfieldState["ball"], rect: Rect): boolean {
  if (!overlaps(ball, rect)) return false;

  const overlapLeft = ball.x + ball.size - rect.x;
  const overlapRight = rect.x + rect.width - ball.x;
  const overlapTop = ball.y + ball.size - rect.y;
  const overlapBottom = rect.y + rect.height - ball.y;
  const minX = Math.min(overlapLeft, overlapRight);
  const minY = Math.min(overlapTop, overlapBottom);

  if (minX < minY) {
    if (overlapLeft < overlapRight) {
      ball.x = rect.x - ball.size;
      ball.vx = -Math.abs(ball.vx);
    } else {
      ball.x = rect.x + rect.width;
      ball.vx = Math.abs(ball.vx);
    }
  } else if (overlapTop < overlapBottom) {
    ball.y = rect.y - ball.size;
    ball.vy = -Math.abs(ball.vy);
  } else {
    ball.y = rect.y + rect.height;
    ball.vy = Math.abs(ball.vy);
  }
  return true;
}

function overlaps(ball: Vec & { size: number }, rect: Rect): boolean {
  return (
    ball.x < rect.x + rect.width &&
    ball.x + ball.size > rect.x &&
    ball.y < rect.y + rect.height &&
    ball.y + ball.size > rect.y
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
