import { makeCanvas } from './canvas';
import { GLYPHS, GLYPH_ALIASES, GLYPH_HEIGHT } from './fontData';

export const LINE_HEIGHT = 12;
/** Drop shadow under text; follows the window theme so it reads on light and dark panels. */
let textShadow = '#1c1a14';
/** Colour used when a caller doesn't pick one; follows the window theme too. */
let textColor = '#f8f0e0';

export function setTextColors(color: string, shadow: string) {
  textColor = color;
  textShadow = shadow;
}
const SPACING = 1;

interface GlyphInfo {
  x: number;
  w: number;
}

let info: Map<string, GlyphInfo> | null = null;
let base: HTMLCanvasElement | null = null;
const tinted = new Map<string, HTMLCanvasElement>();

function buildAtlas() {
  info = new Map();
  let x = 0;
  for (const [ch, rows] of Object.entries(GLYPHS)) {
    info.set(ch, { x, w: rows[0].length });
    x += rows[0].length + 1;
  }
  const [canvas, ctx] = makeCanvas(x, GLYPH_HEIGHT);
  ctx.fillStyle = '#fff';
  for (const [ch, rows] of Object.entries(GLYPHS)) {
    const gx = info.get(ch)!.x;
    rows.forEach((row, ry) => {
      for (let rx = 0; rx < row.length; rx++) if (row[rx] === '#') ctx.fillRect(gx + rx, ry, 1, 1);
    });
  }
  base = canvas;
}

function atlas(color: string): HTMLCanvasElement {
  if (!base) buildAtlas();
  let c = tinted.get(color);
  if (!c) {
    const [canvas, ctx] = makeCanvas(base!.width, base!.height);
    ctx.drawImage(base!, 0, 0);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    tinted.set(color, canvas);
    c = canvas;
  }
  return c;
}

export function normalizeText(text: string): string {
  return text.replace(/[‘’“”–—…]/g, (m) => GLYPH_ALIASES[m] ?? m);
}

function glyphFor(ch: string): string {
  return GLYPHS[ch] ? ch : '?';
}

export function glyphWidth(ch: string): number {
  return GLYPHS[glyphFor(ch)][0].length;
}

export function measureText(text: string): number {
  const t = normalizeText(text);
  let w = 0;
  for (const ch of t) w += glyphWidth(ch) + SPACING;
  return Math.max(0, w - SPACING);
}

export interface TextOpts {
  shadow?: string | null;
  align?: 'left' | 'center' | 'right';
}

export function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color = textColor,
  opts: TextOpts = {},
) {
  const t = normalizeText(text);
  if (!info) buildAtlas();
  let px = Math.round(x);
  const py = Math.round(y);
  if (opts.align === 'center') px -= Math.floor(measureText(t) / 2);
  else if (opts.align === 'right') px -= measureText(t);

  const shadow = opts.shadow === undefined ? textShadow : opts.shadow;
  const passes: [string, number][] = shadow ? [[shadow, 1], [color, 0]] : [[color, 0]];
  for (const [col, off] of passes) {
    const sheet = atlas(col);
    let cx = px;
    for (const raw of t) {
      const g = info!.get(glyphFor(raw))!;
      ctx.drawImage(sheet, g.x, 0, g.w, GLYPH_HEIGHT, cx + off, py + off, g.w, GLYPH_HEIGHT);
      cx += g.w + SPACING;
    }
  }
}

/** Greedy word wrap by pixel width. Respects explicit "\n". */
export function wrapText(text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const para of normalizeText(text).split('\n')) {
    const words = para.split(' ');
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (measureText(candidate) <= maxWidth || !line) {
        line = candidate;
      } else {
        lines.push(line);
        line = word;
      }
    }
    lines.push(line);
  }
  return lines;
}

/**
 * Large logo text: glyphs at 2x, filled with a vertical gradient and wrapped
 * in a two-tone outline. Returned as a canvas so it can be cached.
 */
export function renderLogo(text: string, gradient: string[], outline: string, shadow: string, scale = 2): HTMLCanvasElement {
  if (!info) buildAtlas();
  const w = measureText(text) * scale + 6;
  const h = GLYPH_HEIGHT * scale + 6;
  const [fillC, fctx] = makeCanvas(w, h);
  let cx = 3;
  for (const ch of normalizeText(text)) {
    const g = info!.get(glyphFor(ch))!;
    fctx.drawImage(base!, g.x, 0, g.w, GLYPH_HEIGHT, cx, 3, g.w * scale, GLYPH_HEIGHT * scale);
    cx += (g.w + SPACING) * scale;
  }
  // Gradient in hard bands, applied in one composite so earlier bands survive.
  const [grad, gctx] = makeCanvas(w, h);
  const bandH = (7 * scale) / gradient.length;
  gradient.forEach((col, i) => {
    gctx.fillStyle = col;
    gctx.fillRect(0, 3 + Math.floor(i * bandH), w, i === gradient.length - 1 ? h : Math.ceil(bandH));
  });
  gctx.fillStyle = gradient[0];
  gctx.fillRect(0, 0, w, 3);
  fctx.globalCompositeOperation = 'source-in';
  fctx.drawImage(grad, 0, 0);

  const [out, octx] = makeCanvas(w + 2, h + 3);
  const sil = (color: string) => {
    const [c, cctx] = makeCanvas(w, h);
    cctx.drawImage(fillC, 0, 0);
    cctx.globalCompositeOperation = 'source-in';
    cctx.fillStyle = color;
    cctx.fillRect(0, 0, w, h);
    return c;
  };
  const shadowSil = sil(shadow);
  const outlineSil = sil(outline);
  for (const [dx, dy] of [
    [1, 3],
    [2, 3],
    [0, 3],
  ]) {
    octx.drawImage(shadowSil, dx, dy);
  }
  for (const [dx, dy] of [
    [0, 1],
    [2, 1],
    [1, 0],
    [1, 2],
    [0, 0],
    [2, 0],
    [0, 2],
    [2, 2],
  ]) {
    octx.drawImage(outlineSil, dx, dy);
  }
  octx.drawImage(fillC, 1, 1);
  return out;
}
