import { TILE } from '@/engine/constants';
import { makeCanvas } from '@/gfx/canvas';
import { caveMouthSprite, drawBuilding, drawGround, getPropSprite, TALL_PROPS, tileInfo, type TileContext } from '@/gfx/tiles';
import type { MapDef } from '@/types';

export interface TallProp {
  sprite: HTMLCanvasElement;
  x: number;
  y: number;
  baseY: number;
}

/** Pre-rendered map: a static ground layer plus the props that need depth sorting. */
export class MapView {
  readonly w: number;
  readonly h: number;
  readonly ground: HTMLCanvasElement;
  readonly tall: TallProp[] = [];
  readonly water: [number, number][] = [];
  readonly torches: [number, number][] = [];
  readonly crystals: [number, number][] = [];
  private solid: boolean[];
  readonly tc: TileContext;

  constructor(readonly def: MapDef) {
    this.h = def.layout.length;
    this.w = def.layout[0].length;
    this.tc = {
      theme: def.theme,
      charAt: (x, y) => this.charAt(x, y),
      groundAt: (x, y) => {
        const g = tileInfo(this.charAt(x, y)).ground;
        return def.theme === 'cave' && g === 'grass' ? 'floor' : g;
      },
    };

    this.solid = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) this.solid.push(tileInfo(def.layout[y][x]).solid);
    }
    for (const b of def.buildings) {
      for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) this.solid[y * this.w + x] = true;
    }

    const [canvas, ctx] = makeCanvas(this.w * TILE, this.h * TILE);
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        drawGround(ctx, x * TILE, y * TILE, x, y, this.tc);
        const info = tileInfo(this.charAt(x, y));
        if (info.ground === 'water') this.water.push([x, y]);
        if (!info.prop) continue;
        if (info.prop === 'torch') {
          this.torches.push([x, y]);
          continue;
        }
        if (info.prop === 'crystal') this.crystals.push([x, y]);
        const sprite = getPropSprite(info.prop, x, y, this.tc);
        if (!sprite) continue;
        const sx = x * TILE + Math.floor((TILE - sprite.width) / 2);
        const sy = y * TILE + TILE - sprite.height;
        if (TALL_PROPS.has(info.prop)) this.tall.push({ sprite, x: sx, y: sy, baseY: y * TILE + TILE });
        else ctx.drawImage(sprite, sx, sy);
      }
    }

    // Cave mouths: one 3x3 rock arch centred on each run of 'C' tiles.
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.charAt(x, y) !== 'C' || (x > 0 && this.charAt(x - 1, y) === 'C')) continue;
        let run = 1;
        while (this.charAt(x + run, y) === 'C' && x + run < this.w) run++;
        const mouth = caveMouthSprite();
        ctx.drawImage(mouth, Math.round(x * TILE + (run * TILE - mouth.width) / 2), (y + 1) * TILE - mouth.height);
      }
    }

    this.paintRunes(ctx);
    for (const b of def.buildings) drawBuilding(ctx, b);
    this.ground = canvas;
  }

  /** Ritual circle painted across the rune tiles. */
  private paintRunes(ctx: CanvasRenderingContext2D) {
    const runes: [number, number][] = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (this.charAt(x, y) === '^') runes.push([x, y]);
    if (!runes.length) return;
    const xs = runes.map((r) => r[0]);
    const ys = runes.map((r) => r[1]);
    const cx = ((Math.min(...xs) + Math.max(...xs) + 1) / 2) * TILE;
    const cy = ((Math.min(...ys) + Math.max(...ys) + 1) / 2) * TILE;
    const rx = ((Math.max(...xs) - Math.min(...xs) + 1) / 2) * TILE;
    const ry = ((Math.max(...ys) - Math.min(...ys) + 1) / 2) * TILE;
    const dot = (x: number, y: number) => ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
    for (let a = 0; a < Math.PI * 2; a += 0.004) {
      ctx.fillStyle = '#6a3c8c';
      dot(cx + Math.cos(a) * (rx - 2), cy + Math.sin(a) * (ry - 2));
      ctx.fillStyle = '#8a5aa8';
      dot(cx + Math.cos(a) * (rx - 6), cy + Math.sin(a) * (ry - 5));
    }
    ctx.fillStyle = '#7a4a9c';
    for (let i = 0; i < 5; i++) {
      const a0 = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const a1 = a0 + (Math.PI * 4) / 5;
      const x0 = cx + Math.cos(a0) * (rx - 6);
      const y0 = cy + Math.sin(a0) * (ry - 5);
      const x1 = cx + Math.cos(a1) * (rx - 6);
      const y1 = cy + Math.sin(a1) * (ry - 5);
      for (let t = 0; t <= 1; t += 0.01) dot(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t);
    }
  }

  charAt(x: number, y: number): string {
    const cx = Math.max(0, Math.min(this.w - 1, x));
    const cy = Math.max(0, Math.min(this.h - 1, y));
    return this.def.layout[cy][cx];
  }

  inBounds(x: number, y: number) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  isSolid(x: number, y: number) {
    if (!this.inBounds(x, y)) return true;
    return this.solid[y * this.w + x];
  }
}

const cache = new Map<string, MapView>();

export function getMapView(def: MapDef): MapView {
  let v = cache.get(def.id);
  if (!v) {
    v = new MapView(def);
    cache.set(def.id, v);
  }
  return v;
}
