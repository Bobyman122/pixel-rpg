import { Sound } from '@/engine/audio';
import { GAME_HEIGHT, GAME_WIDTH } from '@/engine/constants';
import { Input } from '@/engine/InputManager';
import { SceneManager, type Scene } from '@/engine/SceneManager';
import { session } from '@/engine/session';
import { drawText } from '@/gfx/font';
import { COLORS, drawCursor, drawSelection, drawWindow, THEME_ORDER, WINDOW_THEMES } from '@/gfx/ui';
import { game } from '@/store/gameStore';
import type { Settings } from '@/systems/settings';
import { cancelPressed, ListCursor } from './common';

interface Option {
  label: string;
  values: string[];
  get: (s: Settings) => number;
  set: (i: number) => Partial<Settings>;
  help: string;
}

const OPTIONS: Option[] = [
  {
    label: 'Window Color',
    values: THEME_ORDER.map((t) => WINDOW_THEMES[t].name),
    get: (s) => THEME_ORDER.indexOf(s.windowTheme),
    set: (i) => ({ windowTheme: THEME_ORDER[i] }),
    help: 'Pick the color of every menu and text box.',
  },
  {
    label: 'Text Speed',
    values: ['Slow', 'Normal', 'Fast'],
    get: (s) => ['slow', 'normal', 'fast'].indexOf(s.textSpeed),
    set: (i) => ({ textSpeed: (['slow', 'normal', 'fast'] as const)[i] }),
    help: 'How quickly dialogue types itself out.',
  },
  {
    label: 'Battle Speed',
    values: ['Normal', 'Fast'],
    get: (s) => (s.battleSpeed === 'fast' ? 1 : 0),
    set: (i) => ({ battleSpeed: i === 1 ? 'fast' : 'normal' }),
    help: 'Speeds up attack and spell animations.',
  },
  {
    label: 'Sound FX',
    values: ['Off', 'On'],
    get: (s) => (s.sfx ? 1 : 0),
    set: (i) => ({ sfx: i === 1 }),
    help: 'Menu blips, hits, spells and jingles.',
  },
  {
    label: 'Music',
    values: ['Off', 'On'],
    get: (s) => (s.music ? 1 : 0),
    set: (i) => ({ music: i === 1 }),
    help: 'The soundtrack on maps and in battle.',
  },
  {
    label: 'CRT Filter',
    values: ['Off', 'On'],
    get: (s) => (s.crt ? 1 : 0),
    set: (i) => ({ crt: i === 1 }),
    help: 'Subtle scanlines, like an old TV.',
  },
];

export class ConfigScene implements Scene {
  readonly opaque = true;
  private cursor = new ListCursor();

  update() {
    this.cursor.update(OPTIONS.length);
    if (cancelPressed()) {
      Sound.sfx('cancel');
      SceneManager.remove(this);
      return;
    }
    const opt = OPTIONS[this.cursor.index];
    const s = game().settings;
    let dir = 0;
    if (Input.isRepeat('right') || Input.isPressed('confirm')) dir = 1;
    if (Input.isRepeat('left')) dir = -1;
    if (dir) {
      const n = opt.values.length;
      const next = (opt.get(s) + dir + n) % n;
      game().updateSettings(opt.set(next));
      Sound.sfx('cursor');
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#120c0a';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    const s = game().settings;
    drawWindow(ctx, 0, 0, GAME_WIDTH, 22);
    drawText(ctx, OPTIONS[this.cursor.index].help, 12, 7);
    drawWindow(ctx, 0, 22, GAME_WIDTH, 134);
    OPTIONS.forEach((o, i) => {
      const y = 33 + i * 20;
      if (i === this.cursor.index) drawSelection(ctx, 8, y - 4, GAME_WIDTH - 16, 16);
      drawText(ctx, o.label, 28, y, i === this.cursor.index ? COLORS.highlight : COLORS.text);
      const idx = o.get(s);
      if (o.values.length > 3) {
        drawText(ctx, '<', 120, y, COLORS.dim);
        drawText(ctx, o.values[idx], 154, y, COLORS.highlight, { align: 'center' });
        drawText(ctx, '>', 184, y, COLORS.dim);
        // A tiny sample of every window style.
        THEME_ORDER.forEach((t, j) => {
          drawWindow(ctx, 198 + j * 19, y - 3, 16, 14, t);
          if (j === idx) {
            ctx.fillStyle = COLORS.highlight;
            ctx.fillRect(198 + j * 19, y + 12, 16, 1);
          }
        });
        return;
      }
      o.values.forEach((v, j) => drawText(ctx, v, 130 + j * 50, y, j === idx ? COLORS.highlight : COLORS.disabled));
    });
    drawCursor(ctx, 25, 36 + this.cursor.index * 20);
    drawWindow(ctx, 0, 156, GAME_WIDTH, 24);
    drawText(
      ctx,
      session.touch ? 'Left / Right (or A) to change, B to go back. Saved automatically.' : 'Left / Right (or Z) to change, X to go back. Saved automatically.',
      12,
      163,
      COLORS.dim,
    );
  }
}
