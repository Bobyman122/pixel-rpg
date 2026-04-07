import { SceneManager } from './SceneManager';
import { InputManager } from './InputManager';

export const GAME_WIDTH = 256;
export const GAME_HEIGHT = 224;
export const TILE_SIZE = 16;

class GameLoopClass {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private running = false;
  private lastTime = 0;
  private animFrameId = 0;

  init(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.canvas.width = GAME_WIDTH;
    this.canvas.height = GAME_HEIGHT;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;
    InputManager.init();
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.tick(this.lastTime);
  }

  stop() {
    this.running = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
  }

  private tick = (now: number) => {
    if (!this.running) return;
    const dt = Math.min((now - this.lastTime) / 1000, 0.05); // cap at 50ms
    this.lastTime = now;

    // Update
    SceneManager.update(dt);
    InputManager.update();

    // Render
    if (this.ctx) {
      this.ctx.fillStyle = '#000';
      this.ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      SceneManager.render(this.ctx);
    }

    this.animFrameId = requestAnimationFrame(this.tick);
  };
}

export const GameLoop = new GameLoopClass();
