export function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D context unavailable');
  ctx.imageSmoothingEnabled = false;
  return [canvas, ctx];
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

/** Paint a tiny sprite from text rows ('.' is transparent) and a palette. */
export function stampCanvas(rows: string[], palette: Record<string, string>): HTMLCanvasElement {
  const [canvas, ctx] = makeCanvas(rows[0].length, rows.length);
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const c = palette[row[x]];
      if (!c) continue;
      ctx.fillStyle = c;
      ctx.fillRect(x, y, 1, 1);
    }
  });
  return canvas;
}

/** Stable pseudo-random number in [0, 1) for a tile position, so maps look the same every visit. */
export function hash2(x: number, y: number, seed = 0): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
