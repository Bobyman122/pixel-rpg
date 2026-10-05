import { hexToRgb } from './color';

export function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D context unavailable');
  ctx.imageSmoothingEnabled = false;
  return [canvas, ctx];
}

export function flipCanvas(src: HTMLCanvasElement): HTMLCanvasElement {
  const [canvas, ctx] = makeCanvas(src.width, src.height);
  ctx.translate(src.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(src, 0, 0);
  return canvas;
}

/** Rotate 90° clockwise (used for knocked-out party members lying down). */
export function rotateCanvas(src: HTMLCanvasElement): HTMLCanvasElement {
  const [canvas, ctx] = makeCanvas(src.height, src.width);
  ctx.translate(src.height, 0);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(src, 0, 0);
  return canvas;
}

const tintCache = new WeakMap<HTMLCanvasElement, Map<string, HTMLCanvasElement>>();

/** Solid-colour silhouette of a sprite (hit flashes, glows). Cached per sprite and colour. */
export function tintCanvas(src: HTMLCanvasElement, color: string): HTMLCanvasElement {
  let byColor = tintCache.get(src);
  if (!byColor) {
    byColor = new Map();
    tintCache.set(src, byColor);
  }
  const hit = byColor.get(color);
  if (hit) return hit;
  const [canvas, ctx] = makeCanvas(src.width, src.height);
  byColor.set(color, canvas);
  ctx.drawImage(src, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, src.width, src.height);
  return canvas;
}

/** A boolean shape used to build up sprite parts before shading them. */
export class Mask {
  readonly bits: Uint8Array;
  constructor(readonly w: number, readonly h: number) {
    this.bits = new Uint8Array(w * h);
  }

  has(x: number, y: number) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h && this.bits[y * this.w + x] === 1;
  }

  set(x: number, y: number, v = true) {
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.bits[y * this.w + x] = v ? 1 : 0;
  }

  rect(x: number, y: number, w: number, h: number, v = true) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, v);
    return this;
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, v = true) {
    for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) {
      for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.set(x, y, v);
      }
    }
    return this;
  }

  poly(points: [number, number][], v = true) {
    let minY = Infinity;
    let maxY = -Infinity;
    for (const [, py] of points) {
      minY = Math.min(minY, py);
      maxY = Math.max(maxY, py);
    }
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const sy = y + 0.5;
      const xs: number[] = [];
      for (let i = 0; i < points.length; i++) {
        const [x1, y1] = points[i];
        const [x2, y2] = points[(i + 1) % points.length];
        if ((y1 <= sy && y2 > sy) || (y2 <= sy && y1 > sy)) {
          xs.push(x1 + ((sy - y1) / (y2 - y1)) * (x2 - x1));
        }
      }
      xs.sort((a, b) => a - b);
      for (let i = 0; i + 1 < xs.length; i += 2) {
        for (let x = Math.round(xs[i]); x < Math.round(xs[i + 1]); x++) this.set(x, y, v);
      }
    }
    return this;
  }

  line(x0: number, y0: number, x1: number, y1: number, thickness = 1, v = true) {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= steps; i++) {
      const x = Math.round(x0 + ((x1 - x0) * i) / steps);
      const y = Math.round(y0 + ((y1 - y0) * i) / steps);
      this.rect(x - Math.floor((thickness - 1) / 2), y - Math.floor((thickness - 1) / 2), thickness, thickness, v);
    }
    return this;
  }

  subtract(other: Mask) {
    for (let i = 0; i < this.bits.length; i++) if (other.bits[i]) this.bits[i] = 0;
    return this;
  }

  bounds() {
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.bits[y * this.w + x]) {
          x0 = Math.min(x0, x);
          y0 = Math.min(y0, y);
          x1 = Math.max(x1, x);
          y1 = Math.max(y1, y);
        }
      }
    }
    return { x0, y0, x1, y1 };
  }
}

export interface ShadeOpts {
  /** Direction toward the light; default is upper-left. */
  light?: [number, number];
  /** How many pixels in from the edge before a pixel counts as fully "inside". */
  depth?: number;
  /** Shift overall brightness (-1..1). */
  bias?: number;
  /** Weight of the directional term vs. the edge-distance term. */
  directional?: number;
  /** Draw a dark line where this part overlaps parts painted before it. */
  outline?: string;
}

/** A pixel buffer of hex colours. Everything is drawn here first, then baked to a canvas. */
export class Pixels {
  readonly data: (string | null)[];
  constructor(readonly w: number, readonly h: number) {
    this.data = new Array(w * h).fill(null);
  }

  mask() {
    return new Mask(this.w, this.h);
  }

  get(x: number, y: number) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null;
    return this.data[y * this.w + x];
  }

  set(x: number, y: number, c: string | null) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.data[y * this.w + x] = c;
  }

  rect(x: number, y: number, w: number, h: number, c: string) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, c);
  }

  fill(mask: Mask, c: string) {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (mask.has(x, y)) this.set(x, y, c);
  }

  /**
   * Paint a mask with a dark→light ramp. Brightness combines distance from the
   * edge (roundness) with position relative to the light (direction).
   */
  shade(mask: Mask, colors: string[], opts: ShadeOpts = {}) {
    const { w, h } = this;
    const depth = opts.depth ?? 4;
    const dist = new Int16Array(w * h).fill(-1);
    const queue: number[] = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!mask.has(x, y)) continue;
        if (!mask.has(x - 1, y) || !mask.has(x + 1, y) || !mask.has(x, y - 1) || !mask.has(x, y + 1)) {
          dist[y * w + x] = 0;
          queue.push(y * w + x);
        }
      }
    }
    for (let qi = 0; qi < queue.length; qi++) {
      const idx = queue[qi];
      const x = idx % w;
      const y = (idx - x) / w;
      const d = dist[idx];
      for (const [nx, ny] of [
        [x + 1, y],
        [x - 1, y],
        [x, y + 1],
        [x, y - 1],
      ]) {
        if (mask.has(nx, ny) && dist[ny * w + nx] === -1) {
          dist[ny * w + nx] = d + 1;
          queue.push(ny * w + nx);
        }
      }
    }

    const b = mask.bounds();
    const cx = (b.x0 + b.x1 + 1) / 2;
    const cy = (b.y0 + b.y1 + 1) / 2;
    const rx = Math.max(1, (b.x1 - b.x0 + 1) / 2);
    const ry = Math.max(1, (b.y1 - b.y0 + 1) / 2);
    const [lx, ly] = opts.light ?? [-0.6, -0.8];
    const dirW = opts.directional ?? 0.55;
    const bias = opts.bias ?? 0;
    const n = colors.length;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!mask.has(x, y)) continue;
        const e = Math.min(dist[y * w + x], depth) / depth;
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        const dir = Math.max(-1, Math.min(1, dx * lx + dy * ly));
        let i = (1 - dirW) * e + dirW * (0.5 + 0.5 * dir) + bias;
        i = Math.max(0, Math.min(0.999, i));
        this.set(x, y, colors[Math.floor(i * n)]);
      }
    }

    if (opts.outline) {
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (mask.has(x, y) || !this.get(x, y)) continue;
          if (mask.has(x - 1, y) || mask.has(x + 1, y) || mask.has(x, y - 1) || mask.has(x, y + 1)) {
            this.set(x, y, opts.outline);
          }
        }
      }
    }
  }

  /** Dark border around every opaque region (4-neighbour, so diagonals stay clean). */
  outline(color: string) {
    const add: number[] = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.get(x, y)) continue;
        if (this.get(x - 1, y) || this.get(x + 1, y) || this.get(x, y - 1) || this.get(x, y + 1)) {
          add.push(y * this.w + x);
        }
      }
    }
    for (const idx of add) this.data[idx] = color;
  }

  /** Stamp an ASCII template; each character maps to a colour (or '.' for empty). */
  stamp(rows: string[], palette: Record<string, string>, ox = 0, oy = 0) {
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch === '.' || ch === ' ') continue;
        const c = palette[ch];
        if (c) this.set(ox + x, oy + y, c);
      }
    });
  }

  flipX(): Pixels {
    const out = new Pixels(this.w, this.h);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) out.set(this.w - 1 - x, y, this.get(x, y));
    return out;
  }

  toCanvas(): HTMLCanvasElement {
    const [canvas, ctx] = makeCanvas(this.w, this.h);
    const img = ctx.createImageData(this.w, this.h);
    const cache = new Map<string, [number, number, number]>();
    for (let i = 0; i < this.data.length; i++) {
      const c = this.data[i];
      if (!c) continue;
      let rgb = cache.get(c);
      if (!rgb) {
        rgb = hexToRgb(c);
        cache.set(c, rgb);
      }
      img.data[i * 4] = rgb[0];
      img.data[i * 4 + 1] = rgb[1];
      img.data[i * 4 + 2] = rgb[2];
      img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return canvas;
  }
}

/** Small deterministic hash so tile variations stay stable between frames. */
export function hash2(x: number, y: number, seed = 0): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Seeded PRNG for procedural art. */
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}
