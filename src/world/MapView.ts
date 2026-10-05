import { TILE } from '@/engine/constants';
import { makeCanvas } from '@/gfx/canvas';
import { drawBuilding, drawGround, getPropSprite, TALL_PROPS, tileInfo, type TileContext } from '@/gfx/tiles';
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
        const ch = this.charAt(x, y);
        const info = tileInfo(ch);
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
        if (TALL_PROPS.has(info.prop)) {
          // soft contact shadow baked into the ground
          if (info.prop === 'tree' || info.prop === 'pine') {
            ctx.fillStyle = 'rgba(16,24,16,0.3)';
            ctx.fillRect(x * TILE + 2, y * TILE + 13, 12, 3);
            ctx.fillRect(x * TILE + 4, y * TILE + 12, 8, 1);
          }
          this.tall.push({ sprite, x: sx, y: sy - (info.prop === 'tree' ? 1 : 0), baseY: y * TILE + TILE });
        } else {
          ctx.drawImage(sprite, sx, sy);
        }
      }
    }

    // Ritual circle painted across the rune tiles.
    const runes: [number, number][] = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (this.charAt(x, y) === '^') runes.push([x, y]);
    if (runes.length) {
      const xs = runes.map((r) => r[0]);
      const ys = runes.map((r) => r[1]);
      const cx = ((Math.min(...xs) + Math.max(...xs) + 1) / 2) * TILE;
      const cy = ((Math.min(...ys) + Math.max(...ys) + 1) / 2) * TILE;
      const rx = ((Math.max(...xs) - Math.min(...xs) + 1) / 2) * TILE;
      const ry = ((Math.max(...ys) - Math.min(...ys) + 1) / 2) * TILE;
      for (let a = 0; a < Math.PI * 2; a += 0.004) {
        ctx.fillStyle = '#9a48d8';
        ctx.fillRect(Math.round(cx + Math.cos(a) * (rx - 1)), Math.round(cy + Math.sin(a) * (ry - 1)), 1, 1);
        ctx.fillStyle = '#5a2088';
        ctx.fillRect(Math.round(cx + Math.cos(a) * (rx - 5)), Math.round(cy + Math.sin(a) * (ry - 4)), 1, 1);
      }
      for (let i = 0; i < 5; i++) {
        const a0 = (i / 5) * Math.PI * 2 - Math.PI / 2;
        const a1 = a0 + (Math.PI * 4) / 5;
        const x0 = cx + Math.cos(a0) * (rx - 5);
        const y0 = cy + Math.sin(a0) * (ry - 4);
        const x1 = cx + Math.cos(a1) * (rx - 5);
        const y1 = cy + Math.sin(a1) * (ry - 4);
        ctx.fillStyle = '#7a34b8';
        for (let t = 0; t <= 1; t += 0.01) ctx.fillRect(Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), 1, 1);
      }
    }

    for (const b of def.buildings) drawBuilding(ctx, b);
    this.ground = canvas;
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
