import { loadImages } from '@/engine/assets';
import { GAME_HEIGHT, GAME_WIDTH } from '@/engine/constants';
import { Clock } from '@/engine/GameLoop';
import { SceneManager, type Scene } from '@/engine/SceneManager';
import { drawText } from '@/gfx/font';
import { confirmPressed } from './common';
import { TitleScene } from './TitleScene';

/** Shown while the art downloads. Everything after this can draw from loaded images. */
export class LoadingScene implements Scene {
  readonly opaque = true;
  private progress = 0;
  private failed = false;

  enter() {
    this.start();
  }

  private start() {
    this.failed = false;
    loadImages((p) => (this.progress = p))
      .then(() => {
        if (SceneManager.has(this)) SceneManager.replace(new TitleScene());
      })
      .catch(() => {
        this.failed = true;
      });
  }

  update() {
    if (this.failed && confirmPressed()) this.start();
  }

  render(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#0a0812';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    if (this.failed) {
      drawText(ctx, "Couldn't load the game's art.", cx, cy - 10, '#f8d0c0', { align: 'center' });
      drawText(ctx, 'Check your connection, then press Z or A to retry.', cx, cy + 4, '#a898c8', { align: 'center' });
      return;
    }
    const dots = '.'.repeat(1 + (Math.floor(Clock.time * 3) % 3));
    drawText(ctx, `Loading${dots}`, cx - 22, cy - 14, '#e8e0f8');
    const w = 120;
    ctx.fillStyle = '#2a2238';
    ctx.fillRect(Math.round(cx - w / 2), cy, w, 4);
    ctx.fillStyle = '#ffd870';
    ctx.fillRect(Math.round(cx - w / 2), cy, Math.round(w * this.progress), 4);
  }
}
