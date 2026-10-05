export type RGB = [number, number, number];

export function hexToRgb(hex: string): RGB {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]: RGB): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

export function mix(a: string, b: string, t: number): string {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return rgbToHex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
}

/**
 * Hue-shifted shading: shadows drift toward blue/purple, highlights toward warm yellow,
 * which is the classic trick that keeps pixel art from looking muddy.
 */
export function shadeColor(hex: string, amount: number): string {
  if (amount === 0) return hex;
  return amount > 0 ? mix(hex, '#fff6d8', amount) : mix(hex, '#1c1438', -amount);
}

/** Build a dark → light ramp of `steps` colours around a base colour. */
export function ramp(base: string, steps = 4, spread = 0.55): string[] {
  const out: string[] = [];
  for (let i = 0; i < steps; i++) {
    const t = steps === 1 ? 0 : i / (steps - 1);
    out.push(shadeColor(base, (t - 0.55) * spread * 2));
  }
  return out;
}

export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}
