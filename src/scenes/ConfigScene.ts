import { Sound } from '@/engine/audio';
import { GAME_HEIGHT, GAME_WIDTH } from '@/engine/constants';
import { Input } from '@/engine/InputManager';
import { SceneManager, type Scene } from '@/engine/SceneManager';
import { session } from '@/engine/session';
import { drawText } from '@/gfx/font';
import { COLORS, drawCursor, drawWindow, THEME_ORDER, WINDOW_THEMES } from '@/gfx/ui';
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
    help: 'Background chiptune music.',
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
    ctx.fillStyle = '#05050f';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    const s = game().settings;
    drawWindow(ctx, 0, 0, GAME_WIDTH, 26);
    drawText(ctx, OPTIONS[this.cursor.index].help, 12, 9);
    drawWindow(ctx, 0, 26, GAME_WIDTH, 156);
    OPTIONS.forEach((o, i) => {
      const y = 38 + i * 22;
      drawText(ctx, o.label, 24, y);
      const idx = o.get(s);
      let x = 118;
      o.values.forEach((v, j) => {
        const shown = o.values.length > 3 ? j === idx : true;
        if (!shown) return;
        drawText(ctx, v, x, y, j === idx ? COLORS.highlight : COLORS.disabled);
        x += o.values.length > 3 ? 0 : 44;
      });
      if (o.values.length > 3) {
        drawText(ctx, '<', 108, y, COLORS.dim);
        drawText(ctx, '>', 170, y, COLORS.dim);
        // swatches for every window theme
        THEME_ORDER.forEach((t, j) => {
          ctx.fillStyle = WINDOW_THEMES[t].top;
          ctx.fillRect(184 + j * 13, y, 10, 4);
          ctx.fillStyle = WINDOW_THEMES[t].bottom;
          ctx.fillRect(184 + j * 13, y + 4, 10, 4);
          if (j === idx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(184 + j * 13, y + 10, 10, 1);
          }
        });
      }
    });
    drawCursor(ctx, 22, 41 + this.cursor.index * 22);
    drawWindow(ctx, 0, 182, GAME_WIDTH, 42);
    drawText(ctx, session.touch ? 'Left / Right (or A) to change. B to go back.' : 'Left / Right (or Z) to change. X to go back.', 12, 190, COLORS.dim);
    drawText(ctx, 'Settings are saved automatically.', 12, 203, COLORS.dim);
  }
}
