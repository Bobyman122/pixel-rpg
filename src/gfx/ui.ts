import { Clock } from '@/engine/GameLoop';
import { makeCanvas, Pixels } from './canvas';
import { mix } from './color';
import { drawText } from './font';

export type WindowTheme = 'azure' | 'crimson' | 'forest' | 'slate' | 'violet';

export const WINDOW_THEMES: Record<WindowTheme, { name: string; top: string; bottom: string }> = {
  azure: { name: 'Azure', top: '#5470e0', bottom: '#121a70' },
  crimson: { name: 'Crimson', top: '#cc4858', bottom: '#3c0c1c' },
  forest: { name: 'Forest', top: '#3c9c66', bottom: '#0a3020' },
  slate: { name: 'Slate', top: '#6c7486', bottom: '#161a28' },
  violet: { name: 'Violet', top: '#8656cc', bottom: '#240e48' },
};

export const THEME_ORDER: WindowTheme[] = ['azure', 'crimson', 'forest', 'slate', 'violet'];

export const COLORS = {
  text: '#f8f8f8',
  dim: '#9890b8',
  disabled: '#686088',
  gold: '#f8d860',
  highlight: '#ffe890',
  hp: '#78e070',
  hpLow: '#f8c040',
  hpCrit: '#f85848',
  mp: '#78b8f8',
  heal: '#80f890',
  damage: '#f8f8f8',
  bad: '#f87868',
  good: '#78f0a0',
};

let theme: WindowTheme = 'azure';
const windowCache = new Map<string, HTMLCanvasElement>();

export function setWindowTheme(t: WindowTheme) {
  theme = t;
}

export function getWindowTheme() {
  return theme;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  for (let row = 0; row < h; row++) {
    let inset = 0;
    if (r === 2) inset = row === 0 || row === h - 1 ? 2 : row === 1 || row === h - 2 ? 1 : 0;
    else if (r === 1) inset = row === 0 || row === h - 1 ? 1 : 0;
    ctx.fillRect(x + inset, y + row, w - inset * 2, 1);
  }
}

function buildWindow(w: number, h: number, t: WindowTheme): HTMLCanvasElement {
  const [canvas, ctx] = makeCanvas(w, h);
  const colors = WINDOW_THEMES[t];
  ctx.fillStyle = '#080814';
  roundRect(ctx, 0, 0, w, h, 2);
  ctx.fillStyle = '#e8e8f4';
  roundRect(ctx, 1, 1, w - 2, h - 2, 1);
  ctx.fillStyle = '#9898b8';
  roundRect(ctx, 2, 2, w - 4, h - 4, 1);
  const innerH = h - 6;
  for (let row = 0; row < innerH; row++) {
    ctx.fillStyle = mix(colors.top, colors.bottom, innerH <= 1 ? 0 : row / (innerH - 1));
    ctx.fillRect(3, 3 + row, w - 6, 1);
  }
  // A faint inner shadow along the top-left edge gives the bevel some depth.
  ctx.fillStyle = 'rgba(0,0,20,0.25)';
  ctx.fillRect(3, 3, w - 6, 1);
  ctx.fillRect(3, 3, 1, h - 6);
  return canvas;
}

export function drawWindow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, t = theme) {
  const key = `${w}x${h}:${t}`;
  let c = windowCache.get(key);
  if (!c) {
    c = buildWindow(w, h, t);
    windowCache.set(key, c);
  }
  ctx.drawImage(c, Math.round(x), Math.round(y));
}

// --- Cursor ---------------------------------------------------------------

const HAND = [
  '...ooooo......',
  '..owwwwwooooo.',
  '.owgwwwwwwwwwo',
  '.owgwwwggggggo',
  '.owgwwwooooo..',
  '.owgwwwwwwo...',
  '.owgwwwgggo...',
  '.owgwwwwwwo...',
  '..owwwwwwo....',
  '...oooooo.....',
];

let handCanvas: HTMLCanvasElement | null = null;

/** The pointing-glove cursor. (x, y) is the fingertip; it bobs on its own. */
export function drawCursor(ctx: CanvasRenderingContext2D, x: number, y: number, still = false) {
  if (!handCanvas) {
    const p = new Pixels(14, 10);
    p.stamp(HAND, { o: '#201830', w: '#f8f8f8', g: '#b8b8d0' });
    handCanvas = p.toCanvas();
  }
  const bob = still ? 0 : Math.round(Math.sin(Clock.time * 9) * 1);
  ctx.drawImage(handCanvas, Math.round(x - 14 + bob), Math.round(y - 4));
}

/** Small "more text" arrow at the bottom of dialogue boxes. */
export function drawMoreArrow(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const bob = Math.round(Math.abs(Math.sin(Clock.time * 5)) * 2);
  const rows = ['#######', '.#####.', '..###..', '...#...'];
  for (const [col, off] of [
    ['#181030', 1],
    ['#f8f8f8', 0],
  ] as const) {
    ctx.fillStyle = col;
    rows.forEach((r, ry) => {
      for (let rx = 0; rx < r.length; rx++) if (r[rx] === '#') ctx.fillRect(x + rx + off, y + ry + bob + off, 1, 1);
    });
  }
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
  ctx.fillStyle = '#080814';
  ctx.fillRect(x, y, w, 4);
  ctx.fillStyle = '#302848';
  ctx.fillRect(x + 1, y + 1, w - 2, 2);
  const fillW = Math.round((w - 2) * r);
  if (fillW <= 0) return;
  const col = kind === 'hp' ? hpColor(r) : kind === 'mp' ? COLORS.mp : COLORS.gold;
  ctx.fillStyle = col;
  ctx.fillRect(x + 1, y + 1, fillW, 2);
  ctx.fillStyle = mix(col, '#ffffff', 0.5);
  ctx.fillRect(x + 1, y + 1, fillW, 1);
}

// --- Icons ----------------------------------------------------------------

const FLASK = ['...bb...', '...gg...', '..gLLg..', '.gLLLLg.', '.gLwLDg.', '.gLLDDg.', '.gDDDDg.', '..gggg..'];

const ICONS: Record<string, { rows: string[]; pal: Record<string, string> }> = {
  potion: { rows: FLASK, pal: { b: '#9a6838', g: '#d8e8f8', L: '#f06060', D: '#a01830', w: '#fff0f0' } },
  hipotion: { rows: FLASK, pal: { b: '#9a6838', g: '#d8e8f8', L: '#f8b050', D: '#b85810', w: '#fff8e0' } },
  ether: { rows: FLASK, pal: { b: '#9a6838', g: '#d8e8f8', L: '#60a8f8', D: '#1838a0', w: '#f0f8ff' } },
  antidote: { rows: FLASK, pal: { b: '#9a6838', g: '#d8e8f8', L: '#70d870', D: '#207830', w: '#f0fff0' } },
  feather: {
    rows: ['......oy', '.....oyy', '....oyyr', '...oyyr.', '..oyyr..', '.oyrr...', '.wr.....', 'w.......'],
    pal: { o: '#c04018', y: '#f8d848', r: '#f07828', w: '#f8f8f8' },
  },
  sword: {
    rows: ['......ww', '.....wsw', '....wsw.', '.y.wsw..', '..ysw...', '..by....', '.b..y...', 'b.......'],
    pal: { w: '#f0f0f8', s: '#8890b0', y: '#e8c040', b: '#7a4a28' },
  },
  dagger: {
    rows: ['........', '......ww', '.....wsw', '....wsw.', '..yws...', '...y....', '..b.....', '.b......'],
    pal: { w: '#f0f0f8', s: '#8890b0', y: '#e8c040', b: '#7a4a28' },
  },
  staff: {
    rows: ['.....oo.', '....oOOo', '....oOOo', '....boo.', '...b....', '..b.....', '.b......', 'b.......'],
    pal: { o: '#4890e0', O: '#c8f0ff', b: '#a8743c' },
  },
  armor: {
    rows: ['.aa..aa.', 'aAAaaAAa', 'aAAAAAAa', '.aAAAAa.', '.aAkkAa.', '.aAAAAa.', '.aaaaaa.', '........'],
    pal: { a: '#6a3c20', A: '#b07840', k: '#d8a060' },
  },
  mail: {
    rows: ['.aa..aa.', 'aAAaaAAa', 'aAkAAkAa', '.aAAAAa.', '.akAAka.', '.aAAAAa.', '.aaaaaa.', '........'],
    pal: { a: '#505870', A: '#a8b0c8', k: '#e0e8f8' },
  },
  robe: {
    rows: ['..aaaa..', '.aAAAAa.', 'aAAyyAAa', '.aAAAAa.', '.aAAAAa.', 'aAAAAAAa', 'ayyyyyya', '........'],
    pal: { a: '#3c2c7c', A: '#7a5ad0', y: '#e8c040' },
  },
  ring: {
    rows: ['...rr...', '..rRRr..', '..yrry..', '.y....y.', '.y....y.', '.y....y.', '..yyyy..', '........'],
    pal: { r: '#c02838', R: '#ff8090', y: '#e8c040' },
  },
  amulet: {
    rows: ['y......y', '.y....y.', '..y..y..', '...yy...', '..gGGg..', '..gGWg..', '...gg...', '........'],
    pal: { y: '#e8c040', g: '#3870d0', G: '#78b0f8', W: '#e8f8ff' },
  },
  boots: {
    rows: ['..bbb...', '..bBb...', '..bBb...', '..bBb...', '..bBBbb.', '.bBBBBBb', '.bbbbbbb', '........'],
    pal: { b: '#5a3418', B: '#a06838' },
  },
  crystal: {
    rows: ['...cc...', '..cCWc..', '.cCCWCc.', '.cCCCCc.', '.cDCCDc.', '..cDDc..', '...cc...', '........'],
    pal: { c: '#2858c8', C: '#78c8f8', W: '#f0ffff', D: '#4890e0' },
  },
  coin: {
    rows: ['.yyy.', 'yYYYy', 'yYyYy', 'yYYYy', '.yyy.'],
    pal: { y: '#b88018', Y: '#f8d848' },
  },
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

const iconCache = new Map<string, HTMLCanvasElement>();

export function drawIcon(ctx: CanvasRenderingContext2D, id: string, x: number, y: number) {
  let c = iconCache.get(id);
  if (!c) {
    const def = ICONS[id];
    if (!def) return;
    const p = new Pixels(def.rows[0].length, def.rows.length);
    p.stamp(def.rows, def.pal);
    c = p.toCanvas();
    iconCache.set(id, c);
  }
  ctx.drawImage(c, Math.round(x), Math.round(y));
}

export function iconExists(id: string) {
  return id in ICONS;
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
