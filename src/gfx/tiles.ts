import type { BuildingDef, MapTheme } from '@/types';
import { hash2, makeCanvas, Pixels, rng } from './canvas';
import { mix, shadeColor } from './color';

export type Ground = 'grass' | 'path' | 'cobble' | 'water' | 'bridge' | 'wall' | 'mouth' | 'floor' | 'rune';

export type Prop = 'tree' | 'pine' | 'bush' | 'rock' | 'fence' | 'well' | 'puddle' | 'stalagmite' | 'crystal' | 'torch';

export interface TileInfo {
  ground: Ground;
  solid: boolean;
  prop?: Prop;
  flowers?: boolean;
}

export const TILE_INFO: Record<string, TileInfo> = {
  '.': { ground: 'grass', solid: false },
  ',': { ground: 'grass', solid: false, flowers: true },
  '=': { ground: 'path', solid: false },
  '#': { ground: 'cobble', solid: false },
  '~': { ground: 'water', solid: true },
  _: { ground: 'bridge', solid: false },
  T: { ground: 'grass', solid: true, prop: 'tree' },
  P: { ground: 'grass', solid: true, prop: 'pine' },
  b: { ground: 'grass', solid: true, prop: 'bush' },
  r: { ground: 'grass', solid: true, prop: 'rock' },
  f: { ground: 'grass', solid: true, prop: 'fence' },
  w: { ground: 'cobble', solid: true, prop: 'well' },
  H: { ground: 'grass', solid: true },
  '%': { ground: 'wall', solid: true },
  '!': { ground: 'wall', solid: true, prop: 'torch' },
  C: { ground: 'mouth', solid: false },
  ':': { ground: 'floor', solid: false },
  o: { ground: 'floor', solid: false, prop: 'puddle' },
  s: { ground: 'floor', solid: true, prop: 'stalagmite' },
  '*': { ground: 'floor', solid: true, prop: 'crystal' },
  '^': { ground: 'rune', solid: false },
};

export function tileInfo(ch: string | undefined): TileInfo {
  return (ch && TILE_INFO[ch]) || TILE_INFO['.'];
}

// ---------------------------------------------------------------------------
// Palettes
// ---------------------------------------------------------------------------

interface GrassPal {
  base: string;
  dark: string;
  light: string;
  hi: string;
}

const GRASS: Record<MapTheme, GrassPal> = {
  village: { base: '#5cb046', dark: '#3e8c3a', light: '#80c85a', hi: '#a8e074' },
  forest: { base: '#4a9c42', dark: '#317836', light: '#68b850', hi: '#94d468' },
  cave: { base: '#4a9c42', dark: '#317836', light: '#68b850', hi: '#94d468' },
};

const PATH = { base: '#d4ac6c', dark: '#a8824e', light: '#ecca92', pebble: '#8a6840' };
const COBBLE = { mortar: '#7a726c', stone: '#bab2a8', light: '#ded6c8', dark: '#948c86' };
const WATER = { base: '#3a7ce0', deep: '#2c5cb8', light: '#70b0f8', foam: '#dff4ff', edge: '#24489c' };

const ROCK: Record<MapTheme, { top: string; topLight: string; face: string; faceDark: string; faceLight: string; edge: string }> = {
  village: { top: '#3e8c3a', topLight: '#5cb046', face: '#8c7258', faceDark: '#5e4a3a', faceLight: '#b49474', edge: '#2a2018' },
  forest: { top: '#317836', topLight: '#4a9c42', face: '#8a7058', faceDark: '#5c4838', faceLight: '#b09070', edge: '#28201a' },
  cave: { top: '#251e32', topLight: '#342a44', face: '#5a4c70', faceDark: '#3c3250', faceLight: '#7c6c94', edge: '#100a18' },
};

const FLOOR = { base: '#4e4660', dark: '#3a334a', light: '#645c78', crack: '#2e283c' };

// ---------------------------------------------------------------------------
// Ground tiles
// ---------------------------------------------------------------------------

export interface TileContext {
  theme: MapTheme;
  /** Ground type of the tile at (x, y); out of bounds returns the edge tile's ground. */
  groundAt: (x: number, y: number) => Ground;
  charAt: (x: number, y: number) => string;
}

function px(ctx: CanvasRenderingContext2D, x: number, y: number, c: string, w = 1, h = 1) {
  ctx.fillStyle = c;
  ctx.fillRect(x, y, w, h);
}

function grassy(g: Ground) {
  return g === 'grass';
}

function drawGrassBase(ctx: CanvasRenderingContext2D, ox: number, oy: number, tx: number, ty: number, pal: GrassPal) {
  px(ctx, ox, oy, pal.base, 16, 16);
  const r = rng(tx * 7919 + ty * 104729 + 17);
  // soft darker patches
  for (let i = 0; i < 3; i++) {
    const x = Math.floor(r() * 14);
    const y = Math.floor(r() * 14);
    px(ctx, ox + x, oy + y, mix(pal.base, pal.dark, 0.35), 3, 2);
  }
  // grass tufts:  .l.
  //               d.d
  const tufts = 3 + Math.floor(r() * 3);
  for (let i = 0; i < tufts; i++) {
    const x = Math.floor(r() * 13);
    const y = 1 + Math.floor(r() * 13);
    px(ctx, ox + x + 1, oy + y, pal.light);
    px(ctx, ox + x, oy + y + 1, pal.dark);
    px(ctx, ox + x + 2, oy + y + 1, pal.dark);
  }
  if (r() < 0.35) px(ctx, ox + Math.floor(r() * 16), oy + Math.floor(r() * 16), pal.hi);
}

const FLOWER_COLORS = ['#f8f0f0', '#f87890', '#f8d850', '#a890f8', '#f8a050'];

function drawFlowers(ctx: CanvasRenderingContext2D, ox: number, oy: number, tx: number, ty: number) {
  const r = rng(tx * 31 + ty * 977 + 5);
  const n = 2 + Math.floor(r() * 2);
  for (let i = 0; i < n; i++) {
    const x = 2 + Math.floor(r() * 11);
    const y = 2 + Math.floor(r() * 11);
    const c = FLOWER_COLORS[Math.floor(r() * FLOWER_COLORS.length)];
    px(ctx, ox + x, oy + y - 1, c);
    px(ctx, ox + x - 1, oy + y, c);
    px(ctx, ox + x + 1, oy + y, c);
    px(ctx, ox + x, oy + y + 1, c);
    px(ctx, ox + x, oy + y, '#f8e070');
    px(ctx, ox + x + 1, oy + y + 2, '#2e7030');
  }
}

/**
 * Grass creeping over the edge of a path/cobble/water tile. `shadow` is the
 * one-pixel line where the grass lip meets the lower surface.
 */
function drawGrassEdges(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  tx: number,
  ty: number,
  tc: TileContext,
  pal: GrassPal,
  shadow: string,
  maxDepth = 3,
) {
  const n = grassy(tc.groundAt(tx, ty - 1));
  const s = grassy(tc.groundAt(tx, ty + 1));
  const w = grassy(tc.groundAt(tx - 1, ty));
  const e = grassy(tc.groundAt(tx + 1, ty));
  const depth = (i: number, side: number) => 1 + Math.floor(hash2(tx * 16 + i, ty * 16 + side, 3) * maxDepth);

  for (let i = 0; i < 16; i++) {
    if (n) {
      const d = depth(i, 0);
      px(ctx, ox + i, oy, pal.base, 1, d);
      px(ctx, ox + i, oy + d, shadow);
    }
    if (s) {
      const d = depth(i, 1);
      px(ctx, ox + i, oy + 16 - d, pal.base, 1, d);
      px(ctx, ox + i, oy + 16 - d, pal.dark);
    }
    if (w) {
      const d = depth(i, 2);
      px(ctx, ox, oy + i, pal.base, d, 1);
      px(ctx, ox + d, oy + i, shadow);
    }
    if (e) {
      const d = depth(i, 3);
      px(ctx, ox + 16 - d, oy + i, pal.base, d, 1);
      px(ctx, ox + 16 - d, oy + i, pal.dark);
    }
  }
  // Inner corners: diagonal grass where both sides are open.
  const corner = (cx: number, cy: number) => {
    px(ctx, ox + cx, oy + cy, pal.base, 2, 2);
  };
  if (!n && !w && grassy(tc.groundAt(tx - 1, ty - 1))) corner(0, 0);
  if (!n && !e && grassy(tc.groundAt(tx + 1, ty - 1))) corner(14, 0);
  if (!s && !w && grassy(tc.groundAt(tx - 1, ty + 1))) corner(0, 14);
  if (!s && !e && grassy(tc.groundAt(tx + 1, ty + 1))) corner(14, 14);
}

function drawPath(ctx: CanvasRenderingContext2D, ox: number, oy: number, tx: number, ty: number, tc: TileContext) {
  px(ctx, ox, oy, PATH.base, 16, 16);
  const r = rng(tx * 4241 + ty * 911 + 3);
  for (let i = 0; i < 7; i++) px(ctx, ox + Math.floor(r() * 16), oy + Math.floor(r() * 16), PATH.dark);
  for (let i = 0; i < 4; i++) px(ctx, ox + Math.floor(r() * 16), oy + Math.floor(r() * 16), PATH.light);
  for (let i = 0; i < 2; i++) {
    const x = Math.floor(r() * 14);
    const y = Math.floor(r() * 14);
    px(ctx, ox + x, oy + y, PATH.pebble, 2, 1);
    px(ctx, ox + x, oy + y - 1, PATH.light, 2, 1);
  }
  drawGrassEdges(ctx, ox, oy, tx, ty, tc, GRASS[tc.theme], PATH.dark);
}

function drawCobble(ctx: CanvasRenderingContext2D, ox: number, oy: number, tx: number, ty: number, tc: TileContext) {
  px(ctx, ox, oy, COBBLE.mortar, 16, 16);
  for (let row = 0; row < 4; row++) {
    const y = row * 4;
    let x = -((row + tx + ty) % 2) * 3;
    let k = 0;
    while (x < 16) {
      const w = 4 + Math.floor(hash2(tx * 8 + k, ty * 8 + row, 9) * 3);
      const x0 = Math.max(0, x);
      const x1 = Math.min(16, x + w - 1);
      if (x1 > x0) {
        const tint = hash2(tx + k, ty + row, 11) < 0.25 ? -0.08 : 0;
        px(ctx, ox + x0, oy + y, shadeColor(COBBLE.stone, tint), x1 - x0, 3);
        px(ctx, ox + x0, oy + y, COBBLE.light, x1 - x0, 1);
        px(ctx, ox + x0, oy + y + 2, COBBLE.dark, x1 - x0, 1);
        px(ctx, ox + x1 - 1, oy + y + 1, COBBLE.dark);
      }
      x += w;
      k++;
    }
  }
  drawGrassEdges(ctx, ox, oy, tx, ty, tc, GRASS[tc.theme], '#5a544e', 2);
}

function isWet(g: Ground) {
  return g === 'water' || g === 'bridge';
}

function drawWater(ctx: CanvasRenderingContext2D, ox: number, oy: number, tx: number, ty: number, tc: TileContext) {
  px(ctx, ox, oy, WATER.base, 16, 16);
  const r = rng(tx * 337 + ty * 7331 + 1);
  for (let i = 0; i < 2; i++) px(ctx, ox + Math.floor(r() * 10), oy + Math.floor(r() * 14), WATER.deep, 6, 2);
  for (let i = 0; i < 3; i++) {
    const x = Math.floor(r() * 12);
    const y = Math.floor(r() * 15);
    px(ctx, ox + x, oy + y, WATER.light, 3, 1);
    px(ctx, ox + x + 1, oy + y + 1, WATER.light, 1, 1);
  }

  const pal = GRASS[tc.theme];
  const n = !isWet(tc.groundAt(tx, ty - 1));
  const s = !isWet(tc.groundAt(tx, ty + 1));
  const w = !isWet(tc.groundAt(tx - 1, ty));
  const e = !isWet(tc.groundAt(tx + 1, ty));
  for (let i = 0; i < 16; i++) {
    const d = 2 + Math.floor(hash2(tx * 16 + i, ty, 5) * 2);
    if (n) {
      px(ctx, ox + i, oy, pal.base, 1, d);
      px(ctx, ox + i, oy + d, WATER.edge, 1, 2);
      px(ctx, ox + i, oy + d + 2, hash2(tx * 16 + i, ty, 21) < 0.3 ? WATER.foam : WATER.light);
    }
    if (s) {
      px(ctx, ox + i, oy + 16 - d, pal.dark, 1, 1);
      px(ctx, ox + i, oy + 17 - d, pal.base, 1, d - 1);
      px(ctx, ox + i, oy + 15 - d, hash2(tx * 16 + i, ty, 22) < 0.3 ? WATER.foam : WATER.light);
    }
    if (w) {
      px(ctx, ox, oy + i, pal.base, d, 1);
      px(ctx, ox + d, oy + i, WATER.edge);
      px(ctx, ox + d + 1, oy + i, hash2(tx, ty * 16 + i, 23) < 0.3 ? WATER.foam : WATER.light);
    }
    if (e) {
      px(ctx, ox + 16 - d, oy + i, pal.base, d, 1);
      px(ctx, ox + 16 - d, oy + i, pal.dark);
      px(ctx, ox + 15 - d, oy + i, hash2(tx, ty * 16 + i, 24) < 0.3 ? WATER.foam : WATER.light);
    }
  }
}

function drawBridge(ctx: CanvasRenderingContext2D, ox: number, oy: number, tx: number, ty: number, tc: TileContext) {
  const horizontal = !isWet(tc.groundAt(tx - 1, ty)) || !isWet(tc.groundAt(tx + 1, ty)) || tc.groundAt(tx - 1, ty) === 'bridge';
  const plank = '#b07c44';
  const plankDark = '#8a5c30';
  const gap = '#5a3a20';
  const rail = '#6a4424';
  const railLight = '#9a6a3a';
  px(ctx, ox, oy, WATER.deep, 16, 16);
  if (horizontal) {
    for (let x = 0; x < 16; x++) {
      const c = Math.floor(x / 4) % 2 === 0 ? plank : plankDark;
      px(ctx, ox + x, oy + 2, x % 4 === 3 ? gap : c, 1, 12);
    }
    px(ctx, ox, oy + 2, mix(plank, '#fff', 0.25), 16, 1);
    px(ctx, ox, oy, rail, 16, 3);
    px(ctx, ox, oy, railLight, 16, 1);
    px(ctx, ox, oy + 13, rail, 16, 3);
    px(ctx, ox, oy + 13, railLight, 16, 1);
    px(ctx, ox, oy + 15, '#3a2414', 16, 1);
    px(ctx, ox + 1, oy, '#4a2c18', 2, 3);
    px(ctx, ox + 1, oy + 13, '#4a2c18', 2, 3);
  } else {
    for (let y = 0; y < 16; y++) {
      const c = Math.floor(y / 4) % 2 === 0 ? plank : plankDark;
      px(ctx, ox + 2, oy + y, y % 4 === 3 ? gap : c, 12, 1);
    }
    px(ctx, ox, oy, rail, 3, 16);
    px(ctx, ox, oy, railLight, 1, 16);
    px(ctx, ox + 13, oy, rail, 3, 16);
    px(ctx, ox + 13, oy, railLight, 1, 16);
  }
}

function isWall(g: Ground) {
  return g === 'wall' || g === 'mouth';
}

function drawWall(ctx: CanvasRenderingContext2D, ox: number, oy: number, tx: number, ty: number, tc: TileContext) {
  const pal = ROCK[tc.theme];
  const below = tc.groundAt(tx, ty + 1);
  const face = !isWall(below);
  const r = rng(tx * 1031 + ty * 7 + 77);
  if (face) {
    px(ctx, ox, oy, pal.face, 16, 16);
    // vertical strata
    for (let i = 0; i < 5; i++) {
      const x = Math.floor(r() * 15);
      const y = 3 + Math.floor(r() * 6);
      const h = 3 + Math.floor(r() * 6);
      px(ctx, ox + x, oy + y, pal.faceDark, 1, h);
      px(ctx, ox + x + 1, oy + y, pal.faceLight, 1, Math.max(1, h - 2));
    }
    // horizontal crack bands
    px(ctx, ox, oy + 7 + Math.floor(r() * 3), pal.faceDark, 16, 1);
    // lip where the top meets the face
    px(ctx, ox, oy, pal.topLight, 16, 2);
    px(ctx, ox, oy + 2, pal.faceLight, 16, 1);
    // contact shadow at the base
    px(ctx, ox, oy + 15, pal.edge, 16, 1);
    px(ctx, ox, oy + 14, pal.faceDark, 16, 1);
    if (tc.theme !== 'cave') {
      // moss drips from the grassy top
      for (let x = 0; x < 16; x++) if (hash2(tx * 16 + x, ty, 13) < 0.35) px(ctx, ox + x, oy + 3, pal.top, 1, 1 + Math.floor(hash2(x, ty, 2) * 2));
    }
    if (!isWall(tc.groundAt(tx - 1, ty))) px(ctx, ox, oy, pal.edge, 1, 16);
    if (!isWall(tc.groundAt(tx + 1, ty))) px(ctx, ox + 15, oy, pal.edge, 1, 16);
  } else {
    px(ctx, ox, oy, pal.top, 16, 16);
    for (let i = 0; i < 6; i++) px(ctx, ox + Math.floor(r() * 15), oy + Math.floor(r() * 15), pal.topLight, 2, 1);
    if (tc.theme === 'cave') {
      for (let i = 0; i < 4; i++) px(ctx, ox + Math.floor(r() * 16), oy + Math.floor(r() * 16), shadeColor(pal.top, -0.25));
    }
    if (!isWall(tc.groundAt(tx, ty - 1))) {
      px(ctx, ox, oy, pal.edge, 16, 1);
      px(ctx, ox, oy + 1, pal.topLight, 16, 1);
    }
    if (!isWall(tc.groundAt(tx - 1, ty))) {
      px(ctx, ox, oy, pal.edge, 1, 16);
      px(ctx, ox + 1, oy, pal.topLight, 1, 16);
    }
    if (!isWall(tc.groundAt(tx + 1, ty))) {
      px(ctx, ox + 15, oy, pal.edge, 1, 16);
      px(ctx, ox + 14, oy, shadeColor(pal.top, -0.2), 1, 16);
    }
  }
}

function drawMouth(ctx: CanvasRenderingContext2D, ox: number, oy: number, tx: number, ty: number, tc: TileContext) {
  // Draw as a wall face then cut a dark opening; joins with neighbouring mouths.
  drawWall(ctx, ox, oy, tx, ty, { ...tc, groundAt: (x, y) => (x === tx && y === ty + 1 ? 'floor' : tc.groundAt(x, y)) });
  const left = tc.groundAt(tx - 1, ty) === 'mouth';
  const right = tc.groundAt(tx + 1, ty) === 'mouth';
  const x0 = left ? 0 : 3;
  const x1 = right ? 16 : 13;
  for (let y = 3; y < 16; y++) {
    let a = x0;
    let b = x1;
    if (y < 6) {
      const inset = 6 - y;
      if (!left) a += inset;
      if (!right) b -= inset;
    }
    px(ctx, ox + a, oy + y, '#0c0614', b - a, 1);
  }
  // Inner rim highlight
  if (!left) px(ctx, ox + 3, oy + 6, ROCK[tc.theme].faceLight, 1, 10);
}

function drawFloor(ctx: CanvasRenderingContext2D, ox: number, oy: number, tx: number, ty: number, tc: TileContext) {
  px(ctx, ox, oy, FLOOR.base, 16, 16);
  const r = rng(tx * 613 + ty * 4421 + 9);
  for (let i = 0; i < 5; i++) px(ctx, ox + Math.floor(r() * 15), oy + Math.floor(r() * 15), FLOOR.dark, 2, 1);
  for (let i = 0; i < 4; i++) px(ctx, ox + Math.floor(r() * 16), oy + Math.floor(r() * 16), FLOOR.light);
  if (r() < 0.4) {
    let x = Math.floor(r() * 10) + 2;
    let y = Math.floor(r() * 10) + 2;
    for (let i = 0; i < 4; i++) {
      px(ctx, ox + x, oy + y, FLOOR.crack);
      x += r() < 0.5 ? 1 : 0;
      y += 1;
    }
  }
  // Shadow cast by walls above/left.
  if (isWall(tc.groundAt(tx, ty - 1))) {
    px(ctx, ox, oy, 'rgba(10,4,20,0.55)', 16, 2);
    px(ctx, ox, oy + 2, 'rgba(10,4,20,0.25)', 16, 2);
  }
  if (isWall(tc.groundAt(tx - 1, ty))) px(ctx, ox, oy, 'rgba(10,4,20,0.35)', 2, 16);
}

export function drawGround(ctx: CanvasRenderingContext2D, ox: number, oy: number, tx: number, ty: number, tc: TileContext) {
  const ch = tc.charAt(tx, ty);
  const info = tileInfo(ch);
  let ground = info.ground;
  // Rocks on cave maps sit on the cave floor rather than grass.
  if (tc.theme === 'cave' && ground === 'grass') ground = 'floor';
  switch (ground) {
    case 'grass':
      drawGrassBase(ctx, ox, oy, tx, ty, GRASS[tc.theme]);
      if (info.flowers) drawFlowers(ctx, ox, oy, tx, ty);
      break;
    case 'path':
      drawPath(ctx, ox, oy, tx, ty, tc);
      break;
    case 'cobble':
      drawCobble(ctx, ox, oy, tx, ty, tc);
      break;
    case 'water':
      drawWater(ctx, ox, oy, tx, ty, tc);
      break;
    case 'bridge':
      drawBridge(ctx, ox, oy, tx, ty, tc);
      break;
    case 'wall':
      drawWall(ctx, ox, oy, tx, ty, tc);
      break;
    case 'mouth':
      drawMouth(ctx, ox, oy, tx, ty, tc);
      break;
    case 'floor':
    case 'rune':
      drawFloor(ctx, ox, oy, tx, ty, tc);
      break;
  }
}

/** Animated glints on water, drawn every frame over the static layer. */
export function drawWaterGlints(ctx: CanvasRenderingContext2D, ox: number, oy: number, tx: number, ty: number, time: number) {
  for (let i = 0; i < 2; i++) {
    const phase = hash2(tx, ty, 40 + i) * Math.PI * 2;
    const v = Math.sin(time * 2.2 + phase);
    if (v > 0.55) {
      const x = 3 + Math.floor(hash2(tx, ty, 50 + i) * 9);
      const y = 4 + Math.floor(hash2(tx, ty, 60 + i) * 8);
      px(ctx, ox + x, oy + y, v > 0.85 ? WATER.foam : WATER.light, v > 0.85 ? 3 : 2, 1);
    }
  }
}

// ---------------------------------------------------------------------------
// Props (sprites drawn with outlines and shading)
// ---------------------------------------------------------------------------

const LEAF = ['#1c4424', '#2a642c', '#3a8436', '#56a644', '#84c85c'];
const PINE = ['#123628', '#1a4c32', '#24683c', '#358446', '#5aa858'];
const BARK = ['#3c2414', '#5a3820', '#7a5030', '#9a6c40'];
const STONE = ['#3e3c4c', '#5c5a6c', '#7e7c8c', '#a4a2b0', '#c8c6d2'];
const CAVE_STONE = ['#2a2238', '#3e3450', '#56496c', '#73668a', '#968aac'];
const PROP_OUTLINE = '#141020';

function treeSprite(variant: number): HTMLCanvasElement {
  const p = new Pixels(16, 26);
  const r = rng(variant * 101 + 7);
  const trunk = p.mask().rect(6, 16, 4, 8).rect(5, 22, 6, 2);
  p.shade(trunk, BARK, { depth: 2 });
  const canopy = p.mask();
  canopy.ellipse(8, 9, 7.5, 7);
  canopy.ellipse(4, 12, 4, 3.5);
  canopy.ellipse(12, 12, 4, 3.5);
  canopy.ellipse(8, 4, 5, 3.5);
  p.shade(canopy, LEAF, { depth: 4, directional: 0.6, outline: PROP_OUTLINE });
  // leaf clusters catch the light
  for (let i = 0; i < 6; i++) {
    const x = 3 + Math.floor(r() * 8);
    const y = 3 + Math.floor(r() * 7);
    if (canopy.has(x, y) && canopy.has(x + 2, y + 1)) {
      p.set(x, y, LEAF[4]);
      p.set(x + 1, y, LEAF[3]);
      p.set(x + 1, y + 1, LEAF[4]);
      p.set(x + 2, y + 1, LEAF[2]);
    }
  }
  for (let i = 0; i < 4; i++) {
    const x = 6 + Math.floor(r() * 8);
    const y = 9 + Math.floor(r() * 6);
    if (canopy.has(x, y)) p.set(x, y, LEAF[0]);
  }
  p.outline(PROP_OUTLINE);
  return p.toCanvas();
}

function pineSprite(variant: number): HTMLCanvasElement {
  const p = new Pixels(16, 26);
  const trunk = p.mask().rect(7, 19, 3, 5);
  p.shade(trunk, BARK, { depth: 1 });
  const tiers: [number, number, number][] = [
    [1, 9, 4],
    [5, 15, 6],
    [9, 21, 7.5],
  ];
  tiers.forEach(([top, bottom, half], i) => {
    const m = p.mask().poly([
      [8.5, top - (i === 0 ? 1 : 0)],
      [8.5 + half, bottom],
      [8.5 - half, bottom],
    ]);
    p.shade(m, PINE, { depth: 3, directional: 0.65, outline: PROP_OUTLINE, bias: variant % 2 ? 0.03 : 0 });
  });
  p.outline(PROP_OUTLINE);
  return p.toCanvas();
}

function bushSprite(): HTMLCanvasElement {
  const p = new Pixels(16, 16);
  const m = p.mask().ellipse(8, 10, 7, 5).ellipse(5, 8, 4, 3.5).ellipse(11, 8, 4, 3.5);
  p.shade(m, LEAF, { depth: 3 });
  for (const [x, y] of [
    [5, 9],
    [10, 7],
    [9, 12],
    [12, 11],
  ]) {
    p.set(x, y, '#e83850');
    p.set(x, y - 1, '#f8a0a8');
  }
  p.outline(PROP_OUTLINE);
  return p.toCanvas();
}

function rockSprite(cave: boolean): HTMLCanvasElement {
  const p = new Pixels(16, 16);
  const m = p.mask().ellipse(8, 10.5, 6.5, 4.5).ellipse(7, 8, 4, 3);
  p.shade(m, cave ? CAVE_STONE : STONE, { depth: 3 });
  p.set(9, 9, (cave ? CAVE_STONE : STONE)[0]);
  p.set(10, 10, (cave ? CAVE_STONE : STONE)[0]);
  p.outline(PROP_OUTLINE);
  return p.toCanvas();
}

function stalagmiteSprite(): HTMLCanvasElement {
  const p = new Pixels(16, 20);
  const m = p.mask().poly([
    [8, 1],
    [13, 18],
    [3, 18],
  ]);
  m.ellipse(8, 17, 6, 2.5);
  p.shade(m, CAVE_STONE, { depth: 3, directional: 0.7 });
  p.outline(PROP_OUTLINE);
  return p.toCanvas();
}

function crystalSprite(): HTMLCanvasElement {
  const p = new Pixels(16, 20);
  const CR = ['#2a2a8c', '#3c52c8', '#5a8cf0', '#90c8ff', '#e0f8ff'];
  const CR2 = ['#4a2088', '#6c34b8', '#9c5ce0', '#c898f8', '#f0e0ff'];
  const parts: [[number, number][], string[]][] = [
    [
      [
        [3, 9],
        [5, 6],
        [7, 10],
        [6, 18],
        [3, 18],
      ],
      CR2,
    ],
    [
      [
        [10, 8],
        [12, 6],
        [14, 10],
        [13, 18],
        [10, 18],
      ],
      CR2,
    ],
    [
      [
        [6, 4],
        [8.5, 0],
        [11, 4],
        [10.5, 18],
        [6.5, 18],
      ],
      CR,
    ],
  ];
  for (const [pts, colors] of parts) {
    const m = p.mask().poly(pts);
    p.shade(m, colors, { depth: 2, directional: 0.8, outline: '#120c28' });
  }
  p.set(8, 3, '#ffffff');
  p.set(8, 4, '#ffffff');
  p.outline('#120c28');
  return p.toCanvas();
}

function wellSprite(): HTMLCanvasElement {
  const p = new Pixels(16, 26);
  // posts and roof
  const posts = p.mask().rect(2, 6, 2, 12).rect(12, 6, 2, 12);
  p.shade(posts, BARK, { depth: 1 });
  const roof = p.mask().poly([
    [8, 0],
    [16, 7],
    [0, 7],
  ]);
  p.shade(roof, ['#6a1c20', '#9a2c2c', '#c84038', '#e8705a'], { depth: 2, directional: 0.6 });
  // stone drum
  const drum = p.mask().rect(1, 15, 14, 9).ellipse(8, 15, 7, 3);
  p.shade(drum, STONE, { depth: 2, directional: 0.6, outline: PROP_OUTLINE });
  for (let x = 2; x < 14; x += 4) p.set(x, 19, STONE[1]);
  for (let x = 4; x < 14; x += 4) p.set(x, 22, STONE[1]);
  const water = p.mask().ellipse(8, 15, 5, 1.6);
  p.fill(water, '#1c2c60');
  p.set(6, 15, '#4a78c8');
  p.set(7, 15, '#4a78c8');
  // rope & bucket
  p.rect(8, 6, 1, 7, '#c8b080');
  p.rect(7, 12, 3, 2, '#7a5030');
  p.outline(PROP_OUTLINE);
  return p.toCanvas();
}

function puddleSprite(): HTMLCanvasElement {
  const p = new Pixels(16, 16);
  const m = p.mask().ellipse(8, 9, 6.5, 3);
  p.fill(m, '#24305c');
  const hi = p.mask().ellipse(8, 9, 6.5, 3);
  hi.subtract(p.mask().ellipse(8.6, 9.6, 6.3, 2.8));
  p.fill(hi, '#6a7ab8');
  p.set(5, 8, '#a8b8f0');
  return p.toCanvas();
}

function fenceSprite(n: boolean, s: boolean, w: boolean, e: boolean): HTMLCanvasElement {
  const p = new Pixels(16, 16);
  const wood = ['#5a3418', '#8a5a30', '#b48048', '#d8a868'];
  const m = p.mask();
  m.rect(6, 3, 4, 12);
  if (w) {
    m.rect(0, 6, 7, 2);
    m.rect(0, 10, 7, 2);
  }
  if (e) {
    m.rect(9, 6, 7, 2);
    m.rect(9, 10, 7, 2);
  }
  if (n) m.rect(7, 0, 2, 4);
  if (s) m.rect(7, 14, 2, 2);
  p.shade(m, wood, { depth: 1, directional: 0.7 });
  p.outline(PROP_OUTLINE);
  return p.toCanvas();
}

export function signSprite(): HTMLCanvasElement {
  const p = new Pixels(16, 18);
  const wood = ['#5a3418', '#8a5a30', '#b48048', '#d8a868'];
  p.shade(p.mask().rect(7, 9, 2, 8), wood, { depth: 1 });
  p.shade(p.mask().rect(1, 2, 14, 8), wood, { depth: 2, directional: 0.7 });
  for (const y of [4, 6]) p.rect(3, y, 9 - (y === 6 ? 3 : 0), 1, '#5a3418');
  p.outline(PROP_OUTLINE);
  return p.toCanvas();
}

export function chestSprite(open: boolean): HTMLCanvasElement {
  const p = new Pixels(16, 16);
  const wood = ['#4a2410', '#7a3c1c', '#a85a2c', '#cc7c40'];
  const gold = ['#8a5810', '#c89020', '#f0c840', '#fff0a0'];
  if (!open) {
    p.shade(p.mask().rect(2, 7, 12, 8), wood, { depth: 2 });
    p.shade(p.mask().rect(2, 3, 12, 5).ellipse(8, 4, 6, 2), wood, { depth: 2, bias: 0.12, outline: PROP_OUTLINE });
    p.shade(p.mask().rect(4, 3, 2, 12), gold, { depth: 1 });
    p.shade(p.mask().rect(10, 3, 2, 12), gold, { depth: 1 });
    p.shade(p.mask().rect(7, 7, 2, 3), gold, { depth: 1, outline: PROP_OUTLINE });
  } else {
    p.shade(p.mask().rect(2, 1, 12, 5), wood, { depth: 2, bias: -0.1 });
    p.fill(p.mask().rect(3, 6, 10, 3), '#1c0c08');
    p.shade(p.mask().rect(2, 8, 12, 7), wood, { depth: 2, outline: PROP_OUTLINE });
    p.shade(p.mask().rect(4, 8, 2, 7), gold, { depth: 1 });
    p.shade(p.mask().rect(10, 8, 2, 7), gold, { depth: 1 });
  }
  p.outline(PROP_OUTLINE);
  return p.toCanvas();
}

export function pedestalSprite(withCrystal: boolean): HTMLCanvasElement {
  const p = new Pixels(16, 30);
  p.shade(p.mask().rect(4, 18, 8, 9).rect(2, 26, 12, 3).rect(3, 16, 10, 3), CAVE_STONE, { depth: 2 });
  if (withCrystal) {
    const CR = ['#2a4ab0', '#3c78e0', '#68b0f8', '#b0e0ff', '#f0ffff'];
    const m = p.mask().poly([
      [8, 1],
      [12.5, 8],
      [8, 16],
      [3.5, 8],
    ]);
    p.shade(m, CR, { depth: 3, directional: 0.75 });
    p.set(7, 5, '#ffffff');
    p.set(6, 7, '#ffffff');
  }
  p.outline(PROP_OUTLINE);
  return p.toCanvas();
}

export function torchFlame(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  const f = Math.floor(time * 10) % 3;
  // bracket
  px(ctx, x + 6, y + 8, '#2a2030', 4, 2);
  px(ctx, x + 7, y + 10, '#2a2030', 2, 3);
  px(ctx, x + 6, y + 6, '#5a3820', 4, 2);
  const shapes = [
    ['..r..', '.ror.', '.oyo.', 'royor', '.ryr.'],
    ['.r...', '.or..', 'royo.', '.oyor', '.ryr.'],
    ['...r.', '..ro.', '.oyor', 'royo.', '.ryr.'],
  ];
  const col: Record<string, string> = { r: '#e84020', o: '#f89830', y: '#fff0a0' };
  shapes[f].forEach((row, ry) => {
    for (let rx = 0; rx < row.length; rx++) {
      const c = col[row[rx]];
      if (c) px(ctx, x + 5 + rx, y + 1 + ry, c);
    }
  });
}

const spriteCache = new Map<string, HTMLCanvasElement>();
function cached(key: string, make: () => HTMLCanvasElement) {
  let c = spriteCache.get(key);
  if (!c) {
    c = make();
    spriteCache.set(key, c);
  }
  return c;
}

export function getPropSprite(prop: Prop, tx: number, ty: number, tc: TileContext): HTMLCanvasElement | null {
  switch (prop) {
    case 'tree':
      return cached(`tree${(tx * 3 + ty) % 3}`, () => treeSprite((tx * 3 + ty) % 3));
    case 'pine':
      return cached(`pine${(tx + ty) % 2}`, () => pineSprite((tx + ty) % 2));
    case 'bush':
      return cached('bush', bushSprite);
    case 'rock':
      return cached(`rock${tc.theme}`, () => rockSprite(tc.theme === 'cave'));
    case 'well':
      return cached('well', wellSprite);
    case 'puddle':
      return cached('puddle', puddleSprite);
    case 'stalagmite':
      return cached('stalagmite', stalagmiteSprite);
    case 'crystal':
      return cached('crystal', crystalSprite);
    case 'fence': {
      const f = (x: number, y: number) => tc.charAt(x, y) === 'f';
      const key = `fence${+f(tx, ty - 1)}${+f(tx, ty + 1)}${+f(tx - 1, ty)}${+f(tx + 1, ty)}`;
      return cached(key, () => fenceSprite(f(tx, ty - 1), f(tx, ty + 1), f(tx - 1, ty), f(tx + 1, ty)));
    }
    default:
      return null;
  }
}

/** Props tall enough to overlap characters get depth-sorted; the rest are baked into the ground. */
export const TALL_PROPS = new Set<Prop>(['tree', 'pine', 'well', 'crystal', 'stalagmite']);

// ---------------------------------------------------------------------------
// Buildings
// ---------------------------------------------------------------------------

const TINY_INN = ['#.#..#.#..#', '#.##.#.##.#', '#.#.##.#.##', '#.#..#.#..#'];

export function drawBuilding(ctx: CanvasRenderingContext2D, b: BuildingDef) {
  const W = b.w * 16;
  const H = b.h * 16;
  const [canvas, c] = makeCanvas(W, H + 2);
  const wallH = 22;
  const roofH = H - wallH + 4;
  const roofBase = b.roof;
  const roofLight = shadeColor(roofBase, 0.35);
  const roofDark = shadeColor(roofBase, -0.4);
  const roofDarker = shadeColor(roofBase, -0.65);

  // --- walls
  const wy = H - wallH;
  const plaster = '#f0e2c0';
  const plasterShade = '#d4c09a';
  const timber = '#6a4428';
  const timberLight = '#8e6038';
  px(c, 2, wy, plaster, W - 4, wallH);
  px(c, W - 8, wy, plasterShade, 6, wallH);
  // stone footing
  px(c, 2, H - 4, '#8c8478', W - 4, 4);
  for (let x = 3; x < W - 3; x += 5) px(c, x, H - 4, '#aaa296', 3, 1);
  px(c, 2, H - 1, '#4a4440', W - 4, 1);
  // timber frame
  px(c, 2, wy, timber, 3, wallH - 4);
  px(c, W - 5, wy, timber, 3, wallH - 4);
  px(c, 3, wy, timberLight, 1, wallH - 4);
  for (let tx = 1; tx < b.w - 1; tx++) {
    if (tx === b.door) continue;
    if (tx % 2 === 0) {
      px(c, tx * 16 + 7, wy, timber, 2, wallH - 4);
    }
  }
  px(c, 2, wy + 5, timber, W - 4, 2);
  px(c, 2, wy + 5, timberLight, W - 4, 1);

  // windows
  for (let tx = 1; tx < b.w - 1; tx++) {
    if (tx === b.door) continue;
    const x = tx * 16 + 3;
    const y = wy + 8;
    px(c, x - 1, y - 1, timber, 12, 10);
    px(c, x, y, '#f8f0e0', 10, 8);
    px(c, x + 1, y + 1, '#3c64b8', 8, 6);
    px(c, x + 1, y + 1, '#6c9ce8', 3, 2);
    px(c, x + 2, y + 1, '#c0e0ff', 1, 1);
    px(c, x + 5, y, '#f8f0e0', 1, 8);
    px(c, x, y + 4, '#f8f0e0', 10, 1);
    // flower box
    px(c, x - 1, y + 9, '#8a5a30', 12, 2);
    for (let i = 0; i < 5; i++) px(c, x + i * 2, y + 8, ['#f87890', '#f8d850', '#f8f0f0'][(i + tx) % 3]);
  }

  // door
  const dx = b.door * 16 + 3;
  const dTop = H - 19;
  px(c, dx - 1, dTop - 1, timber, 12, 16);
  px(c, dx, dTop + 1, '#9a6434', 10, 14);
  px(c, dx + 1, dTop, '#9a6434', 8, 1);
  for (let x = dx + 2; x < dx + 10; x += 3) px(c, x, dTop + 1, '#7a4a24', 1, 14);
  px(c, dx, dTop + 1, '#b47c44', 1, 14);
  px(c, dx + 7, dTop + 8, '#f8d040', 2, 2);
  px(c, dx - 2, H - 1, '#b0a898', 14, 1);

  // --- roof
  for (let y = 0; y < roofH; y++) {
    const row = y % 4;
    const color = row === 0 ? roofLight : row === 3 ? roofDark : roofBase;
    px(c, 0, y, color, W, 1);
  }
  for (let y = 0; y < roofH; y += 4) {
    const off = (y / 4) % 2 === 0 ? 0 : 3;
    for (let x = off; x < W; x += 6) px(c, x, y + 1, roofDark, 1, 2);
  }
  // ridge
  px(c, 0, 0, roofDarker, W, 1);
  px(c, 0, 1, roofLight, W, 1);
  px(c, 0, 2, roofDark, W, 1);
  // eave
  px(c, 0, roofH - 2, roofDark, W, 1);
  px(c, 0, roofH - 1, roofDarker, W, 1);
  px(c, 2, roofH, 'rgba(30,10,10,0.35)', W - 4, 2);
  // gable edges
  px(c, 0, 0, roofDarker, 1, roofH);
  px(c, W - 1, 0, roofDarker, 1, roofH);

  if (b.chimney) {
    const cx = W - 16;
    px(c, cx, 0, '#7a3c34', 7, 9);
    px(c, cx, 0, '#a85848', 2, 9);
    px(c, cx - 1, 0, '#4a2420', 9, 2);
  }

  // signboard mounted on the eave above the door
  if (b.sign) {
    const sx = dx - 2;
    const sy = roofH - 10;
    px(c, sx, sy, '#3a2414', 13, 10);
    px(c, sx + 1, sy + 1, '#d8a868', 11, 8);
    px(c, sx + 1, sy + 1, '#ecc488', 11, 1);
    if (b.sign === 'shop') {
      px(c, sx + 6, sy + 2, '#d8e8f8', 2, 1);
      px(c, sx + 5, sy + 3, '#e84848', 4, 4);
      px(c, sx + 5, sy + 3, '#f8a0a0', 1, 1);
      px(c, sx + 5, sy + 7, '#a02830', 4, 1);
    } else {
      TINY_INN.forEach((row, ry) => {
        for (let rx = 0; rx < row.length; rx++) if (row[rx] === '#') px(c, sx + 1 + rx, sy + 3 + ry, '#3a2414');
      });
    }
  }

  // outline the silhouette
  const img = c.getImageData(0, 0, W, H + 2);
  const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H + 2 && img.data[(y * W + x) * 4 + 3] > 200;
  const edges: [number, number][] = [];
  for (let y = 0; y < H + 2; y++) {
    for (let x = 0; x < W; x++) {
      if (!solid(x, y)) continue;
      if (!solid(x - 1, y) || !solid(x + 1, y) || !solid(x, y - 1)) edges.push([x, y]);
    }
  }
  c.fillStyle = '#20141c';
  for (const [x, y] of edges) {
    if (y < roofH || x < 3 || x > W - 4) c.fillRect(x, y, 1, 1);
  }

  ctx.drawImage(canvas, b.x * 16, b.y * 16);
}

