import { img } from '@/engine/assets';
import type { BuildingDef, BuildingStyle, MapTheme } from '@/types';
import { hash2, makeCanvas } from './canvas';

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

export interface TileContext {
  theme: MapTheme;
  /** Ground type of the tile at (x, y); out of bounds returns the edge tile's ground. */
  groundAt: (x: number, y: number) => Ground;
  charAt: (x: number, y: number) => string;
}

const T = 16;

/** Copy tiles from a sheet. Sheet coordinates and size are in tiles. */
export function drawTile(
  ctx: CanvasRenderingContext2D,
  sheet: string,
  sx: number,
  sy: number,
  dx: number,
  dy: number,
  w = 1,
  h = 1,
) {
  ctx.drawImage(img(sheet), sx * T, sy * T, w * T, h * T, Math.round(dx), Math.round(dy), w * T, h * T);
}

// ---------------------------------------------------------------------------
// Terrain blending
// ---------------------------------------------------------------------------

/**
 * The pack's 47-tile blob layout. Keys are neighbour bits in the order
 * NW N NE W E SW S SE (a corner only counts when both sides next to it match).
 * Values are tile positions relative to the top-left of the block.
 */
const BLOB: Record<string, [number, number][]> = {
  '00000000': [[3, 3]],
  '00000010': [[3, 0]],
  '00001000': [[0, 3]],
  '00001010': [[4, 0]],
  '00001011': [[0, 0]],
  '00010000': [[2, 3]],
  '00010010': [[7, 0]],
  '00010110': [[2, 0]],
  '00011000': [[1, 3]],
  '00011010': [[8, 0]],
  '00011011': [[6, 0]],
  '00011110': [[5, 0]],
  '00011111': [[1, 0]],
  '01000000': [[3, 2]],
  '01000010': [[3, 1]],
  '01001000': [[4, 3]],
  '01001010': [[4, 4]],
  '01001011': [[4, 2]],
  '01010000': [[7, 3]],
  '01010010': [[7, 4]],
  '01010110': [[7, 2]],
  '01011000': [[8, 3]],
  '01011010': [[8, 4]],
  '01011011': [[9, 2]],
  '01011110': [[10, 2]],
  '01011111': [[8, 2]],
  '01101000': [[0, 2]],
  '01101010': [[4, 1]],
  '01101011': [[0, 1]],
  '01111000': [[6, 3]],
  '01111010': [[9, 3]],
  '01111011': [[6, 4]],
  '01111110': [[9, 1]],
  '01111111': [[6, 2]],
  '11010000': [[2, 2]],
  '11010010': [[7, 1]],
  '11010110': [[2, 1]],
  '11011000': [[5, 3]],
  '11011010': [[10, 3]],
  '11011011': [[9, 0]],
  '11011110': [[5, 4]],
  '11011111': [[5, 2]],
  '11111000': [[1, 2]],
  '11111010': [[8, 1]],
  '11111011': [[6, 1]],
  '11111110': [[5, 1]],
  '11111111': [[1, 1]],
};

export function blobKey(same: (dx: number, dy: number) => boolean): string {
  const n = same(0, -1);
  const s = same(0, 1);
  const w = same(-1, 0);
  const e = same(1, 0);
  return [n && w && same(-1, -1), n, n && e && same(1, -1), w, e, s && w && same(-1, 1), s, s && e && same(1, 1)]
    .map((b) => (b ? '1' : '0'))
    .join('');
}

interface Block {
  sheet: string;
  ox: number;
  oy: number;
}

/** Dirt-on-grass blocks in TilesetFloor (the cave uses dark earth on pale stone). */
const DIRT: Record<MapTheme, Block> = {
  village: { sheet: 'tiles/floor', ox: 0, oy: 7 },
  forest: { sheet: 'tiles/floor', ox: 11, oy: 7 },
  cave: { sheet: 'tiles/floor', ox: 11, oy: 14 },
};

/** Water with grassy banks. Same layout as the dirt, one row higher. */
const WATER: Record<MapTheme, Block> = {
  village: { sheet: 'tiles/water', ox: 0, oy: 6 },
  forest: { sheet: 'tiles/water-forest', ox: 0, oy: 6 },
  cave: { sheet: 'tiles/water', ox: 0, oy: 6 },
};

function blob(ctx: CanvasRenderingContext2D, b: Block, key: string, dx: number, dy: number, tx: number, ty: number, speckled = false) {
  let [rx, ry] = (BLOB[key] ?? BLOB['11111111'])[0];
  // Solid earth now and then gets the block's twig or pebble tile.
  if (speckled && key === '11111111') {
    const r = hash2(tx, ty, 7);
    if (r < 0.04) [rx, ry] = [0, 4];
    else if (r < 0.07) [rx, ry] = [1, 4];
  }
  drawTile(ctx, b.sheet, b.ox + rx, b.oy + ry, dx, dy);
}

/** Plain ground for a theme: grass outdoors, pale stone in the cave. Mostly the flat tile, sometimes a tuft. */
function drawPlain(ctx: CanvasRenderingContext2D, theme: MapTheme, dx: number, dy: number, tx: number, ty: number) {
  const b = DIRT[theme];
  const r = hash2(tx, ty, 3);
  // Row 5 of every block is plain ground; the village block also has two tufted tiles in row 4.
  let pick: [number, number] = r < 0.8 ? [0, 5] : r < 0.86 ? [1, 5] : r < 0.91 ? [4, 5] : r < 0.96 ? [2, 5] : [3, 5];
  if (theme === 'village' && r >= 0.91) pick = r < 0.96 ? [2, 4] : [3, 4];
  drawTile(ctx, b.sheet, b.ox + pick[0], b.oy + pick[1], dx, dy);
}

function isDirt(theme: MapTheme, g: Ground) {
  if (theme === 'cave') return g !== 'rune';
  return g === 'path' || g === 'cobble' || g === 'mouth' || g === 'bridge';
}

function isWet(g: Ground) {
  return g === 'water' || g === 'bridge';
}

function isWall(g: Ground) {
  return g === 'wall';
}

const CAVE_ROCK = '#1d1726';

/** Cliff piece for a wall tile, picked from which sides open onto walkable ground. */
function cliffTile(n: boolean, s: boolean, w: boolean, e: boolean): [number, number] {
  if (s) return w && e ? [0, 2] : w ? [1, 2] : e ? [3, 2] : [2, 2];
  if (n) return w && e ? [0, 0] : w ? [1, 0] : e ? [3, 0] : [2, 0];
  return w && e ? [0, 1] : w ? [1, 1] : e ? [3, 1] : [2, 1];
}

export function drawGround(ctx: CanvasRenderingContext2D, ox: number, oy: number, tx: number, ty: number, tc: TileContext) {
  const ch = tc.charAt(tx, ty);
  const info = tileInfo(ch);
  const theme = tc.theme;
  let ground = info.ground;
  if (theme === 'cave' && ground === 'grass') ground = 'floor';
  const at = (dx: number, dy: number) => tc.groundAt(tx + dx, ty + dy);

  switch (ground) {
    case 'grass':
      drawPlain(ctx, theme, ox, oy, tx, ty);
      if (info.flowers) drawTile(ctx, 'tiles/floor-detail', 5, 2, ox, oy);
      else if (!info.prop && hash2(tx, ty, 11) < 0.07) drawTile(ctx, 'tiles/floor-detail', 1 + Math.floor(hash2(tx, ty, 12) * 3), 2, ox, oy);
      break;
    case 'path':
    case 'cobble':
    case 'mouth':
    case 'floor':
      if (theme === 'cave' && ground !== 'floor' && ground !== 'mouth') {
        drawPlain(ctx, theme, ox, oy, tx, ty);
        break;
      }
      blob(ctx, DIRT[theme], blobKey((dx, dy) => isDirt(theme, at(dx, dy))), ox, oy, tx, ty, true);
      break;
    case 'rune':
      drawPlain(ctx, theme, ox, oy, tx, ty);
      break;
    case 'water':
      blob(ctx, WATER[theme], blobKey((dx, dy) => isWet(at(dx, dy))), ox, oy, tx, ty);
      break;
    case 'bridge': {
      blob(ctx, WATER[theme], '11111111', ox, oy, tx, ty);
      const bridge = (dx: number, dy: number) => at(dx, dy) === 'bridge';
      const cx = !bridge(-1, 0) ? 0 : !bridge(1, 0) ? 2 : 1;
      const cy = !bridge(0, -1) ? 0 : !bridge(0, 1) ? 2 : 1;
      drawTile(ctx, 'tiles/water', cx, 12 + cy, ox, oy);
      break;
    }
    case 'wall': {
      const open = (dx: number, dy: number) => !isWall(at(dx, dy));
      const [cx, cy] = cliffTile(open(0, -1), open(0, 1), open(-1, 0), open(1, 0));
      if (theme === 'cave') {
        ctx.fillStyle = CAVE_ROCK;
        ctx.fillRect(ox, oy, T, T);
        ctx.fillStyle = '#251e30';
        for (let i = 0; i < 3; i++) {
          ctx.fillRect(ox + Math.floor(hash2(tx, ty, 20 + i) * 14), oy + Math.floor(hash2(tx, ty, 30 + i) * 14), 2, 1);
        }
        drawTile(ctx, 'tiles/relief-cave', cx, cy, ox, oy);
      } else {
        drawPlain(ctx, theme, ox, oy, tx, ty);
        drawTile(ctx, 'tiles/relief', cx, cy, ox, oy);
      }
      break;
    }
  }
}

/** Twinkles on open water, drawn each frame over the static layer. */
export function drawWaterGlints(ctx: CanvasRenderingContext2D, ox: number, oy: number, tx: number, ty: number, time: number) {
  for (let i = 0; i < 2; i++) {
    const phase = hash2(tx, ty, 40 + i) * Math.PI * 2;
    const v = Math.sin(time * 2.2 + phase);
    if (v > 0.7) {
      const x = 4 + Math.floor(hash2(tx, ty, 50 + i) * 8);
      const y = 4 + Math.floor(hash2(tx, ty, 60 + i) * 8);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(ox + x, oy + y, v > 0.9 ? 3 : 2, 1);
    }
  }
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

const spriteCache = new Map<string, HTMLCanvasElement>();

/** Cut a piece of a sheet into its own canvas (cached), so it can be drawn and depth-sorted like any sprite. */
export function cutSprite(sheet: string, sx: number, sy: number, w = 1, h = 1): HTMLCanvasElement {
  const key = `${sheet}:${sx},${sy},${w},${h}`;
  let c = spriteCache.get(key);
  if (!c) {
    const [canvas, cctx] = makeCanvas(w * T, h * T);
    drawTile(cctx, sheet, sx, sy, 0, 0, w, h);
    spriteCache.set(key, canvas);
    c = canvas;
  }
  return c;
}

/** Round trees are 2x2 tiles; the forest leans on the darker greens. */
const OAKS: Record<MapTheme, [number, number][]> = {
  village: [
    [0, 0],
    [0, 0],
    [16, 0],
    [18, 0],
  ],
  forest: [
    [6, 0],
    [6, 0],
    [0, 0],
    [18, 0],
  ],
  cave: [[4, 0]],
};

export function getPropSprite(prop: Prop, tx: number, ty: number, tc: TileContext): HTMLCanvasElement | null {
  const pick = <V>(list: V[], salt: number) => list[Math.floor(hash2(tx, ty, salt) * list.length)];
  switch (prop) {
    case 'tree': {
      const [sx, sy] = pick(OAKS[tc.theme], 1);
      return cutSprite('tiles/nature', sx, sy, 2, 2);
    }
    case 'pine':
      return cutSprite('tiles/nature', 2, 0, 2, 2);
    case 'bush': {
      const [sx, sy] = pick<[number, number]>([[0, 10], [1, 10], [6, 10]], 2);
      return cutSprite('tiles/nature', sx, sy);
    }
    case 'rock':
      return cutSprite('tiles/nature', 7, 12);
    case 'well':
      return cutSprite('tiles/element', 6, 2);
    case 'puddle':
      return cutSprite('tiles/floor', 12, 18);
    case 'stalagmite':
      return cutSprite('tiles/nature', 18, 9);
    case 'crystal':
      return cutSprite('tiles/nature', 1, 14);
    case 'fence': {
      const f = (dx: number) => tc.charAt(tx + dx, ty) === 'f';
      return cutSprite('tiles/house', !f(-1) ? 10 : !f(1) ? 12 : 11, 5);
    }
    default:
      return null;
  }
}

/** Props that can overlap a character standing behind them get depth-sorted; the rest are baked into the ground. */
export const TALL_PROPS = new Set<Prop>(['tree', 'pine', 'well', 'crystal', 'stalagmite']);

export function signSprite() {
  return cutSprite('tiles/element', 0, 2);
}

export function chestSprite(open: boolean) {
  return cutSprite('tiles/chest', open ? 1 : 0, 0);
}

export function pedestalSprite(withCrystal: boolean) {
  return withCrystal ? cutSprite('tiles/dungeon', 4, 2) : cutSprite('tiles/dungeon', 2, 3);
}

/** Cave mouth set into the cliff, 3x3 tiles. */
export function caveMouthSprite() {
  return cutSprite('tiles/relief-detail', 0, 7, 3, 3);
}

/** Flickering wall torch: a bracket plus the pack's fire particle. */
export function torchFlame(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  ctx.fillStyle = '#2a1e1a';
  ctx.fillRect(x + 6, y + 9, 4, 2);
  ctx.fillRect(x + 7, y + 11, 2, 3);
  ctx.fillStyle = '#7a5030';
  ctx.fillRect(x + 6, y + 8, 4, 1);
  const frame = Math.floor(time * 12) % 8;
  ctx.drawImage(img('fx/torch'), frame * 12, 0, 12, 12, x + 2, y - 2, 12, 12);
}

// ---------------------------------------------------------------------------
// Buildings
// ---------------------------------------------------------------------------

/** Each house is a 4x3 block in TilesetHouse with its door in the second column. */
const HOUSES: Record<BuildingStyle, [number, number]> = {
  cottage: [0, 0],
  hall: [4, 0],
  lodge: [8, 0],
  shop: [12, 0],
};

export function drawBuilding(ctx: CanvasRenderingContext2D, b: BuildingDef) {
  const [sx, sy] = HOUSES[b.style];
  drawTile(ctx, 'tiles/house', sx, sy, b.x * T, b.y * T, 4, 3);
}
