import { img } from '@/engine/assets';
import type { SkillFx } from '@/types';
import { makeCanvas } from './canvas';
import { drawText, measureText } from './font';

function px(ctx: CanvasRenderingContext2D, x: number, y: number, c: string, w = 1, h = 1) {
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

// ---------------------------------------------------------------------------
// Particles
// ---------------------------------------------------------------------------

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  colors: string[];
  size: number;
  gravity: number;
  shape: 'square' | 'plus' | 'bubble' | 'z';
}

export class Particles {
  private list: Particle[] = [];

  spawn(p: Partial<Particle> & { x: number; y: number }) {
    this.list.push({
      vx: 0,
      vy: 0,
      life: 0,
      max: 0.6,
      colors: ['#ffffff'],
      size: 1,
      gravity: 0,
      shape: 'square',
      ...p,
    });
  }

  burst(x: number, y: number, n: number, colors: string[], speed = 50, opts: Partial<Particle> = {}) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.6);
      this.spawn({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, colors, max: 0.4 + Math.random() * 0.3, ...opts });
    }
  }

  get active() {
    return this.list.length > 0;
  }

  update(dt: number) {
    for (const p of this.list) {
      p.life += dt;
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.list = this.list.filter((p) => p.life < p.max);
  }

  render(ctx: CanvasRenderingContext2D) {
    for (const p of this.list) {
      const t = p.life / p.max;
      const c = p.colors[Math.min(p.colors.length - 1, Math.floor(t * p.colors.length))];
      switch (p.shape) {
        case 'plus':
          px(ctx, p.x, p.y - 1, c);
          px(ctx, p.x - 1, p.y, c, 3, 1);
          px(ctx, p.x, p.y + 1, c);
          break;
        case 'bubble':
          px(ctx, p.x - 1, p.y, c, 1, 2);
          px(ctx, p.x + 2, p.y, c, 1, 2);
          px(ctx, p.x, p.y - 1, c, 2, 1);
          px(ctx, p.x, p.y + 2, c, 2, 1);
          break;
        case 'z':
          drawText(ctx, 'z', p.x, p.y, c);
          break;
        default:
          px(ctx, p.x, p.y, c, p.size, p.size);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Skill effects (the pack's FX sprite sheets)
// ---------------------------------------------------------------------------

export interface BattleEffect {
  t: number;
  duration: number;
  update(dt: number): void;
  render(ctx: CanvasRenderingContext2D): void;
}

interface SheetFx {
  sheet: string;
  w: number;
  h: number;
  frames: number;
  fps: number;
  tint?: string;
  /** Extra scale on top of the target's (some sheets are drawn small). */
  scale?: number;
}

const FX: Record<SkillFx | 'explosion', SheetFx> = {
  slash: { sheet: 'fx/slash', w: 32, h: 32, frames: 4, fps: 16 },
  bash: { sheet: 'fx/impact', w: 32, h: 32, frames: 4, fps: 14 },
  claw: { sheet: 'fx/claw', w: 32, h: 32, frames: 4, fps: 14 },
  bite: { sheet: 'fx/claw2', w: 32, h: 32, frames: 4, fps: 14 },
  fire: { sheet: 'fx/flame', w: 25, h: 30, frames: 8, fps: 14 },
  ice: { sheet: 'fx/ice', w: 32, h: 32, frames: 9, fps: 15 },
  heal: { sheet: 'fx/spark', w: 27, h: 35, frames: 10, fps: 16 },
  poison: { sheet: 'fx/smoke', w: 32, h: 32, frames: 6, fps: 12, tint: '#58d848' },
  smoke: { sheet: 'fx/smoke', w: 32, h: 32, frames: 6, fps: 11 },
  shadow: { sheet: 'fx/dark', w: 66, h: 50, frames: 6, fps: 13, tint: '#9a50e8' },
  buff: { sheet: 'fx/shield', w: 24, h: 26, frames: 6, fps: 12 },
  steal: { sheet: 'fx/twinkle', w: 32, h: 32, frames: 6, fps: 14 },
  sonic: { sheet: 'fx/aura', w: 25, h: 24, frames: 5, fps: 11, scale: 1.5 },
  bone: { sheet: 'fx/rock', w: 60, h: 30, frames: 7, fps: 14, tint: '#f0e4c8' },
  slime: { sheet: 'fx/water', w: 44, h: 33, frames: 10, fps: 18 },
  explosion: { sheet: 'fx/explosion', w: 40, h: 40, frames: 9, fps: 16 },
};

const tinted = new Map<string, HTMLCanvasElement>();

/** Multiply a sheet by a colour while keeping its alpha (green poison smoke, purple shadow...). */
function tintedSheet(key: string, color: string): CanvasImageSource {
  const id = `${key}:${color}`;
  let c = tinted.get(id);
  if (!c) {
    const src = img(key);
    const [canvas, ctx] = makeCanvas(src.width, src.height);
    ctx.drawImage(src, 0, 0);
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, src.width, src.height);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(src, 0, 0);
    tinted.set(id, canvas);
    c = canvas;
  }
  return c;
}

/**
 * Build an effect centred on (x, y). `scale` matches the target: 2 for monsters,
 * 1 for the (already doubled) party sprites.
 */
export function createEffect(kind: SkillFx | 'explosion', x: number, y: number, particles: Particles, scale = 2): BattleEffect {
  const fx = FX[kind];
  const s = scale * (fx.scale ?? 1);
  if (kind === 'heal') particles.burst(x, y, 8, ['#f8fff0', '#a0f8a0', '#48c060'], 30, { shape: 'plus', vy: -25 });
  if (kind === 'poison') particles.burst(x, y, 6, ['#c0f080', '#60c040'], 24, { shape: 'bubble', vy: -20 });
  return {
    t: 0,
    duration: fx.frames / fx.fps,
    update(dt) {
      this.t += dt;
    },
    render(ctx) {
      const frame = Math.min(fx.frames - 1, Math.floor(this.t * fx.fps));
      const src = fx.tint ? tintedSheet(fx.sheet, fx.tint) : img(fx.sheet);
      const w = Math.round(fx.w * s);
      const h = Math.round(fx.h * s);
      ctx.drawImage(src, frame * fx.w, 0, fx.w, fx.h, Math.round(x - w / 2), Math.round(y - h / 2), w, h);
    },
  };
}

// ---------------------------------------------------------------------------
// Bouncing damage numbers
// ---------------------------------------------------------------------------

export class FloatingText {
  t = 0;
  constructor(
    public text: string,
    public x: number,
    public y: number,
    public color: string,
    public duration = 1.0,
  ) {}

  get done() {
    return this.t >= this.duration;
  }

  update(dt: number) {
    this.t += dt;
  }

  render(ctx: CanvasRenderingContext2D) {
    const bounceT = Math.min(this.t / 0.45, 1);
    const offset = -Math.abs(Math.sin(bounceT * Math.PI * 2)) * 10 * (1 - bounceT);
    if (this.t > this.duration - 0.2 && Math.floor(this.t * 20) % 2 === 0) return;
    const w = measureText(this.text);
    const x = Math.round(this.x - w / 2);
    const y = Math.round(this.y + offset);
    for (const [dx, dy] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
      [1, 1],
    ]) {
      drawText(ctx, this.text, x + dx, y + dy, '#100818', { shadow: null });
    }
    drawText(ctx, this.text, x, y, this.color, { shadow: null });
  }
}
