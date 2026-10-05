import { Sound } from '@/engine/audio';
import { GAME_HEIGHT, GAME_WIDTH } from '@/engine/constants';
import { Clock } from '@/engine/GameLoop';
import { SceneManager, type Scene } from '@/engine/SceneManager';
import { session } from '@/engine/session';
import { getBigCrystal, getTitleBackground } from '@/gfx/backdrops';
import { hash2 } from '@/gfx/canvas';
import { drawText, renderLogo } from '@/gfx/font';
import { COLORS, drawCursor, drawWindow } from '@/gfx/ui';
import { game } from '@/store/gameStore';
import { hasAnySave, type SaveData } from '@/systems/save';
import { confirmPressed, ListCursor } from './common';
import { ConfigScene } from './ConfigScene';
import { DialogueScene } from './DialogueScene';
import { OverworldScene } from './OverworldScene';
import { SaveScene } from './SaveScene';

const LOGO_COLORS = ['#fffbe0', '#fff0a0', '#ffd860', '#f8b030', '#e88018', '#c05410'];

let logo: HTMLCanvasElement | null = null;

export function drawStars(ctx: CanvasRenderingContext2D, count: number, maxY: number) {
  const t = Clock.time;
  for (let i = 0; i < count; i++) {
    const x = Math.floor(hash2(i, 0, 91) * GAME_WIDTH);
    const y = Math.floor(hash2(i, 1, 91) * maxY);
    const tw = Math.sin(t * (1 + hash2(i, 2, 91) * 3) + i);
    if (tw < -0.6) continue;
    const bright = hash2(i, 3, 91) > 0.85;
    ctx.fillStyle = tw > 0.7 ? '#ffffff' : bright ? '#c8d0ff' : '#7c78b8';
    ctx.fillRect(x, y, 1, 1);
    if (bright && tw > 0.8) {
      ctx.fillStyle = '#9890e0';
      ctx.fillRect(x - 1, y, 1, 1);
      ctx.fillRect(x + 1, y, 1, 1);
      ctx.fillRect(x, y - 1, 1, 1);
      ctx.fillRect(x, y + 1, 1, 1);
    }
  }
}

/** The floating crystal with its rays and halo, shared by the title and ending. */
export function drawCrystal(ctx: CanvasRenderingContext2D, cx: number, cy: number, intensity = 1) {
  const t = Clock.time;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.globalAlpha = 0.07 * intensity;
  ctx.fillStyle = '#c8e8ff';
  for (let i = 0; i < 10; i++) {
    const a = t * 0.25 + (i / 10) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a - 0.08) * 160, Math.sin(a - 0.08) * 160);
    ctx.lineTo(Math.cos(a + 0.08) * 160, Math.sin(a + 0.08) * 160);
    ctx.fill();
  }
  ctx.restore();
  // stepped halo
  for (const [r, a] of [
    [34, 0.06],
    [26, 0.08],
    [18, 0.12],
  ]) {
    ctx.globalAlpha = a * intensity;
    ctx.fillStyle = '#88c8ff';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  const c = getBigCrystal();
  const bob = Math.round(Math.sin(t * 1.6) * 3);
  ctx.drawImage(c, Math.round(cx - c.width / 2), Math.round(cy - c.height / 2 + bob));
  // sparkles
  for (let i = 0; i < 5; i++) {
    const p = (t * 0.7 + i * 0.37) % 1;
    const a = i * 2.1 + Math.floor(t * 0.7 + i * 0.37) * 1.3;
    const r = 14 + (i % 3) * 7;
    const sx = Math.round(cx + Math.cos(a) * r);
    const sy = Math.round(cy + Math.sin(a) * r * 0.9 + bob);
    const size = p < 0.5 ? Math.round(p * 6) : Math.round((1 - p) * 6);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(sx - size, sy, size * 2 + 1, 1);
    ctx.fillRect(sx, sy - size, 1, size * 2 + 1);
  }
}

export function startGame(loaded?: SaveData) {
  SceneManager.fade({
    out: 0.6,
    in: 0.5,
    midpoint: () => {
      if (loaded) game().loadSave(loaded);
      else game().newGame();
      SceneManager.clear();
      const world = new OverworldScene();
      SceneManager.push(world);
      if (!loaded) {
        SceneManager.push(
          DialogueScene.message(
            'Millbrook, a quiet village at the edge of the Whispering Forest. For a hundred years, the Crystal of Light kept the shadows away... until last night.',
            undefined,
            { top: true },
          ),
        );
      }
    },
  });
}

export class TitleScene implements Scene {
  readonly opaque = true;
  private cursor = new ListCursor();
  private canContinue = false;
  private t = 0;

  enter() {
    session.playing = false;
    this.canContinue = hasAnySave();
    if (this.canContinue) this.cursor.index = 1;
    Sound.playMusic('title');
  }

  resume() {
    this.canContinue = hasAnySave();
  }

  private options() {
    return [
      { label: 'New Game', enabled: true },
      { label: 'Continue', enabled: this.canContinue },
      { label: 'Config', enabled: true },
    ];
  }

  update(dt: number) {
    this.t += dt;
    if (this.t < 0.6) return;
    const opts = this.options();
    this.cursor.update(opts.length);
    if (!confirmPressed()) return;
    const opt = opts[this.cursor.index];
    if (!opt.enabled) {
      Sound.sfx('error');
      return;
    }
    Sound.sfx('confirm');
    if (this.cursor.index === 0) {
      Sound.stopMusic();
      startGame();
    } else if (this.cursor.index === 1) {
      SceneManager.push(
        new SaveScene('load', (data) => {
          Sound.stopMusic();
          startGame(data);
        }),
      );
    } else {
      SceneManager.push(new ConfigScene());
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    ctx.drawImage(getTitleBackground(), 0, 0);
    drawStars(ctx, 90, 150);
    drawCrystal(ctx, GAME_WIDTH / 2, 104);

    if (!logo) logo = renderLogo('CRYSTAL QUEST', LOGO_COLORS, '#3a1206', '#0a0414', 3);
    const intro = Math.min(1, this.t / 0.6);
    const ly = Math.round(18 - (1 - intro) * 30);
    ctx.drawImage(logo, Math.round((GAME_WIDTH - logo.width) / 2), ly);
    drawText(ctx, 'A Tale of Light and Shadow', GAME_WIDTH / 2, ly + 34, '#c8b8f8', { align: 'center' });

    if (this.t < 0.6) return;
    const opts = this.options();
    const w = 92;
    const x = Math.floor((GAME_WIDTH - w) / 2);
    const y = 148;
    drawWindow(ctx, x, y, w, 46);
    opts.forEach((o, i) => drawText(ctx, o.label, x + 28, y + 7 + i * 12, o.enabled ? COLORS.text : COLORS.disabled));
    drawCursor(ctx, x + 26, y + 10 + this.cursor.index * 12);

    const hint = session.touch ? 'A: Select    B: Back' : 'Z / Enter: Select    X: Back';
    drawText(ctx, hint, GAME_WIDTH / 2, GAME_HEIGHT - 11, '#8878b8', { align: 'center' });
  }
}
