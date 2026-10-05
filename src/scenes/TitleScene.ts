import { Sound } from '@/engine/audio';
import { GAME_HEIGHT, GAME_WIDTH } from '@/engine/constants';
import { Clock } from '@/engine/GameLoop';
import { SceneManager, type Scene } from '@/engine/SceneManager';
import { session } from '@/engine/session';
import { getVillageView } from '@/gfx/backdrops';
import { hash2 } from '@/gfx/canvas';
import { drawShadow, getSheet } from '@/gfx/characters';
import { drawText, renderLogo } from '@/gfx/font';
import { COLORS, drawCursor, drawWindow } from '@/gfx/ui';
import { game } from '@/store/gameStore';
import { hasAnySave, type SaveData } from '@/systems/save';
import { Direction } from '@/types';
import { confirmPressed, ListCursor } from './common';
import { ConfigScene } from './ConfigScene';
import { DialogueScene } from './DialogueScene';
import { OverworldScene } from './OverworldScene';
import { SaveScene } from './SaveScene';

const LOGO_COLORS = ['#fffbe0', '#fff0a0', '#ffd860', '#f8b030', '#e88018', '#c05410'];

let logo: HTMLCanvasElement | null = null;

/** Fireflies drifting over the village at night (title screen). */
export function drawFireflies(ctx: CanvasRenderingContext2D, count: number) {
  const t = Clock.time;
  for (let i = 0; i < count; i++) {
    const x = (hash2(i, 0, 91) * GAME_WIDTH + Math.sin(t * 0.4 + i) * 18 + GAME_WIDTH) % GAME_WIDTH;
    const y = (hash2(i, 1, 91) * GAME_HEIGHT - t * (3 + hash2(i, 2, 91) * 5) + GAME_HEIGHT * 4) % GAME_HEIGHT;
    const glow = Math.sin(t * 2.5 + i * 1.7);
    if (glow < -0.1) continue;
    ctx.fillStyle = glow > 0.6 ? '#fbffc0' : '#c8f070';
    ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
    if (glow > 0.6) {
      ctx.globalAlpha = 0.35;
      ctx.fillRect(Math.round(x) - 1, Math.round(y), 3, 1);
      ctx.fillRect(Math.round(x), Math.round(y) - 1, 1, 3);
      ctx.globalAlpha = 1;
    }
  }
}

/** The party standing in the plaza, shared by the title and the ending. */
export function drawParty(ctx: CanvasRenderingContext2D, looks: string[], cx: number, footY: number, pose: 'stand' | 'cheer') {
  const gap = 20;
  looks.forEach((look, i) => {
    const sheet = getSheet(look);
    const x = Math.round(cx + (i - (looks.length - 1) / 2) * gap - 8);
    const hop = pose === 'cheer' ? -Math.abs(Math.round(Math.sin(Clock.time * 5 + i) * 3)) : 0;
    drawShadow(ctx, x + 8, footY - 1);
    const frame = pose === 'cheer' ? sheet.cheer : sheet.frames[Direction.Down][0];
    ctx.drawImage(frame, x, footY - 16 + hop);
  });
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
    ctx.drawImage(getVillageView(), 0, 0);
    // Night falls over Millbrook.
    ctx.fillStyle = 'rgba(14,16,52,0.58)';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    const g = ctx.createLinearGradient(0, 0, 0, 70);
    g.addColorStop(0, 'rgba(6,6,24,0.75)');
    g.addColorStop(1, 'rgba(6,6,24,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, GAME_WIDTH, 70);
    drawFireflies(ctx, 26);
    drawParty(ctx, ['lira', 'kael', 'finn'], GAME_WIDTH / 2, 112, 'stand');

    if (!logo) logo = renderLogo('CRYSTAL QUEST', LOGO_COLORS, '#3a1206', '#0a0414', 3);
    const intro = Math.min(1, this.t / 0.6);
    const ly = Math.round(14 - (1 - intro) * 30);
    ctx.drawImage(logo, Math.round((GAME_WIDTH - logo.width) / 2), ly);
    drawText(ctx, 'A Tale of Light and Shadow', GAME_WIDTH / 2, ly + 34, '#d8d0ff', { align: 'center', shadow: '#0a0414' });

    if (this.t < 0.6) return;
    const opts = this.options();
    const w = 100;
    const x = Math.floor((GAME_WIDTH - w) / 2);
    const y = 120;
    drawWindow(ctx, x, y, w, 46);
    opts.forEach((o, i) => drawText(ctx, o.label, x + 30, y + 8 + i * 12, !o.enabled ? COLORS.disabled : i === this.cursor.index ? COLORS.highlight : COLORS.text));
    drawCursor(ctx, x + 27, y + 11 + this.cursor.index * 12);

    const hint = session.touch ? 'A: Select    B: Back' : 'Z / Enter: Select    X: Back';
    drawText(ctx, hint, GAME_WIDTH / 2, GAME_HEIGHT - 10, '#a8a0d0', { align: 'center', shadow: '#0a0414' });
  }
}
