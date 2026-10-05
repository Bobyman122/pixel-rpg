import { GAME_HEIGHT, GAME_WIDTH } from './constants';
import { Input } from './InputManager';
import { SceneManager } from './SceneManager';

/** Global animation clock in seconds, shared by tile/sprite animations. */
export const Clock = { time: 0 };

type FrameHook = (dt: number) => void;

class GameLoopClass {
  canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private running = false;
  private lastTime = 0;
  private frameId = 0;
  private hooks: FrameHook[] = [];

  init(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    ctx.imageSmoothingEnabled = false;
    this.ctx = ctx;
    Input.init();
  }

  /** Run a callback every frame (used for play-time tracking). */
  addHook(hook: FrameHook) {
    this.hooks.push(hook);
    return () => {
      this.hooks = this.hooks.filter((h) => h !== hook);
    };
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.frameId = requestAnimationFrame(this.tick);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.frameId);
  }

  /** Copy of the current frame, used for the battle mosaic effect. */
  snapshot(): HTMLCanvasElement {
    const copy = document.createElement('canvas');
    copy.width = GAME_WIDTH;
    copy.height = GAME_HEIGHT;
    if (this.canvas) copy.getContext('2d')?.drawImage(this.canvas, 0, 0);
    return copy;
  }

  private tick = (now: number) => {
    if (!this.running) return;
    // Clamp so a background tab doesn't produce a giant time step.
    const dt = Math.min((now - this.lastTime) / 1000, 1 / 20);
    this.lastTime = now;
    Clock.time += dt;

    Input.beginFrame(dt);
    SceneManager.update(dt);
    Input.endFrame();
    for (const hook of this.hooks) hook(dt);

    const ctx = this.ctx;
    if (ctx) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      SceneManager.render(ctx);
    }
    this.frameId = requestAnimationFrame(this.tick);
  };
}

export const GameLoop = new GameLoopClass();
