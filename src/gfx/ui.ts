import { img } from '@/engine/assets';
import { Clock } from '@/engine/GameLoop';
import { makeCanvas, stampCanvas } from './canvas';
import { mix } from './color';
import { drawText, setTextColors } from './font';

export type WindowTheme = 'wood' | 'maple' | 'iron' | 'ember' | 'moss' | 'parchment';

interface ThemeDef {
  name: string;
  text: string;
  dim: string;
  disabled: string;
  highlight: string;
  shadow: string;
  /** Light panels need darker versions of the bright accent colours. */
  light?: boolean;
  /** Size of the nine-patch corners inside the 16x16 panel image. */
  corner: number;
}

export const WINDOW_THEMES: Record<WindowTheme, ThemeDef> = {
  wood: { name: 'Wood', text: '#f8f0e0', dim: '#c8b89a', disabled: '#7c7462', highlight: '#ffd870', shadow: '#1c1a14', corner: 6 },
  maple: { name: 'Maple', text: '#ffffff', dim: '#ffe0c0', disabled: '#c08a68', highlight: '#fff3a0', shadow: '#6a2e1e', corner: 6 },
  iron: { name: 'Iron', text: '#eef6f4', dim: '#94b4b0', disabled: '#5a6866', highlight: '#9ff0e0', shadow: '#060a0a', corner: 6 },
  ember: { name: 'Ember', text: '#f8ece0', dim: '#e0a898', disabled: '#7c6660', highlight: '#ffc070', shadow: '#1c1414', corner: 6 },
  moss: { name: 'Moss', text: '#f4f0d8', dim: '#c4c09a', disabled: '#7a7a60', highlight: '#f8e070', shadow: '#1a1c12', corner: 6 },
  parchment: {
    name: 'Parchment',
    text: '#3a2418',
    dim: '#7a5a40',
    disabled: '#b09878',
    highlight: '#b83818',
    shadow: '#f8e8c8',
    corner: 6,
    light: true,
  },
};

export const THEME_ORDER: WindowTheme[] = ['wood', 'maple', 'iron', 'ember', 'moss', 'parchment'];

/**
 * Text colours for whatever window theme is active. Theme-independent colours
 * (HP, MP, gold...) are bright enough to read on every panel.
 */
export const COLORS = {
  text: '#f8f0e0',
  dim: '#c8b89a',
  disabled: '#7c7462',
  gold: '#ffd040',
  highlight: '#ffd870',
  hp: '#78e070',
  hpLow: '#f8c040',
  hpCrit: '#f85848',
  mp: '#70b8ff',
  heal: '#80f890',
  damage: '#ffffff',
  bad: '#ff7868',
  good: '#70f0a0',
};

/** Colours for text drawn straight onto the game world (not inside a window). */
export const WORLD_TEXT = { text: '#ffffff', shadow: '#1a1020' };

let theme: WindowTheme = 'wood';
const windowCache = new Map<string, HTMLCanvasElement>();

const ACCENTS = {
  dark: { gold: '#ffd040', mp: '#70b8ff', good: '#70f0a0', bad: '#ff7868', heal: '#80f890' },
  light: { gold: '#a86400', mp: '#2860c0', good: '#1f8a3a', bad: '#c02818', heal: '#1f8a3a' },
};

export function setWindowTheme(t: WindowTheme) {
  theme = WINDOW_THEMES[t] ? t : 'wood';
  const def = WINDOW_THEMES[theme];
  COLORS.text = def.text;
  COLORS.dim = def.dim;
  COLORS.disabled = def.disabled;
  COLORS.highlight = def.highlight;
  Object.assign(COLORS, def.light ? ACCENTS.light : ACCENTS.dark);
  setTextColors(def.text, def.shadow);
}

export function getWindowTheme() {
  return theme;
}

/** Stretch a 16x16 nine-patch panel to any size. */
function buildWindow(w: number, h: number, t: WindowTheme): HTMLCanvasElement {
  const [canvas, ctx] = makeCanvas(w, h);
  const src = img(`ui/panel-${t}`);
  const c = WINDOW_THEMES[t].corner;
  const S = src.width;
  const m = S - c * 2;
  const iw = w - c * 2;
  const ih = h - c * 2;
  ctx.drawImage(src, 0, 0, c, c, 0, 0, c, c);
  ctx.drawImage(src, S - c, 0, c, c, w - c, 0, c, c);
  ctx.drawImage(src, 0, S - c, c, c, 0, h - c, c, c);
  ctx.drawImage(src, S - c, S - c, c, c, w - c, h - c, c, c);
  if (iw > 0) {
    ctx.drawImage(src, c, 0, m, c, c, 0, iw, c);
    ctx.drawImage(src, c, S - c, m, c, c, h - c, iw, c);
  }
  if (ih > 0) {
    ctx.drawImage(src, 0, c, c, m, 0, c, c, ih);
    ctx.drawImage(src, S - c, c, c, m, w - c, c, c, ih);
  }
  if (iw > 0 && ih > 0) ctx.drawImage(src, c, c, m, m, c, c, iw, ih);
  return canvas;
}

export function drawWindow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, t = theme) {
  const key = `${w}x${h}:${t}`;
  let c = windowCache.get(key);
  if (!c) {
    c = buildWindow(Math.round(w), Math.round(h), t);
    windowCache.set(key, c);
  }
  ctx.drawImage(c, Math.round(x), Math.round(y));
}

/** Soft highlight bar behind the selected row of a list. */
export function drawSelection(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const pulse = 0.14 + Math.sin(Clock.time * 5) * 0.04;
  ctx.fillStyle = theme === 'parchment' ? `rgba(184,56,24,${pulse})` : `rgba(255,236,170,${pulse})`;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

// --- Cursor ---------------------------------------------------------------

let rightArrow: HTMLCanvasElement | null = null;

/** The pack's arrow (it points down), turned to point at menu entries. (x, y) is the tip; it bobs on its own. */
export function drawCursor(ctx: CanvasRenderingContext2D, x: number, y: number, still = false) {
  if (!rightArrow) {
    const src = img('ui/arrow');
    const [c, cctx] = makeCanvas(src.height, src.width);
    cctx.translate(0, src.width);
    cctx.rotate(-Math.PI / 2);
    cctx.drawImage(src, 0, 0);
    rightArrow = c;
  }
  const bob = still ? 0 : Math.round(Math.sin(Clock.time * 9) * 1);
  ctx.drawImage(rightArrow, Math.round(x - rightArrow.width + bob), Math.round(y - rightArrow.height / 2));
}

/** Small "more text" arrow at the bottom of dialogue boxes. */
export function drawMoreArrow(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const bob = Math.round(Math.abs(Math.sin(Clock.time * 5)) * 2);
  ctx.drawImage(img('ui/arrow'), Math.round(x - 6), Math.round(y - 6 + bob));
}

// --- Gauges ---------------------------------------------------------------

export function hpColor(ratio: number) {
  return ratio > 0.5 ? COLORS.hp : ratio > 0.25 ? COLORS.hpLow : COLORS.hpCrit;
}

export function drawGauge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  ratio: number,
  kind: 'hp' | 'mp' | 'exp' = 'hp',
) {
  const r = Math.max(0, Math.min(1, ratio));
  x = Math.round(x);
  y = Math.round(y);
  ctx.fillStyle = '#1a1214';
  ctx.fillRect(x, y, w, 5);
  ctx.fillStyle = '#3e3034';
  ctx.fillRect(x + 1, y + 1, w - 2, 3);
  const fillW = Math.round((w - 2) * r);
  if (fillW <= 0) return;
  const col = kind === 'hp' ? hpColor(r) : kind === 'mp' ? COLORS.mp : COLORS.gold;
  ctx.fillStyle = col;
  ctx.fillRect(x + 1, y + 1, fillW, 3);
  ctx.fillStyle = mix(col, '#ffffff', 0.45);
  ctx.fillRect(x + 1, y + 1, fillW, 1);
  ctx.fillStyle = mix(col, '#000000', 0.25);
  ctx.fillRect(x + 1, y + 3, fillW, 1);
}

// --- Icons ----------------------------------------------------------------

/** Item icons packed by the asset build into ui/icons.png: [x, y, w, h]. */
const ATLAS: Record<string, [number, number, number, number]> = {
  potion: [7, 6, 9, 11],
  hipotion: [31, 7, 10, 10],
  ether: [55, 6, 9, 11],
  antidote: [76, 4, 16, 16],
  feather: [100, 4, 16, 16],
  sword: [129, 4, 6, 15],
  staff: [153, 3, 5, 18],
  dagger: [176, 6, 7, 12],
  armor: [193, 2, 21, 19],
  mail: [220, 3, 16, 18],
  robe: [245, 5, 14, 14],
  ring: [268, 3, 16, 18],
  amulet: [292, 1, 16, 22],
  boots: [318, 4, 12, 16],
  crystal: [341, 5, 14, 14],
  coin: [368, 8, 7, 7],
  key: [390, 8, 12, 8],
};

/** Tiny status markers drawn in code (the pack has no icons this small). */
const STATUS: Record<string, { rows: string[]; pal: Record<string, string> }> = {
  poison: {
    rows: ['...g...', '..ggg..', '.ggGgg.', '.gGGGg.', '.gGGGg.', '..ggg..'],
    pal: { g: '#208838', G: '#80e070' },
  },
  sleep: {
    rows: ['zzzz...', '..z....', '.z..zzz', 'zzzz.z.', '....zzz'],
    pal: { z: '#a8c8ff' },
  },
  shield: {
    rows: ['sssss', 'sSSSs', 'sSWSs', 'sSSSs', '.sSs.', '..s..'],
    pal: { s: '#304890', S: '#78a0f0', W: '#e0f0ff' },
  },
  defup: {
    rows: ['..y..', '.yyy.', 'yyyyy', '.yyy.', '.yyy.'],
    pal: { y: '#f8c840' },
  },
};

const statusCache = new Map<string, HTMLCanvasElement>();

/**
 * Draw an item icon centred in the 16x16 box whose top-left is (x, y).
 * Status markers are small and drawn at (x, y) directly.
 */
export function drawIcon(ctx: CanvasRenderingContext2D, id: string, x: number, y: number) {
  const a = ATLAS[id];
  if (a) {
    const [sx, sy, w, h] = a;
    ctx.drawImage(img('ui/icons'), sx, sy, w, h, Math.round(x + (16 - w) / 2), Math.round(y + (16 - h) / 2), w, h);
    return;
  }
  const def = STATUS[id];
  if (!def) return;
  let c = statusCache.get(id);
  if (!c) {
    c = stampCanvas(def.rows, def.pal);
    statusCache.set(id, c);
  }
  ctx.drawImage(c, Math.round(x), Math.round(y));
}

export function iconExists(id: string) {
  return id in ATLAS || id in STATUS;
}

/** "Label ....... value" row used throughout menus. */
export function drawLabelValue(
  ctx: CanvasRenderingContext2D,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number,
  labelColor: string = COLORS.dim,
  valueColor: string = COLORS.text,
) {
  drawText(ctx, label, x, y, labelColor);
  drawText(ctx, value, x + width, y, valueColor, { align: 'right' });
}

/** Portrait in the pack's wooden frame (48x48). */
export function drawPortrait(ctx: CanvasRenderingContext2D, face: CanvasImageSource, x: number, y: number) {
  ctx.drawImage(img('ui/facebox'), Math.round(x), Math.round(y));
  ctx.drawImage(face, Math.round(x) + 5, Math.round(y) + 5);
}
