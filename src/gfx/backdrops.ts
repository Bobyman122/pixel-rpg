import type { Backdrop } from '@/types';
import { makeCanvas, Pixels, rng } from './canvas';
import { mix } from './color';

export const BATTLE_FIELD_H = 152;

function px(ctx: CanvasRenderingContext2D, x: number, y: number, c: string, w = 1, h = 1) {
  ctx.fillStyle = c;
  ctx.fillRect(x, y, w, h);
}

function gradientRows(ctx: CanvasRenderingContext2D, y0: number, y1: number, top: string, bottom: string, w = 256) {
  for (let y = y0; y < y1; y++) px(ctx, 0, y, mix(top, bottom, (y - y0) / Math.max(1, y1 - y0 - 1)), w, 1);
}

/** Ground drawn as horizontal bands that thicken toward the viewer. */
function perspectiveGround(ctx: CanvasRenderingContext2D, y0: number, y1: number, a: string, b: string) {
  let y = y0;
  let h = 1;
  let i = 0;
  while (y < y1) {
    px(ctx, 0, y, i % 2 === 0 ? a : b, 256, Math.min(h, y1 - y));
    y += h;
    i++;
    if (i % 2 === 0) h += 1;
  }
}

function cloud(ctx: CanvasRenderingContext2D, cx: number, cy: number, scale: number, light: string, shade: string) {
  const p = new Pixels(Math.ceil(48 * scale), Math.ceil(20 * scale));
  const m = p
    .mask()
    .ellipse(14 * scale, 13 * scale, 12 * scale, 6 * scale)
    .ellipse(26 * scale, 9 * scale, 11 * scale, 8 * scale)
    .ellipse(37 * scale, 13 * scale, 10 * scale, 5.5 * scale);
  p.shade(m, [shade, mix(shade, light, 0.5), light, '#ffffff'], { depth: 3, directional: 0.7 });
  ctx.drawImage(p.toCanvas(), Math.round(cx), Math.round(cy));
}

function mountains(ctx: CanvasRenderingContext2D, baseY: number, color: string, cap: string | null, seed: number, height: number) {
  const r = rng(seed);
  const peaks: [number, number][] = [];
  let x = -20;
  while (x < 280) {
    peaks.push([x, baseY - height * (0.45 + r() * 0.55)]);
    x += 24 + r() * 30;
  }
  for (let px0 = 0; px0 < 256; px0++) {
    let top = baseY;
    for (const [pxk, py] of peaks) {
      const d = Math.abs(px0 - pxk);
      const yy = py + d * 0.9;
      if (yy < top) top = yy;
    }
    px(ctx, px0, Math.round(top), color, 1, Math.ceil(baseY - top) + 1);
    if (cap) {
      for (const [pxk, py] of peaks) {
        const d = Math.abs(px0 - pxk);
        if (py < baseY - height * 0.7 && d < 5) px(ctx, px0, Math.round(py + d * 0.9), cap, 1, Math.max(1, 3 - Math.floor(d / 2)));
      }
    }
  }
}

function treeLine(ctx: CanvasRenderingContext2D, baseY: number, dark: string, light: string, seed: number) {
  const r = rng(seed);
  for (let x = -8; x < 264; x += 6 + Math.floor(r() * 5)) {
    const h = 8 + Math.floor(r() * 10);
    const w = 6 + Math.floor(r() * 5);
    for (let y = 0; y < h; y++) {
      const half = Math.round((w / 2) * Math.min(1, (y + 2) / (h * 0.55)));
      px(ctx, x - half, baseY - h + y, y < 2 ? light : dark, half * 2 + 1, 1);
    }
  }
  px(ctx, 0, baseY, dark, 256, 3);
}

function field(): HTMLCanvasElement {
  const [canvas, ctx] = makeCanvas(256, BATTLE_FIELD_H);
  gradientRows(ctx, 0, 74, '#3c64d0', '#b4e0f8');
  cloud(ctx, 14, 6, 1, '#f8fcff', '#a8c4e8');
  cloud(ctx, 150, 16, 0.8, '#f8fcff', '#a8c4e8');
  cloud(ctx, 210, 2, 0.6, '#f8fcff', '#a8c4e8');
  mountains(ctx, 66, '#7c98cc', '#e8f0ff', 7, 34);
  mountains(ctx, 70, '#5c80b0', null, 19, 22);
  treeLine(ctx, 74, '#2a5c3a', '#3e7a48', 3);
  perspectiveGround(ctx, 77, BATTLE_FIELD_H, '#5aaa48', '#4e9c40');
  const r = rng(99);
  for (let i = 0; i < 40; i++) {
    const x = Math.floor(r() * 256);
    const y = 80 + Math.floor(r() * 70);
    px(ctx, x + 1, y, '#80c860');
    px(ctx, x, y + 1, '#3a8034');
    px(ctx, x + 2, y + 1, '#3a8034');
  }
  for (let i = 0; i < 10; i++) {
    const x = Math.floor(r() * 256);
    const y = 90 + Math.floor(r() * 60);
    const c = ['#f8f0f0', '#f87890', '#f8d850'][i % 3];
    px(ctx, x, y, c);
    px(ctx, x - 1, y + 1, c, 3, 1);
    px(ctx, x, y + 2, c);
  }
  // foreground canopy framing the top corners
  for (const [cx, flip] of [
    [0, false],
    [256, true],
  ] as const) {
    const p = new Pixels(60, 40);
    const m = p.mask();
    m.ellipse(flip ? 52 : 8, 4, 30, 18).ellipse(flip ? 34 : 26, 0, 22, 12);
    p.shade(m, ['#122c18', '#1c4424', '#28602c', '#3a7c36'], { depth: 5, directional: 0.5 });
    p.outline('#0c1810');
    ctx.drawImage(p.toCanvas(), flip ? cx - 60 : cx, 0);
  }
  return canvas;
}

function cave(lair: boolean): HTMLCanvasElement {
  const [canvas, ctx] = makeCanvas(256, BATTLE_FIELD_H);
  const top = lair ? '#140818' : '#0c0a18';
  const mid = lair ? '#3a1430' : '#262040';
  gradientRows(ctx, 0, 80, top, mid);
  const r = rng(lair ? 5 : 11);
  // rock texture blobs on the back wall
  for (let i = 0; i < 26; i++) {
    const p = new Pixels(30, 18);
    const m = p.mask().ellipse(15, 9, 8 + r() * 6, 4 + r() * 4);
    const base = lair ? ['#1c0c1c', '#2c1428', '#40203a', '#562c48'] : ['#16122a', '#221c3a', '#30284c', '#40365e'];
    p.shade(m, base, { depth: 3 });
    ctx.drawImage(p.toCanvas(), Math.floor(r() * 256) - 15, Math.floor(r() * 64));
  }
  // stalactites
  for (let x = 4; x < 256; x += 14 + Math.floor(r() * 18)) {
    const h = 10 + Math.floor(r() * 22);
    const w = 3 + Math.floor(r() * 4);
    for (let y = 0; y < h; y++) {
      const half = Math.max(0, Math.round(w * (1 - y / h)));
      px(ctx, x - half, y, lair ? '#2a1424' : '#1c1830', half * 2 + 1, 1);
      if (half > 0) px(ctx, x - half, y, lair ? '#4a2440' : '#3a3254', 1, 1);
    }
  }
  // embedded crystals
  const crystal = lair ? ['#601830', '#a02848', '#e04868', '#ff98a8'] : ['#2a3a9c', '#3c68d8', '#68a8f8', '#c8ecff'];
  for (let i = 0; i < 6; i++) {
    const x = 10 + Math.floor(r() * 236);
    const y = 26 + Math.floor(r() * 40);
    const p = new Pixels(10, 14);
    p.shade(
      p.mask().poly([
        [5, 0],
        [9, 6],
        [5, 13],
        [1, 6],
      ]),
      crystal,
      { depth: 2, directional: 0.8 },
    );
    p.outline('#0c0818');
    // stepped glow around each crystal
    for (const [r, a] of [
      [14, 0.08],
      [10, 0.12],
      [6, 0.16],
    ]) {
      ctx.globalAlpha = a;
      ctx.fillStyle = crystal[3];
      ctx.beginPath();
      ctx.arc(x + 5, y + 7, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.drawImage(p.toCanvas(), x, y);
  }
  // floor
  perspectiveGround(ctx, 78, BATTLE_FIELD_H, lair ? '#3e2438' : '#3c3650', lair ? '#341e30' : '#332e46');
  px(ctx, 0, 76, lair ? '#1c0c18' : '#16122a', 256, 2);
  for (let i = 0; i < 30; i++) {
    const x = Math.floor(r() * 256);
    const y = 84 + Math.floor(r() * 66);
    px(ctx, x, y, lair ? '#5a3850' : '#58507a', 2, 1);
  }
  for (let i = 0; i < 3; i++) {
    const x = 20 + Math.floor(r() * 210);
    const y = 100 + Math.floor(r() * 40);
    const p = new Pixels(28, 8);
    p.fill(p.mask().ellipse(14, 4, 13, 3), lair ? '#2a0c20' : '#1e2850');
    p.fill(p.mask().ellipse(11, 3, 6, 1), lair ? '#6a2840' : '#4a5c98');
    ctx.drawImage(p.toCanvas(), x, y);
  }
  if (lair) {
    // ritual circle on the floor
    const cx = 128;
    const cy = 116;
    for (let a = 0; a < Math.PI * 2; a += 0.01) {
      for (const [rx, ry, col] of [
        [96, 26, '#b048e0'],
        [84, 22, '#7828a8'],
      ] as const) {
        px(ctx, Math.round(cx + Math.cos(a) * rx), Math.round(cy + Math.sin(a) * ry), col);
      }
    }
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const x0 = cx + Math.cos(a) * 84;
      const y0 = cy + Math.sin(a) * 22;
      const x1 = cx + Math.cos(a + (Math.PI * 4) / 6) * 84;
      const y1 = cy + Math.sin(a + (Math.PI * 4) / 6) * 22;
      for (let t = 0; t <= 1; t += 0.005) px(ctx, Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), '#6a2098');
    }
  }
  return canvas;
}

const cache = new Map<Backdrop, HTMLCanvasElement>();

export function getBackdrop(kind: Backdrop): HTMLCanvasElement {
  let c = cache.get(kind);
  if (!c) {
    c = kind === 'field' ? field() : cave(kind === 'lair');
    cache.set(kind, c);
  }
  return c;
}

// ---------------------------------------------------------------------------
// Title screen layers
// ---------------------------------------------------------------------------

let titleBg: HTMLCanvasElement | null = null;

export function getTitleBackground(): HTMLCanvasElement {
  if (titleBg) return titleBg;
  const [canvas, ctx] = makeCanvas(256, 224);
  gradientRows(ctx, 0, 120, '#06061a', '#1e1248', 256);
  gradientRows(ctx, 120, 178, '#1e1248', '#5a2a6a', 256);
  gradientRows(ctx, 178, 224, '#5a2a6a', '#8a4466', 256);
  mountains(ctx, 196, '#4a3a86', '#9a8cd4', 23, 60);
  mountains(ctx, 206, '#1c1438', null, 41, 34);
  // village silhouette on a hill with warm windows
  const hill = new Pixels(256, 40);
  hill.fill(hill.mask().ellipse(70, 44, 120, 26), '#120c24');
  ctx.drawImage(hill.toCanvas(), 0, 184);
  const houses: [number, number, number][] = [
    [26, 196, 18],
    [48, 192, 14],
    [66, 194, 20],
    [92, 198, 14],
    [112, 202, 16],
  ];
  for (const [x, y, w] of houses) {
    px(ctx, x, y, '#120c24', w, 30);
    for (let i = 0; i < w / 2 + 2; i++) px(ctx, x - 1 + i, y - i * 0.8, '#120c24', w + 2 - i * 2, 1);
    px(ctx, x + 3, y + 5, '#f8c860', 3, 3);
    if (w > 15) px(ctx, x + w - 6, y + 5, '#f8a848', 3, 3);
  }
  px(ctx, 0, 214, '#0c0818', 256, 10);
  titleBg = canvas;
  return canvas;
}

let bigCrystal: HTMLCanvasElement | null = null;

export function getBigCrystal(): HTMLCanvasElement {
  if (bigCrystal) return bigCrystal;
  const p = new Pixels(30, 48);
  const CR = ['#1c2c8c', '#2c4cc8', '#4c84ec', '#84c0fc', '#c8ecff', '#ffffff'];
  // facets: left (lit), right (shade), bottom
  const left = p.mask().poly([
    [15, 0],
    [15, 30],
    [1, 16],
  ]);
  const right = p.mask().poly([
    [15, 0],
    [29, 16],
    [15, 30],
  ]);
  const bottomL = p.mask().poly([
    [1, 16],
    [15, 30],
    [15, 47],
  ]);
  const bottomR = p.mask().poly([
    [15, 30],
    [29, 16],
    [15, 47],
  ]);
  p.shade(left, CR, { depth: 4, directional: 0.6, bias: 0.25 });
  p.shade(right, CR, { depth: 4, directional: 0.6, bias: -0.05 });
  p.shade(bottomL, CR, { depth: 3, directional: 0.6, bias: 0.05 });
  p.shade(bottomR, CR, { depth: 3, directional: 0.6, bias: -0.3 });
  for (let y = 4; y < 14; y++) p.set(9 + Math.floor((y - 4) / 3), y + 2, '#ffffff');
  p.outline('#0c1040');
  bigCrystal = p.toCanvas();
  return bigCrystal;
}
