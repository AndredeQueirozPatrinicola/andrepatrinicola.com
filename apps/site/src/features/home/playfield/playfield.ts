import {
  aimPaddle,
  createState,
  resize,
  step,
  type Block,
  type Mode,
  type PlayfieldState,
  type StepEvent,
} from "./engine";

export type PlayfieldEvent = StepEvent | { type: "mode"; mode: Mode };

export type PlayfieldOptions = {
  /** Element the field covers; blocks and the canvas are positioned inside it. */
  root: HTMLElement;
  canvas: HTMLCanvasElement;
  onEvent: (event: PlayfieldEvent) => void;
  /** Start the loop immediately in demo mode (false under reduced motion). */
  autoplay: boolean;
};

export type PlayfieldController = {
  play(): void;
  stopPlaying(): void;
  destroy(): void;
};

/** Elements marked with this attribute are solid for the ball. */
export const BLOCK_ATTRIBUTE = "data-playfield-block";

const STEP = 1 / 120;
const IDLE_MS = 6000;
const KEY_SPEED = 720;
const TRAIL_LENGTH = 6;

type Spark = { x: number; y: number; vx: number; vy: number; life: number };

export function createPlayfield({ root, canvas, onEvent, autoplay }: PlayfieldOptions): PlayfieldController {
  const context = canvas.getContext("2d");
  if (!context) return { play() {}, stopPlaying() {}, destroy() {} };
  const ctx = context;

  let state: PlayfieldState = createState(root.clientWidth, root.clientHeight);
  let blocks: Block[] = [];
  let colors = readColors();
  let running = false;
  let visible = true;
  let enabled = autoplay;
  let frame = 0;
  let lastTime = 0;
  let accumulator = 0;
  let lastInput = 0;
  let keyDirection = 0;
  const trail: { x: number; y: number }[] = [];
  const sparks: Spark[] = [];

  function readColors() {
    const style = getComputedStyle(root);
    // `color` and `caret-color` resolve the light-dark() tokens to real colors.
    return { ink: style.color, accent: style.caretColor, muted: style.borderTopColor };
  }

  function measure() {
    const bounds = root.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(bounds.width * dpr);
    canvas.height = Math.round(bounds.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    resize(state, bounds.width, bounds.height);

    blocks = [];
    root.querySelectorAll<HTMLElement>(`[${BLOCK_ATTRIBUTE}]`).forEach((element) => {
      const id = element.getAttribute(BLOCK_ATTRIBUTE) ?? "";
      // Text blocks collide line by line, so the ball can pass beside short lines.
      const rects =
        element.dataset.playfieldShape === "text" ? textLineRects(element) : [element.getBoundingClientRect()];
      for (const rect of rects) {
        blocks.push({
          id,
          x: rect.left - bounds.left,
          y: rect.top - bounds.top,
          width: rect.width,
          height: rect.height,
        });
      }
    });
    colors = readColors();
    draw();
  }

  function setMode(mode: Mode) {
    if (state.mode === mode) return;
    state.mode = mode;
    onEvent({ type: "mode", mode });
  }

  function takeControl() {
    lastInput = performance.now();
    if (!enabled) {
      enabled = true;
      updateRunning();
    }
    setMode("player");
  }

  function tick(time: number) {
    const elapsed = Math.min((time - lastTime) / 1000, 1 / 20);
    lastTime = time;
    accumulator += elapsed;

    if (state.mode === "player" && time - lastInput > IDLE_MS) setMode("demo");

    while (accumulator >= STEP) {
      if (keyDirection !== 0) {
        aimPaddle(state, state.paddle.targetX + state.paddle.width / 2 + keyDirection * KEY_SPEED * STEP);
      }
      for (const event of step(state, STEP, blocks)) {
        if (event.type === "block") burst(event.at.x, event.at.y);
        onEvent(event);
      }
      accumulator -= STEP;
    }

    trail.push({ x: state.ball.x, y: state.ball.y });
    if (trail.length > TRAIL_LENGTH) trail.shift();
    updateSparks(elapsed);
    draw();
    frame = requestAnimationFrame(tick);
  }

  function burst(x: number, y: number) {
    for (let i = 0; i < 6; i += 1) {
      const angle = (Math.PI * 2 * i) / 6;
      sparks.push({ x, y, vx: Math.cos(angle) * 90, vy: Math.sin(angle) * 90, life: 0.35 });
    }
  }

  function updateSparks(dt: number) {
    for (let i = sparks.length - 1; i >= 0; i -= 1) {
      const spark = sparks[i];
      spark.x += spark.vx * dt;
      spark.y += spark.vy * dt;
      spark.life -= dt;
      if (spark.life <= 0) sparks.splice(i, 1);
    }
  }

  function draw() {
    const { ball, paddle, width, height } = state;
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = colors.accent;
    trail.forEach((point, index) => {
      ctx.globalAlpha = ((index + 1) / (trail.length + 1)) * 0.35;
      ctx.fillRect(Math.round(point.x), Math.round(point.y), ball.size, ball.size);
    });
    ctx.globalAlpha = 1;
    ctx.fillRect(Math.round(ball.x), Math.round(ball.y), ball.size, ball.size);

    ctx.fillStyle = colors.muted;
    for (const spark of sparks) {
      ctx.globalAlpha = Math.max(spark.life / 0.35, 0);
      ctx.fillRect(Math.round(spark.x), Math.round(spark.y), 3, 3);
    }
    ctx.globalAlpha = 1;

    ctx.fillStyle = colors.ink;
    ctx.fillRect(Math.round(paddle.x), Math.round(paddle.y), paddle.width, paddle.height);
  }

  function updateRunning() {
    const shouldRun = enabled && visible && !document.hidden;
    if (shouldRun === running) return;
    running = shouldRun;
    if (running) {
      lastTime = performance.now();
      accumulator = 0;
      frame = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(frame);
    }
  }

  // Pointer: a mouse over the field or a finger dragging on it takes control.
  // `touch-action: pan-y` on the root keeps vertical page scrolling intact.
  function onPointerMove(event: PointerEvent) {
    if (event.pointerType === "touch" && event.buttons === 0) return;
    const bounds = root.getBoundingClientRect();
    takeControl();
    aimPaddle(state, event.clientX - bounds.left);
  }

  function onPointerDown(event: PointerEvent) {
    if (event.pointerType !== "touch") return;
    onPointerMove(event);
  }

  function onKey(event: KeyboardEvent) {
    if (state.mode !== "player" || !root.contains(document.activeElement)) return;
    const left = event.key === "ArrowLeft" || event.key.toLowerCase() === "a";
    const right = event.key === "ArrowRight" || event.key.toLowerCase() === "d";
    if (!left && !right) return;
    event.preventDefault();
    lastInput = performance.now();
    const pressed = event.type === "keydown";
    if (pressed) keyDirection = left ? -1 : 1;
    else if ((left && keyDirection < 0) || (right && keyDirection > 0)) keyDirection = 0;
  }

  const resizeObserver = new ResizeObserver(measure);
  resizeObserver.observe(root);
  const intersectionObserver = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    updateRunning();
  });
  intersectionObserver.observe(root);
  const colorScheme = window.matchMedia("(prefers-color-scheme: dark)");
  const onColorChange = () => {
    colors = readColors();
    if (!running) draw();
  };
  const themeObserver = new MutationObserver(onColorChange);
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  const onVisibility = () => updateRunning();
  root.addEventListener("pointermove", onPointerMove);
  root.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("keydown", onKey);
  window.addEventListener("keyup", onKey);
  document.addEventListener("visibilitychange", onVisibility);
  colorScheme.addEventListener("change", onColorChange);
  void document.fonts?.ready.then(measure);

  measure();
  updateRunning();

  return {
    play() {
      takeControl();
    },
    stopPlaying() {
      keyDirection = 0;
      setMode("demo");
      if (!autoplay) {
        enabled = false;
        updateRunning();
      }
    },
    destroy() {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      themeObserver.disconnect();
      root.removeEventListener("pointermove", onPointerMove);
      root.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      document.removeEventListener("visibilitychange", onVisibility);
      colorScheme.removeEventListener("change", onColorChange);
      state = createState(0, 0);
    },
  };
}

function textLineRects(element: HTMLElement): DOMRect[] {
  const range = document.createRange();
  range.selectNodeContents(element);
  return Array.from(range.getClientRects()).filter((rect) => rect.width > 0 && rect.height > 0);
}
