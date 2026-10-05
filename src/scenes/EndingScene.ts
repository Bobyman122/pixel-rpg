import { Sound } from '@/engine/audio';
import { GAME_HEIGHT, GAME_WIDTH } from '@/engine/constants';
import { SceneManager, type Scene } from '@/engine/SceneManager';
import { session } from '@/engine/session';
import { getTitleBackground } from '@/gfx/backdrops';
import { drawText, renderLogo } from '@/gfx/font';
import { COLORS } from '@/gfx/ui';
import { game } from '@/store/gameStore';
import { formatTime } from '@/systems/save';
import { confirmPressed } from './common';
import { drawCrystal, drawStars, TitleScene } from './TitleScene';

export class EndingScene implements Scene {
  readonly opaque = true;
  private t = 0;
  private lines: { text: string; color?: string }[] = [];
  private theEnd: HTMLCanvasElement | null = null;
  private leaving = false;

  enter() {
    session.playing = false;
    const s = game();
    Sound.playMusic('title');
    const names = s.party.map((c) => c.name);
    const crew = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0];
    this.lines = [
      { text: 'The Crystal of Light was returned to its shrine,' },
      { text: 'and the shadows over Millbrook melted away.' },
      { text: '' },
      { text: `${crew} were cheered` },
      { text: 'long into the night.' },
      { text: '' },
      { text: 'But far to the north, beyond the mountains,' },
      { text: 'something old and patient began to stir...' },
      { text: '' },
      { text: '' },
      { text: '@END' },
      { text: '' },
      { text: '' },
      { text: `Play time   ${formatTime(s.playTime)}`, color: COLORS.dim },
      { text: `Party level ${s.party[0]?.level ?? 1}`, color: COLORS.dim },
      { text: `Gold        ${s.gold}`, color: COLORS.dim },
      { text: '' },
      { text: 'Thank you for playing!', color: COLORS.highlight },
    ];
  }

  private get scroll() {
    return Math.min(this.t * 14, this.lines.length * 14 + 40);
  }

  private get finished() {
    return this.scroll >= this.lines.length * 14 + 40;
  }

  update(dt: number) {
    this.t += dt;
    if (this.leaving) return;
    if (confirmPressed() && this.finished) {
      this.leaving = true;
      Sound.sfx('confirm');
      SceneManager.fade({
        out: 1,
        midpoint: () => {
          SceneManager.clear();
          SceneManager.push(new TitleScene());
        },
      });
    } else if (confirmPressed()) {
      this.t += 2;
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    ctx.drawImage(getTitleBackground(), 0, 0);
    // dawn breaking over the village
    ctx.globalAlpha = Math.min(0.45, this.t / 30);
    ctx.fillStyle = '#f8a868';
    ctx.fillRect(0, 120, GAME_WIDTH, GAME_HEIGHT - 120);
    ctx.globalAlpha = 1;
    drawStars(ctx, 60, 110);
    drawCrystal(ctx, GAME_WIDTH / 2, 70, 1.3);

    if (!this.theEnd) this.theEnd = renderLogo('THE END', ['#ffffff', '#e0f0ff', '#a8d0ff', '#78a8f0'], '#102050', '#04040c', 2);
    const base = GAME_HEIGHT + 4 - this.scroll;
    ctx.fillStyle = 'rgba(4,4,16,0.55)';
    ctx.fillRect(0, 108, GAME_WIDTH, GAME_HEIGHT - 108);
    this.lines.forEach((l, i) => {
      const y = Math.round(base + i * 14);
      if (y < 108 || y > GAME_HEIGHT) return;
      if (l.text === '@END') {
        ctx.drawImage(this.theEnd!, Math.round((GAME_WIDTH - this.theEnd!.width) / 2), y - 6);
      } else {
        drawText(ctx, l.text, GAME_WIDTH / 2, y, l.color ?? COLORS.text, { align: 'center' });
      }
    });
    if (this.finished && Math.floor(this.t * 2) % 2 === 0) {
      drawText(ctx, 'Press Z', GAME_WIDTH / 2, GAME_HEIGHT - 14, COLORS.dim, { align: 'center' });
    }
  }
}
