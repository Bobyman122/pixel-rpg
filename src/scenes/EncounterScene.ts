import { GAME_HEIGHT, GAME_WIDTH } from '@/engine/constants';
import type { Scene } from '@/engine/SceneManager';
import { makeCanvas } from '@/gfx/canvas';

const DURATION = 0.95;

/**
 * Classic battle intro: the overworld flashes, then breaks up into a growing
 * mosaic and spins away into darkness.
 */
export class EncounterScene implements Scene {
  readonly opaque = true;
  private t = 0;
  private small = makeCanvas(GAME_WIDTH, GAME_HEIGHT);
  private finished = false;

  constructor(
    private snapshot: HTMLCanvasElement,
    private boss: boolean,
    private onDone: () => void,
  ) {}

  update(dt: number) {
    this.t += dt;
    if (this.t >= DURATION && !this.finished) {
      this.finished = true;
      this.onDone();
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    const t = Math.min(1, this.t / DURATION);
    const flashPhase = this.t < 0.32;
    if (flashPhase) {
      ctx.drawImage(this.snapshot, 0, 0);
      const on = Math.floor(this.t / 0.08) % 2 === 0;
      if (on) {
        ctx.globalAlpha = 0.75;
        ctx.fillStyle = this.boss ? '#ff3040' : '#ffffff';
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        ctx.globalAlpha = 1;
      }
      return;
    }
    const p = (t - 0.32 / DURATION) / (1 - 0.32 / DURATION);
    const block = Math.max(1, Math.round(1 + p * 22));
    const [sc, sctx] = this.small;
    const w = Math.ceil(GAME_WIDTH / block);
    const h = Math.ceil(GAME_HEIGHT / block);
    sctx.imageSmoothingEnabled = true;
    sctx.clearRect(0, 0, sc.width, sc.height);
    sctx.drawImage(this.snapshot, 0, 0, w, h);

    ctx.save();
    ctx.translate(GAME_WIDTH / 2, GAME_HEIGHT / 2);
    ctx.rotate(p * p * 0.9);
    const scale = 1 + p * 1.4;
    ctx.scale(scale, scale);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sc, 0, 0, w, h, -GAME_WIDTH / 2, -GAME_HEIGHT / 2, w * block, h * block);
    ctx.restore();

    ctx.globalAlpha = Math.min(1, Math.round(p * 8) / 8);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    ctx.globalAlpha = 1;
  }
}
